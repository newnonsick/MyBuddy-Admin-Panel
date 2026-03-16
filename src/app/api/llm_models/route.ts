import { NextResponse } from 'next/server';
import { readJsonFile } from '@/lib/file-storage';
import type { LlmModel } from '@/types/llm-models';

export async function GET() {
  try {
    const models = await readJsonFile<LlmModel[]>('llm_models.json', []);
    return NextResponse.json(models, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read LLM models' },
      { status: 500 }
    );
  }
}
