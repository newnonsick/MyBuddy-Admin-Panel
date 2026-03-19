export interface DownloadMetadataClientResult {
    approximateSize: string;
    expectedMinBytes: number;
}

export async function fetchDownloadMetadataForClient(
    url: string,
    adminKey: string
): Promise<DownloadMetadataClientResult> {
    const response = await fetch('/api/admin/download-metadata', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
        },
        body: JSON.stringify({ url }),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to fetch metadata');
    }

    return result.metadata as DownloadMetadataClientResult;
}
