import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/file-storage';
import type { SttModel } from '@/types/stt-models';

export const revalidate = 3600;

export async function GET() {
  try {
    const models = await readJsonFile<SttModel[]>('stt_models.json', []);
    return NextResponse.json(models, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=59',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read STT models' },
      { status: 500 }
    );
  }
}
