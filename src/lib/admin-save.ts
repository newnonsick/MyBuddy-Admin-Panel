import { validateDownloadUrl } from '@/lib/download-metadata';

export interface SaveOptions {
    validateDownloadUrls: boolean;
}

export interface SavePayload {
    models: unknown;
    options: SaveOptions;
}

export class RequestValidationError extends Error { }

export function normalizeSavePayload(body: unknown): SavePayload | null {
    if (Array.isArray(body)) {
        return {
            models: body,
            options: {
                validateDownloadUrls: false,
            },
        };
    }

    if (!body || typeof body !== 'object') {
        return null;
    }

    const maybeModels = (body as Record<string, unknown>).models;
    if (!Array.isArray(maybeModels)) {
        return null;
    }

    const rawOptions = (body as Record<string, unknown>).options;
    const options: SaveOptions = {
        validateDownloadUrls: true,
    };

    if (rawOptions && typeof rawOptions === 'object') {
        const parsedOptions = rawOptions as Record<string, unknown>;
        if (typeof parsedOptions.validateDownloadUrls === 'boolean') {
            options.validateDownloadUrls = parsedOptions.validateDownloadUrls;
        }
    }

    return { models: maybeModels, options };
}

export async function validateUrlsWithContext(urlChecks: Array<{ url: string; context: string }>): Promise<void> {
    for (const check of urlChecks) {
        await validateDownloadUrl(check.url).catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new RequestValidationError(`${check.context}: ${message}`);
        });
    }
}
