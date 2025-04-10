
export interface OllamaModel {
  id: string;
  name: string;
  modelfile: string;
  size: number;
  parameters: string;
  quantization_level?: string;
  format: string;
}

export interface OllamaCompletion {
  model: string;
  prompt: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stream?: boolean;
    max_tokens?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface OllamaExecRequest {
  command: string;
  model: string;
}

export interface HardwareInfo {
  gpu: {
    available: boolean;
    name: string | null;
    vramTotal: number | null; // in MB
    vramFree: number | null; // in MB
  };
  cpu: {
    cores: number;
    model: string | null;
  };
  ram: {
    total: number; // in MB
    free: number; // in MB
  };
}

// Memory and context related types
export interface OllamaMemoryItem {
  type: string;
  data: any;
  timestamp: string;
}

export interface OllamaState {
  connected: boolean;
  models: OllamaModel[];
  currentModel: string | null;
  memory: Record<string, any>;
  contextWindow: OllamaMemoryItem[];
  sessionId: string;
  hardwareInfo: HardwareInfo;
  reasoningEnabled: boolean;
}
