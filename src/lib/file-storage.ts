import { readFile, writeFile, rename, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

const DATA_DIR = path.join(process.cwd(), 'data');

const ALLOWED_FILES = new Set(['llm_models.json', 'stt_models.json']);

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

async function readBlob<T>(fileName: string, defaultValue?: T): Promise<T> {
  validateFileName(fileName);
  try {
    const { blobs } = await list({ prefix: `data/${fileName}` });
    const blob = blobs.find(b => b.pathname === `data/${fileName}`);
    if (blob) {
      const response = await fetch(blob.url);
      if (response.ok) {
        const content = await response.text();
        return JSON.parse(content) as T;
      }
    }
  } catch (error) {
    console.error(`Error reading blob data/${fileName}:`, error);
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  throw new Error(`File not found in blob storage: ${fileName}`);
}

export async function readJsonFile<T>(fileName: string, defaultValue?: T): Promise<T> {
  if (process.env.VERCEL) {
    return readBlob(fileName, defaultValue);
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

async function writeBlob<T>(fileName: string, data: T): Promise<void> {
  validateFileName(fileName);
  const content = JSON.stringify(data, null, 2);
  JSON.parse(content);
  
  await put(`data/${fileName}`, content, {
    access: 'public',
    addRandomSuffix: false,
  });
}

export async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  if (process.env.VERCEL) {
    return writeBlob(fileName, data);
  }
  return writeFs(fileName, data);
}
