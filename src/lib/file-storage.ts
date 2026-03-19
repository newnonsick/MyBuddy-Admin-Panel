import { readFile, writeFile, rename, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

const DATA_DIR = path.join(process.cwd(), 'data');
const REDIS_KEY_PREFIX = 'mybuddy-admin-panel';
const REDIS_CACHE_TTL_MS = 60 * 60 * 1000;

const ALLOWED_FILES = new Set(['llm_models.json', 'stt_models.json']);

let redisReadClient: Redis | null = null;
let redisWriteClient: Redis | null = null;

type RedisCacheEntry = {
  value: unknown;
  expiresAt: number;
};

const redisReadCache = new Map<string, RedisCacheEntry>();

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

function getRedisCacheKey(fileName: string): string {
  return getRedisKey(fileName);
}

function getCachedRedisValue(fileName: string): unknown | null {
  const cacheKey = getRedisCacheKey(fileName);
  const entry = redisReadCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    redisReadCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function setCachedRedisValue(fileName: string, value: unknown): void {
  redisReadCache.set(getRedisCacheKey(fileName), {
    value,
    expiresAt: Date.now() + REDIS_CACHE_TTL_MS,
  });
}

function clearCachedRedisValue(fileName: string): void {
  redisReadCache.delete(getRedisCacheKey(fileName));
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
  } catch (error: unknown) {
    if (
      error instanceof Error
      && 'code' in error
      && error.code === 'ENOENT'
      && defaultValue !== undefined
    ) {
      return defaultValue;
    }
    throw error;
  }
}

async function readRedis<T>(fileName: string, defaultValue?: T): Promise<T> {
  validateFileName(fileName);

  const cachedValue = getCachedRedisValue(fileName);
  if (cachedValue !== null) {
    return cachedValue as T;
  }

  const redis = getRedisReadClient();

  if (!redis) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error('Redis read credentials are missing');
  }

  try {
    const content = await redis.get<string | Record<string, unknown> | unknown[]>(getRedisKey(fileName));

    if (content === null) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }

      throw new Error(`Key not found in Redis: ${fileName}`);
    }

    const normalized = normalizeRedisValue<T>(content);
    setCachedRedisValue(fileName, normalized);
    return normalized;
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
  setCachedRedisValue(fileName, data);
}

export async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  if (getRedisUrl()) {
    if (!getRedisWriteClient()) {
      throw new Error('Redis write credentials are missing');
    }

    return writeRedis(fileName, data);
  }

  clearCachedRedisValue(fileName);
  return writeFs(fileName, data);
}
