
import { toast } from "sonner";

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

const OLLAMA_BASE_URL = 'http://localhost:11434/api';

class OllamaService {
  private connected: boolean = false;
  private models: OllamaModel[] = [];
  private currentModel: string | null = null;

  async init(): Promise<boolean> {
    try {
      const result = await this.checkConnection();
      if (result) {
        await this.loadAvailableModels();
      }
      return result;
    } catch (error) {
      console.error("Failed to initialize Ollama service:", error);
      return false;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/tags`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        this.connected = false;
        return false;
      }
      
      this.connected = true;
      return true;
    } catch (error) {
      console.error("Error checking Ollama connection:", error);
      this.connected = false;
      return false;
    }
  }

  async loadAvailableModels(): Promise<OllamaModel[]> {
    try {
      if (!this.connected) {
        await this.checkConnection();
      }
      
      if (!this.connected) {
        return [];
      }

      const response = await fetch(`${OLLAMA_BASE_URL}/tags`, {
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
      
      return this.models;
    } catch (error) {
      console.error("Error loading Ollama models:", error);
      return [];
    }
  }

  async generateCompletion(request: OllamaCompletion): Promise<string> {
    try {
      if (!this.connected) {
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          throw new Error('Not connected to Ollama');
        }
      }

      const response = await fetch(`${OLLAMA_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate completion');
      }
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("Error generating completion:", error);
      toast.error("Failed to generate response", {
        description: "Could not get a response from Ollama"
      });
      return "Error: Could not generate response";
    }
  }

  async generateChatCompletion(
    messages: Array<{role: string, content: string}>,
    model: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<string> {
    try {
      if (!this.connected) {
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          throw new Error('Not connected to Ollama');
        }
      }

      const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          options
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate chat completion');
      }
      
      const data = await response.json();
      return data.message?.content || "No response received";
    } catch (error) {
      console.error("Error generating chat completion:", error);
      toast.error("Failed to generate chat response", {
        description: "Could not get a response from Ollama"
      });
      return "Error: Could not generate chat response";
    }
  }

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
      console.error("Error uploading model:", error);
      toast.error("Failed to upload model", {
        description: "There was an error processing the model file"
      });
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
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

export const ollamaService = new OllamaService();
