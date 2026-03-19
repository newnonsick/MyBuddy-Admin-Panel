import { NextRequest } from 'next/server';
import { handleDownloadMetadataRequest } from '@/lib/download-metadata-handler';

export async function POST(request: NextRequest) {
    return handleDownloadMetadataRequest(request, { requireAdminAuth: true });
}
