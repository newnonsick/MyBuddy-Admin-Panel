export interface DownloadMetadata {
    bytes: number;
    approximateSize: string;
    expectedMinBytes: number;
}

const HEAD_TIMEOUT_MS = 12000;
const GET_TIMEOUT_MS = 15000;
const MAX_HTML_SIZE = 512000;

interface ProbeResult {
    response: Response;
    bytes: number | null;
    body: string | null;
}

export async function fetchDownloadMetadata(url: string): Promise<DownloadMetadata> {
    if (isGoogleDriveUrl(url)) {
        const resolvedUrl = await resolveGoogleDriveUrl(url);
        const bytes = await probeBytes(resolvedUrl);
        if (bytes === null) {
            throw new Error('Could not resolve Google Drive file bytes');
        }

        return {
            bytes,
            approximateSize: formatBytes(bytes),
            expectedMinBytes: Math.floor(bytes * 0.8),
        };
    }

    const bytes = await probeBytes(url);
    if (bytes !== null) {
        return {
            bytes,
            approximateSize: formatBytes(bytes),
            expectedMinBytes: Math.floor(bytes * 0.8),
        };
    }

    throw new Error('Missing Content-Length header');
}

export async function validateDownloadUrl(url: string): Promise<void> {
    await fetchHead(url);
}

async function fetchHead(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`HEAD returned ${response.status}`);
        }

        return response;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('HEAD request timed out');
        }

        if (error instanceof Error) {
            throw new Error(error.message);
        }

        throw new Error('HEAD request failed');
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchGetProbe(url: string): Promise<ProbeResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GET_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                Range: 'bytes=0-0',
            },
        });

        if (!response.ok) {
            throw new Error(`GET returned ${response.status}`);
        }

        const bytes = getBytesFromHeaders(response.headers);
        const contentType = response.headers.get('content-type') ?? '';
        const shouldReadBody = bytes === null && contentType.includes('text/html');

        if (!shouldReadBody) {
            return { response, bytes, body: null };
        }

        const bodyText = await response.text();
        return {
            response,
            bytes,
            body: bodyText.slice(0, MAX_HTML_SIZE),
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('GET request timed out');
        }

        if (error instanceof Error) {
            throw new Error(error.message);
        }

        throw new Error('GET request failed');
    } finally {
        clearTimeout(timeout);
    }
}

async function probeBytes(url: string): Promise<number | null> {
    const headResponse = await fetchHead(url);
    const headBytes = getBytesFromHeaders(headResponse.headers);
    if (headBytes !== null && !isHtmlResponse(headResponse.headers)) {
        return headBytes;
    }

    const getProbe = await fetchGetProbe(url);
    if (getProbe.bytes !== null && !isHtmlResponse(getProbe.response.headers)) {
        return getProbe.bytes;
    }

    return null;
}

