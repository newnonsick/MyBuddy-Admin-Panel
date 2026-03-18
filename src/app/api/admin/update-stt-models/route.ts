import { NextRequest, NextResponse } from 'next/server';
import { writeJsonFile } from '@/lib/file-storage';
import { sttModelsSchema, formatZodError } from '@/lib/validation';
import { isPayloadTooLarge } from '@/lib/security';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    if (isPayloadTooLarge(request.headers.get('content-length'))) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json();
    const result = sttModelsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    await writeJsonFile('stt_models.json', result.data);
    revalidatePath('/api/stt_models');

    return NextResponse.json(
      { success: true, count: result.data.length },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to update STT models' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
