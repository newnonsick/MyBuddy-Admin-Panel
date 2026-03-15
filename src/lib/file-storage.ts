import { readFile, writeFile, rename, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

const ALLOWED_FILES = new Set(['llm_models.json', 'stt_models.json']);

function validateFileName(fileName: string): void {
  const normalized = path.basename(fileName);
  if (normalized !== fileName || !ALLOWED_FILES.has(normalized)) {
    throw new Error(`Invalid file name: ${fileName}`);
  }
}

export async function readJsonFile<T>(fileName: string): Promise<T> {
  validateFileName(fileName);
  const filePath = path.join(DATA_DIR, fileName);
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
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
