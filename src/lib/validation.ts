import { z } from 'zod';

const llmModelConfigSchema = z.object({
  type: z.enum(['qwen', 'deepseek', 'gemmait', 'llama', 'hammer', 'functiongemma', 'general']),
  maxTokens: z.number().int().positive(),
  tokenBuffer: z.number().int().positive(),
  randomSeed: z.number().int(),
  temperature: z.number().min(0).max(2),
  topK: z.number().int().min(0),
  topP: z.number().min(0).max(1).nullable(),
  isThinking: z.boolean(),
  supportsFunctionCalls: z.boolean(),
  fileType: z.enum(['task', 'binary']),
});

const llmModelSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  downloadUrl: z.string().url(),
  approximateSize: z.string().min(1),
  expectedMinBytes: z.number().int().positive(),
  config: llmModelConfigSchema,
});

export const llmModelsSchema = z.array(llmModelSchema);

const coreMLConfigSchema = z.object({
  downloadUrl: z.string().url(),
  archiveFileName: z.string().min(1),
  extractedFolderName: z.string().min(1),
  approximateSize: z.string().min(1),
  expectedMinBytes: z.number().int().positive(),
});

const sttModelConfigSchema = z.object({
  variant: z.string().min(1),
  quantization: z.string().nullable(),
  coreML: coreMLConfigSchema,
});

const sttModelDisplaySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

const sttModelSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  downloadUrl: z.string().url(),
  approximateSize: z.string().min(1),
  expectedMinBytes: z.number().int().positive(),
  modelType: z.string().min(1),
  config: sttModelConfigSchema,
  display: sttModelDisplaySchema,
});

export const sttModelsSchema = z.array(sttModelSchema);

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}
