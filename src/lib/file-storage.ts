import { readFile, writeFile, rename, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { revalidateTag, unstable_cache } from 'next/cache';
import { Redis } from '@upstash/redis';

const DATA_DIR = path.join(process.cwd(), 'data');
const REDIS_KEY_PREFIX = 'mybuddy-admin-panel';
const REDIS_CACHE_REVALIDATE_SECONDS = 60 * 60;

const ALLOWED_FILES = new Set(['llm_models.json', 'stt_models.json']);

let redisReadClient: Redis | null = null;
let redisWriteClient: Redis | null = null;
const redisReaderCache = new Map<string, () => Promise<string | null>>();

function parseRedisConnectionString(connectionString?: string | null): { url: string; token: string } | null {
  if (!connectionString) {
    return null;
  }

  try {
    const parsed = new URL(connectionString);
    const token = decodeURIComponent(parsed.password || '');

    if (!parsed.hostname || !token) {
      return null;
    }

    return {
      url: `https://${parsed.hostname}`,
      token,
    };
  } catch {
    return null;
  }
}

function getRedisUrl(): string | null {
  const explicitUrl = process.env.KV_REST_API_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  return parseRedisConnectionString(process.env.KV_URL)?.url ?? null;
}

function getRedisReadToken(): string | null {
  return (
    process.env.KV_REST_API_READ_ONLY_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    parseRedisConnectionString(process.env.KV_URL)?.token ??
    null
  );
}

function getRedisWriteToken(): string | null {
  return (
    process.env.KV_REST_API_TOKEN ??
    parseRedisConnectionString(process.env.KV_URL)?.token ??
    null
  );
}

function getRedisKey(fileName: string): string {
  return `${REDIS_KEY_PREFIX}:${fileName}`;
}

function getRedisCacheTag(fileName: string): string {
  return `${REDIS_KEY_PREFIX}:cache:${fileName}`;
}

function getRedisReader(fileName: string): () => Promise<string | null> {
  const cachedReader = redisReaderCache.get(fileName);
  if (cachedReader) {
    return cachedReader;
  }

  const reader = unstable_cache(
    async () => {
      const redis = getRedisReadClient();

      if (!redis) {
        throw new Error('Redis read credentials are missing');
      }

      return redis.get<string>(getRedisKey(fileName));
    },
    [REDIS_KEY_PREFIX, fileName],
    {
      revalidate: REDIS_CACHE_REVALIDATE_SECONDS,
      tags: [getRedisCacheTag(fileName)],
    }
  );

  redisReaderCache.set(fileName, reader);
  return reader;
}

function getRedisReadClient(): Redis | null {
  if (redisReadClient) {
    return redisReadClient;
  }

  const url = getRedisUrl();
  const token = getRedisReadToken();

  if (!url || !token) {
    return null;
  }

  redisReadClient = new Redis({ url, token });
  return redisReadClient;
}

function getRedisWriteClient(): Redis | null {
  if (redisWriteClient) {
    return redisWriteClient;
  }

  const url = getRedisUrl();
  const token = getRedisWriteToken();

  if (!url || !token) {
    return null;
  }

  redisWriteClient = new Redis({ url, token });
  return redisWriteClient;
}

function normalizeRedisValue<T>(value: unknown): T {
  if (value === null || value === undefined) {
    throw new Error('Redis value is empty');
  }

  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }

  if (typeof value === 'object') {
    return value as T;
  }

  return JSON.parse(String(value)) as T;
}

function validateFileName(fileName: string): void {
  const normalized = path.basename(fileName);
  if (normalized !== fileName || !ALLOWED_FILES.has(normalized)) {
    throw new Error(`Invalid file name: ${fileName}`);
  }
}

async function readFs<T>(fileName: string, defaultValue?: T): Promise<T> {
  validateFileName(fileName);
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error: any) {
    if (error.code === 'ENOENT' && defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
}

async function readRedis<T>(fileName: string, defaultValue?: T): Promise<T> {
  validateFileName(fileName);

  try {
    const content = await getRedisReader(fileName)();

    if (content === null) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }

      throw new Error(`Key not found in Redis: ${fileName}`);
    }

    return normalizeRedisValue<T>(content);
  } catch (error) {
    console.error(`Error reading Redis key ${getRedisKey(fileName)}:`, error);
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`Failed to read Redis key: ${fileName}`);
}

export async function readJsonFile<T>(fileName: string, defaultValue?: T): Promise<T> {
  if (getRedisUrl()) {
    if (!getRedisReadClient()) {
      throw new Error('Redis read credentials are missing');
    }

    return readRedis(fileName, defaultValue);
  }
  return readFs(fileName, defaultValue);
}

async function writeFs<T>(fileName: string, data: T): Promise<void> {
  validateFileName(fileName);

  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }

  const filePath = path.join(DATA_DIR, fileName);
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  const content = JSON.stringify(data, null, 2);

  JSON.parse(content);

  try {
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, filePath);
  } catch (error) {
    try { await unlink(tempPath); } catch { /* ignore */ }
    throw error;
  }
}

async function writeRedis<T>(fileName: string, data: T): Promise<void> {
  validateFileName(fileName);

  const redis = getRedisWriteClient();

  if (!redis) {
    throw new Error('Redis write credentials are missing');
  }

  const content = JSON.stringify(data, null, 2);
  JSON.parse(content);

  await redis.set(getRedisKey(fileName), content);
  revalidateTag(getRedisCacheTag(fileName), 'max');
}

export async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  if (getRedisUrl()) {
    if (!getRedisWriteClient()) {
      throw new Error('Redis write credentials are missing');
    }

    return writeRedis(fileName, data);
  }
  return writeFs(fileName, data);
}
