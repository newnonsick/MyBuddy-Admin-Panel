export interface CoreMLConfig {
  downloadUrl: string;
  archiveFileName: string;
  extractedFolderName: string;
  approximateSize: string;
  expectedMinBytes: number;
}

export interface SttModelConfig {
  variant: string;
  quantization: string | null;
  coreML: CoreMLConfig;
}

export interface SttModelDisplay {
  name: string;
  description: string;
}

export interface SttModel {
  id: string;
  fileName: string;
  downloadUrl: string;
  approximateSize: string;
  expectedMinBytes: number;
  modelType: string;
  config: SttModelConfig;
  display: SttModelDisplay;
}
