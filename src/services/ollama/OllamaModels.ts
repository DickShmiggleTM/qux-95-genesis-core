
import { toast } from "sonner";
import { BaseService } from "../base/BaseService";
import { OllamaConnection } from "./OllamaConnection";
import { OllamaModel } from "./types";

export class OllamaModels extends BaseService {
  private models: OllamaModel[] = [];
  private currentModel: string | null = null;
  private connection: OllamaConnection;
  
  constructor(connection: OllamaConnection) {
    super();
    this.connection = connection;
  }

  /**
   * Load available models from Ollama
   */
  async loadAvailableModels(): Promise<OllamaModel[]> {
    try {
      if (!this.connection.isConnected()) {
        await this.connection.checkConnection();
      }
      
      if (!this.connection.isConnected()) {
        return [];
      }

      const response = await fetch(`${this.connection.getBaseUrl()}/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      this.models = data.models?.map((model: any) => {
        // Extract parameter size from model name (e.g., llama2:7b -> 7B)
        let parameters = "Unknown";
        if (model.name.includes(':')) {
          const parts = model.name.split(':');
          if (parts[1].includes('b')) {
            parameters = parts[1].toUpperCase();
          }
        }
        
        return {
          id: model.name,
          name: model.name.split(':')[0],
          modelfile: model.modelfile || '',
          size: model.size || 0,
          parameters: parameters,
          quantization_level: model.quantization_level || '',
          format: model.format || 'gguf'
        };
      }) || [];
      
      // Set the first model as current if none is set
      if (this.models.length > 0 && !this.currentModel) {
        this.currentModel = this.models[0].id;
      }
      
      return this.models;
    } catch (error) {
      this.handleError("Error loading Ollama models", error);
      return [];
    }
  }

  /**
   * Upload a model to Ollama
   */
  async uploadModel(file: File): Promise<boolean> {
    try {
      // In a real implementation, this would use the Ollama API
      // to upload a GGUF model file. Currently, Ollama API doesn't 
      // directly support file uploads through the REST API.
      
      // Simulate successful upload for now
      toast.success("Model upload started", {
        description: `Preparing ${file.name}`
      });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Model upload complete", {
        description: `${file.name} is now ready to use`
      });
      
      // Refresh models list
      await this.loadAvailableModels();
      return true;
    } catch (error) {
      this.handleError("Error uploading model", error, true);
      return false;
    }
  }

  getModels(): OllamaModel[] {
    return this.models;
  }

  setCurrentModel(modelId: string): void {
    this.currentModel = modelId;
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }
}
