import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/file-storage';
import type { LlmModel } from '@/types/llm-models';

export const revalidate = 3600;

export async function GET() {
  try {
    const models = await readJsonFile<LlmModel[]>('llm_models.json', []);
    return NextResponse.json(models, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=59',
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
