import { NextRequest, NextResponse } from 'next/server';
import { writeJsonFile } from '@/lib/file-storage';
import { llmModelsSchema, formatZodError } from '@/lib/validation';
import { isPayloadTooLarge } from '@/lib/security';
import { revalidatePath } from 'next/cache';
import { validateDownloadUrl } from '@/lib/download-metadata';

interface SaveOptions {
  validateDownloadUrls: boolean;
}

interface RequestPayload {
  models: unknown;
  options: SaveOptions;
}

class RequestValidationError extends Error { }

export async function POST(request: NextRequest) {
  try {
    if (isPayloadTooLarge(request.headers.get('content-length'))) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body: unknown = await request.json();
    const payload = normalizePayload(body);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid payload', details: 'Expected an array of models or { models, options }' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const models = await applyDownloadChecks(payload.models, payload.options);
    const result = llmModelsSchema.safeParse(models);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    await writeJsonFile('llm_models.json', result.data);
    revalidatePath('/api/llm_models');

    return NextResponse.json(
      { success: true, count: result.data.length, options: payload.options },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const status = error instanceof RequestValidationError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update LLM models' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

function normalizePayload(body: unknown): RequestPayload | null {
  if (Array.isArray(body)) {
    return {
      models: body,
      options: {
        validateDownloadUrls: false,
      },
    };
  }

  if (!body || typeof body !== 'object') {
    return null;
  }

  const maybeModels = (body as Record<string, unknown>).models;
  if (!Array.isArray(maybeModels)) {
    return null;
  }

  const rawOptions = (body as Record<string, unknown>).options;
  const options = {
    validateDownloadUrls: true,
  };

  if (rawOptions && typeof rawOptions === 'object') {
    const parsedOptions = rawOptions as Record<string, unknown>;
    if (typeof parsedOptions.validateDownloadUrls === 'boolean') {
      options.validateDownloadUrls = parsedOptions.validateDownloadUrls;
    }
  }

  return { models: maybeModels, options };
}

async function applyDownloadChecks(models: unknown, options: SaveOptions): Promise<unknown> {
  if (!Array.isArray(models)) {
    throw new RequestValidationError('models must be an array');
  }

  const nextModels = structuredClone(models) as Array<Record<string, unknown>>;

  for (let index = 0; index < nextModels.length; index += 1) {
    const model = nextModels[index];
    const downloadUrl = model.downloadUrl;

    if (typeof downloadUrl !== 'string') {
      continue;
    }

    if (options.validateDownloadUrls) {
      await validateDownloadUrl(downloadUrl).catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new RequestValidationError(`Invalid downloadUrl for model #${index + 1}: ${message}`);
      });
    }
  }

  return nextModels;
}
