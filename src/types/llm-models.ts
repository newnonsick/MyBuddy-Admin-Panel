export const LLM_MODEL_TYPES = [
  'qwen',
  'deepseek',
  'gemmait',
  'llama',
  'hammer',
  'functiongemma',
  'general',
] as const;

export type LlmModelType = (typeof LLM_MODEL_TYPES)[number];

export const FILE_TYPES = ['task', 'binary'] as const;
export type FileType = (typeof FILE_TYPES)[number];

export interface LlmModelConfig {
  type: LlmModelType;
  maxTokens: number;
  tokenBuffer: number;
  randomSeed: number;
  temperature: number;
  topK: number;
  topP: number | null;
  isThinking: boolean;
  supportsFunctionCalls: boolean;
  fileType: FileType;
}

export interface LlmModel {
  id: string;
  fileName: string;
  downloadUrl: string;
  approximateSize: string;
  expectedMinBytes: number;
  config: LlmModelConfig;
}
