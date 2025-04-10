
/**
 * Ollama Service - Primary module for Ollama language model interactions
 * 
 * Exports the main service instance and all required types
 */

export { ollamaService } from './OllamaService';
export type { 
  OllamaModel, 
  OllamaCompletion, 
  OllamaResponse, 
  HardwareInfo,
  OllamaMemoryItem
} from './types';
