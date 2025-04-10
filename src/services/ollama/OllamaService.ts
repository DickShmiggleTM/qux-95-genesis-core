
import { BaseService } from "../base/BaseService";
import { OllamaConnection } from "./OllamaConnection";
import { OllamaModels } from "./OllamaModels";
import { OllamaCompletion } from "./OllamaCompletion";
import { OllamaMemory } from "./OllamaMemory";
import { HardwareInfo, OllamaCompletion as OllamaCompletionType, OllamaModel } from "./types";
import { toast } from "sonner";

class OllamaService extends BaseService {
  private connection: OllamaConnection;
  private models: OllamaModels;
  private completion: OllamaCompletion;
  private memory: OllamaMemory;
  
  constructor() {
    super();
    this.connection = new OllamaConnection();
    this.memory = new OllamaMemory();
    this.models = new OllamaModels(this.connection);
    this.completion = new OllamaCompletion(this.connection, this.memory);
  }
  
  async init(): Promise<boolean> {
    try {
      const result = await this.connection.checkConnection();
      if (result) {
        await this.connection.detectHardware();
        await this.models.loadAvailableModels();
      }
      return result;
    } catch (error) {
      this.handleError("Failed to initialize Ollama service", error);
      return false;
    }
  }
  
  // Connection and hardware methods
  async checkConnection(): Promise<boolean> {
    return this.connection.checkConnection();
  }
  
  isConnected(): boolean {
    return this.connection.isConnected();
  }
  
  getHardwareInfo(): HardwareInfo {
    return this.connection.getHardwareInfo();
  }
  
  // Model management methods
  async loadAvailableModels(): Promise<OllamaModel[]> {
    return this.models.loadAvailableModels();
  }
  
  getModels(): OllamaModel[] {
    return this.models.getModels();
  }
  
  setCurrentModel(modelId: string): void {
    this.models.setCurrentModel(modelId);
  }
  
  getCurrentModel(): string | null {
    return this.models.getCurrentModel();
  }
  
  async uploadModel(file: File): Promise<boolean> {
    return this.models.uploadModel(file);
  }
  
  // Completion methods
  async generateCompletion(request: OllamaCompletionType): Promise<string> {
    return this.completion.generateCompletion(request);
  }
  
  async generateChatCompletion(
    messages: Array<{role: string, content: string}>,
    model: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<string> {
    return this.completion.generateChatCompletion(messages, model, options);
  }
  
  async generateChatCompletionWithReasoning(
    messages: Array<{role: string, content: string}>,
    model: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<{response: string, reasoning?: string}> {
    return this.completion.generateChatCompletionWithReasoning(messages, model, options);
  }
  
  async executeCommand(command: string): Promise<string> {
    return this.completion.executeCommand(command);
  }
  
  async generateImage(prompt: string, options: any = {}): Promise<string> {
    return this.completion.generateImage(prompt, options);
  }
  
  // Memory methods
  storeInMemory(category: string, key: string, data: any): void {
    this.memory.storeInMemory(category, key, data);
  }
  
  retrieveFromMemory(category: string, key?: string): any {
    return this.memory.retrieveFromMemory(category, key);
  }
  
  getContext(limit: number = 10): any[] {
    return this.memory.getContext(limit);
  }
  
  getSessionId(): string {
    return this.memory.getSessionId();
  }
  
  // Document processing
  async processDocument(file: File, extractionOptions: any = {}): Promise<any> {
    return this.memory.processDocument(file, extractionOptions);
  }
  
  // Reasoning
  enableReasoning(enabled: boolean): void {
    this.completion.enableReasoning(enabled);
  }
  
  isReasoningEnabled(): boolean {
    return this.completion.isReasoningEnabled();
  }
  
  // Save state - renamed to avoid conflict with BaseService's saveState method
  async saveSystemState(): Promise<boolean> {
    return this.memory.saveMemoryState();
  }
  
  // Self-modification capabilities
  async selfModify(code: string, description: string): Promise<boolean> {
    // In a real implementation, this would apply code modifications
    // For simulation purposes, we'll just log it
    console.log(`Self-modification attempted: ${description}`);
    console.log(`Code: ${code}`);
    
    // Add to context
    this.memory.addToContext('self-modify', {
      code,
      description,
      timestamp: new Date().toISOString()
    });
    
    toast.success("System self-modified", {
      description: description
    });
    
    return true;
  }
}

// Create and export the singleton instance
export const ollamaService = new OllamaService();

// Re-export needed types
export type { OllamaModel, OllamaCompletion, OllamaResponse, HardwareInfo } from './types';
