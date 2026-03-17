import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/file-storage';
import type { LlmModel } from '@/types/llm-models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const models = await readJsonFile<LlmModel[]>('llm_models.json', []);
    return NextResponse.json(models, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read LLM models' },
      { status: 500 }
    );
  }
}
