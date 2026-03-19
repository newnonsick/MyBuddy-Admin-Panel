import { NextRequest, NextResponse } from 'next/server';
import { writeJsonFile } from '@/lib/file-storage';
import { sttModelsSchema, formatZodError } from '@/lib/validation';
import { isPayloadTooLarge } from '@/lib/security';
import { revalidatePath } from 'next/cache';
import {
  RequestValidationError,
  normalizeSavePayload,
  type SaveOptions,
  validateUrlsWithContext,
} from '@/lib/admin-save';

export async function POST(request: NextRequest) {
  try {
    if (isPayloadTooLarge(request.headers.get('content-length'))) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body: unknown = await request.json();
    const payload = normalizeSavePayload(body);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid payload', details: 'Expected an array of models or { models, options }' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const models = await applyDownloadChecks(payload.models, payload.options);
    const result = sttModelsSchema.safeParse(models);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    await writeJsonFile('stt_models.json', result.data);
    revalidatePath('/api/stt_models');

    return NextResponse.json(
      { success: true, count: result.data.length, options: payload.options },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const status = error instanceof RequestValidationError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update STT models' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

async function applyDownloadChecks(models: unknown, options: SaveOptions): Promise<unknown> {
  if (!Array.isArray(models)) {
    throw new RequestValidationError('models must be an array');
  }

  const nextModels = structuredClone(models) as Array<Record<string, unknown>>;
  const urlChecks: Array<{ url: string; context: string }> = [];

  for (let index = 0; index < nextModels.length; index += 1) {
    const model = nextModels[index];
    const downloadUrl = model.downloadUrl;
    if (typeof downloadUrl === 'string' && options.validateDownloadUrls) {
      urlChecks.push({
        url: downloadUrl,
        context: `Invalid downloadUrl for model #${index + 1}`,
      });
    }

    const config = model.config;
    if (!config || typeof config !== 'object') {
      continue;
    }

    const coreML = (config as Record<string, unknown>).coreML;
    if (!coreML || typeof coreML !== 'object') {
      continue;
    }

    const coreMlUrl = (coreML as Record<string, unknown>).downloadUrl;
    if (typeof coreMlUrl !== 'string') {
      continue;
    }

    if (options.validateDownloadUrls) {
      urlChecks.push({
        url: coreMlUrl,
        context: `Invalid CoreML downloadUrl for model #${index + 1}`,
      });
    }
  }

  await validateUrlsWithContext(urlChecks);

  return nextModels;
}