function getBytesFromHeaders(headers: Headers): number | null {
    const contentLength = headers.get('content-length');
    if (contentLength) {
        const parsed = Number.parseInt(contentLength, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }

    const contentRange = headers.get('content-range');
    if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) {
            const parsed = Number.parseInt(match[1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }

    return null;
}

function extractGoogleDriveConfirmUrl(body: string | null, currentUrl: string): string | null {
    if (!body) {
        return null;
    }

    const current = safeUrl(currentUrl);
    if (!current) {
        return null;
    }

    if (!isGoogleDriveHost(current.hostname)) {
        return null;
    }

    const normalized = body.replace(/&amp;/g, '&');
    const hrefMatch = normalized.match(/href="([^"]*confirm=[^"]*)"/i);
    const actionMatch = normalized.match(/action="([^"]*confirm=[^"]*)"/i);
    const rawCandidate = hrefMatch?.[1] ?? actionMatch?.[1] ?? null;

    if (!rawCandidate) {
        const fileId = current.searchParams.get('id');
        if (!fileId) {
            return null;
        }
        const fallback = new URL('https://drive.usercontent.google.com/download');
        fallback.searchParams.set('id', fileId);
        fallback.searchParams.set('export', 'download');
        fallback.searchParams.set('confirm', 't');
        return fallback.toString();
    }

    try {
        const candidate = new URL(rawCandidate, current.origin);
        return candidate.toString();
    } catch {
        return null;
    }
}

async function resolveGoogleDriveUrl(originalUrl: string): Promise<string> {
    const fileId = extractGoogleDriveFileId(originalUrl);
    if (!fileId) {
        return originalUrl;
    }

    const baseUrl = `https://drive.usercontent.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

    const response = await fetchGetProbe(baseUrl);
    if (response.body) {
        const formParams = parseGoogleDriveForm(response.body);
        if (formParams) {
            formParams.id ||= fileId;
            const downloadUrl = buildGoogleDriveDownloadUrl(formParams, response.response.url);
            if (downloadUrl) {
                return downloadUrl;
            }
        }

        const confirmFromHtml = extractGoogleDriveConfirmUrl(response.body, response.response.url);
        if (confirmFromHtml) {
            return confirmFromHtml;
        }
    }

    const setCookieHeader = getSetCookieHeader(response.response.headers);
    const confirmToken = extractDownloadWarningToken(setCookieHeader);
    if (confirmToken) {
        return `${baseUrl}&confirm=${encodeURIComponent(confirmToken)}`;
    }

    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
}

function isGoogleDriveUrl(url: string): boolean {
    return url.includes('drive.google.com')
        || url.includes('docs.google.com')
        || url.includes('drive.usercontent.google.com');
}

function extractGoogleDriveFileId(url: string): string | null {
    const parsed = safeUrl(url);
    if (parsed) {
        const id = parsed.searchParams.get('id');
        if (id) {
            return id;
        }
    }

    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] ?? null;
}

function parseGoogleDriveForm(htmlContent: string): Record<string, string> | null {
    const normalized = htmlContent.replace(/&amp;/g, '&');
    const actionMatch = normalized.match(/<form[^>]*action="([^"]+)"/i);
    if (!actionMatch) {
        return null;
    }

    const result: Record<string, string> = { action: actionMatch[1] };

    const hiddenInputRegex = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi;
    for (const match of normalized.matchAll(hiddenInputRegex)) {
        const [, name, value] = match;
        if (name !== undefined && value !== undefined) {
            result[name] = value;
        }
    }

    const altInputRegex = /<input[^>]*value="([^"]*)"[^>]*name="([^"]+)"/gi;
    for (const match of normalized.matchAll(altInputRegex)) {
        const [, value, name] = match;
        if (name !== undefined && value !== undefined && !(name in result)) {
            result[name] = value;
        }
    }

    return result;
}

function buildGoogleDriveDownloadUrl(formParams: Record<string, string>, baseUrl: string): string | null {
    const action = formParams.action;
    if (!action) {
        return null;
    }

    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(formParams)) {
        if (key !== 'action' && value.length > 0) {
            queryParams.set(key, value);
        }
    }

    if (queryParams.size === 0) {
        return null;
    }

    try {
        const resolved = new URL(action, baseUrl);
        resolved.search = queryParams.toString();
        return resolved.toString();
    } catch {
        return null;
    }
}

function getSetCookieHeader(headers: Headers): string {
    const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
    if (typeof anyHeaders.getSetCookie === 'function') {
        return anyHeaders.getSetCookie().join('; ');
    }

    return headers.get('set-cookie') ?? '';
}

function extractDownloadWarningToken(cookieHeader: string): string | null {
    if (!cookieHeader) {
        return null;
    }

    const match = cookieHeader.match(/download_warning[^=]*=([^;,\s]+)/i);
    return match?.[1] ?? null;
}

function isHtmlResponse(headers: Headers): boolean {
    const contentType = (headers.get('content-type') ?? '').toLowerCase();
    return contentType.includes('text/html');
}

function safeUrl(value: string): URL | null {
    try {
        return new URL(value);
    } catch {
        return null;
    }
}

function isGoogleDriveHost(hostname: string): boolean {
    return hostname === 'drive.google.com'
        || hostname === 'drive.usercontent.google.com'
        || hostname === 'docs.google.com';
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    if (unitIndex === 0) {
        return `${bytes} B`;
    }

    return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}
