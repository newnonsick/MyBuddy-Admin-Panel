import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/file-storage';
import type { SttModel } from '@/types/stt-models';

export async function GET() {
  try {
    const models = await readJsonFile<SttModel[]>('stt_models.json', []);
    return NextResponse.json(models, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read STT models' },
      { status: 500 }
    );
  }
}
