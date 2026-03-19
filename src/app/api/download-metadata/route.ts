import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchDownloadMetadata } from '@/lib/download-metadata';
import { validateAdminRequest } from '@/lib/security';

const payloadSchema = z.object({
    url: z.string().url(),
});

export async function POST(request: NextRequest) {
    const unauthorized = validateAdminRequest(request);
    if (unauthorized) {
        return unauthorized;
    }

    try {
        const body: unknown = await request.json();
        const parsed = payloadSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid payload', details: parsed.error.issues.map((issue) => issue.message).join('; ') },
                { status: 400, headers: { 'Cache-Control': 'no-store' } }
            );
        }

        const metadata = await fetchDownloadMetadata(parsed.data.url);
        return NextResponse.json(
            { success: true, metadata },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch download metadata' },
            { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}
