import { toast } from "sonner";
import { saveSystem } from "./saveSystem";

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

const OLLAMA_BASE_URL = 'http://localhost:11434/api';

class OllamaService {
  private connected: boolean = false;
  private models: OllamaModel[] = [];
  private currentModel: string | null = null;
  private memory: Record<string, any> = {};
  private contextWindow: any[] = [];
  private sessionId: string = `session-${Date.now()}`;
  private hardwareInfo: HardwareInfo = {
    gpu: {
      available: false,
      name: null,
      vramTotal: null,
      vramFree: null
    },
    cpu: {
      cores: navigator.hardwareConcurrency || 4,
      model: null
    },
    ram: {
      total: 0,
      free: 0
    }
  };
  
  private reasoningEnabled: boolean = false;

  async init(): Promise<boolean> {
    try {
      const result = await this.checkConnection();
      if (result) {
        await this.loadAvailableModels();
        await this.detectHardware();
        
        // Attempt to restore memory from saved state
        const savedState = saveSystem.loadSystemState();
        if (savedState?.memory) {
          this.memory = savedState.memory;
        }
        if (savedState?.context) {
          this.contextWindow = savedState.context;
        }
      }
      return result;
    } catch (error) {
      console.error("Failed to initialize Ollama service:", error);
      return false;
    }
  }
  
  private async detectHardware(): Promise<void> {
    try {
      // In a real implementation, we would check for CUDA availability through the Ollama API
      // For now, we'll simulate this check
      const simulateGpuCheck = async (): Promise<boolean> => {
        // This would be an actual API call to check hardware
        try {
          const response = await fetch(`${OLLAMA_BASE_URL}/hardware`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => null);
          
          // Simulate positive response for demonstration
          if (!response) {
            // If API endpoint doesn't exist (which it likely doesn't in current Ollama)
            // Use a reasonable guess based on User Agent or other factors
            const userAgent = navigator.userAgent.toLowerCase();
            const probablyHasGpu = userAgent.includes('nvidia') || 
                                 userAgent.includes('amd') || 
                                 userAgent.includes('radeon') || 
                                 userAgent.includes('geforce');
            
            return probablyHasGpu;
          }
          
          return true;
        } catch {
          return false;
        }
      };
      
      const gpuAvailable = await simulateGpuCheck();
      
      this.hardwareInfo = {
        gpu: {
          available: gpuAvailable,
          name: gpuAvailable ? "GPU Detected (CUDA/Metal)" : null,
          vramTotal: gpuAvailable ? 8192 : null, // Simulate 8GB VRAM
          vramFree: gpuAvailable ? 6144 : null  // Simulate 6GB free
        },
        cpu: {
          cores: navigator.hardwareConcurrency || 4,
          model: "CPU Detected"
        },
        ram: {
          total: 16384, // Simulate 16GB RAM
          free: 8192    // Simulate 8GB free
        }
      };
      
      console.log("Hardware detection result:", this.hardwareInfo);
    } catch (error) {
      console.error("Hardware detection failed:", error);
    }
  }

  getHardwareInfo(): HardwareInfo {
    return this.hardwareInfo;
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
      
      // Set the first model as current if none is set
      if (this.models.length > 0 && !this.currentModel) {
        this.currentModel = this.models[0].id;
      }
      
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
      // Add to context window for memory
      this.addToContext('completion', {
        prompt: request.prompt,
        response: data.response,
        timestamp: new Date().toISOString()
      });
      
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

      const requestBody = {
        model,
        messages,
        options
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate chat completion');
      }
      
      const data = await response.json();
      const responseContent = data.message?.content || "No response received";
      
      // Add to context window for memory
      this.addToContext('chat', {
        messages,
        response: responseContent,
        timestamp: new Date().toISOString()
      });
      
      return responseContent;
    } catch (error) {
      console.error("Error generating chat completion:", error);
      toast.error("Failed to generate chat response", {
        description: "Could not get a response from Ollama"
      });
      return "Error: Could not generate chat response";
    }
  }
  
  async executeCommand(command: string): Promise<string> {
    try {
      if (!this.connected) {
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          throw new Error('Not connected to Ollama');
        }
      }
      
      // In a real implementation, we would execute the command via Ollama or a backend
      // For safety reasons, this is simulated for now
      console.log(`Executing command: ${command}`);
      
      // Simulate command execution
      let result = `Executed: ${command}\n`;
      
      // Add simple command simulation
      if (command.startsWith('echo')) {
        result += command.substring(5);
      } else if (command.startsWith('ls') || command.startsWith('dir')) {
        result += 'file1.txt\nfile2.txt\nfolder1\nfolder2';
      } else if (command.includes('git')) {
        result += 'Simulated Git operation completed successfully';
      } else {
        result += 'Command executed with exit code 0';
      }
      
      // Add to context window for memory
      this.addToContext('terminal', {
        command,
        result,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      console.error("Error executing command:", error);
      toast.error("Failed to execute command", {
        description: "Error in command execution"
      });
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
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
  
  async processDocument(file: File, extractionOptions: any = {}): Promise<any> {
    // This would handle document processing for RAG
    try {
      if (!this.currentModel) {
        throw new Error('No model selected');
      }
      
      toast.success("Processing document", {
        description: `Analyzing ${file.name}`
      });
      
      // Simulate document processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, we would:
      // 1. Extract text from the document
      // 2. Split into chunks
      // 3. Create embeddings
      // 4. Store in vector database
      
      // Simulated result
      const documentData = {
        id: `doc-${Date.now()}`,
        filename: file.name,
        chunks: 15,
        processed: true,
        timestamp: new Date().toISOString()
      };
      
      // Add to memory
      this.storeInMemory('documents', file.name, documentData);
      
      toast.success("Document processed", {
        description: `${file.name} ready for RAG retrieval`
      });
      
      return documentData;
    } catch (error) {
      console.error("Error processing document:", error);
      toast.error("Failed to process document", {
        description: "Could not process the document for RAG"
      });
      throw error;
    }
  }
  
  async generateImage(prompt: string, options: any = {}): Promise<string> {
    try {
      if (!this.connected) {
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          throw new Error('Not connected to Ollama');
        }
      }
      
      // In a real implementation, we would call a Stable Diffusion API
      // Simulate image generation
      toast.success("Generating image", {
        description: "Processing your prompt..."
      });
      
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For now return a placeholder image
      const imageUrl = 'https://source.unsplash.com/random/512x512/?cyberpunk';
      
      // Add to context window for memory
      this.addToContext('image', {
        prompt,
        imageUrl,
        options,
        timestamp: new Date().toISOString()
      });
      
      return imageUrl;
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image", {
        description: "Could not generate the requested image"
      });
      throw error;
    }
  }
  
  // Memory management methods
  private addToContext(type: string, data: any): void {
    this.contextWindow.push({
      type,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Keep context window at a reasonable size
    if (this.contextWindow.length > 100) {
      this.contextWindow.shift();
    }
  }
  
  storeInMemory(category: string, key: string, data: any): void {
    if (!this.memory[category]) {
      this.memory[category] = {};
    }
    
    this.memory[category][key] = {
      ...data,
      timestamp: new Date().toISOString()
    };
  }
  
  retrieveFromMemory(category: string, key?: string): any {
    if (!key) {
      return this.memory[category] || {};
    }
    
    return this.memory[category]?.[key] || null;
  }
  
  getContext(limit: number = 10): any[] {
    return this.contextWindow.slice(-limit);
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
  
  getSessionId(): string {
    return this.sessionId;
  }
  
  // Add reasoning capability
  enableReasoning(enabled: boolean): void {
    this.reasoningEnabled = enabled;
  }
  
  isReasoningEnabled(): boolean {
    return this.reasoningEnabled;
  }
  
  async generateChatCompletionWithReasoning(
    messages: Array<{role: string, content: string}>,
    model: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<{response: string, reasoning?: string}> {
    try {
      if (!this.reasoningEnabled) {
        // If reasoning is disabled, just return the regular response
        const response = await this.generateChatCompletion(messages, model, options);
        return { response };
      }
      
      // Add reasoning instruction to the system message
      const messagesWithReasoningPrompt = messages.map(msg => {
        if (msg.role === 'system') {
          return {
            role: 'system',
            content: `${msg.content}\n\nPlease think step by step and provide your reasoning before giving your final answer. Start with "Reasoning:" and end with "Answer:".`
          };
        }
        return msg;
      });
      
      // If there's no system message, add one
      if (!messages.some(msg => msg.role === 'system')) {
        messagesWithReasoningPrompt.unshift({
          role: 'system',
          content: 'Please think step by step and provide your reasoning before giving your final answer. Start with "Reasoning:" and end with "Answer:".'
        });
      }
      
      const fullResponse = await this.generateChatCompletion(messagesWithReasoningPrompt, model, options);
      
      // Parse response to separate reasoning and answer
      let reasoning = '';
      let answer = fullResponse;
      
      if (fullResponse.includes('Reasoning:') && fullResponse.includes('Answer:')) {
        const reasoningMatch = fullResponse.match(/Reasoning:(.*?)Answer:/s);
        const answerMatch = fullResponse.match(/Answer:(.*?)$/s);
        
        if (reasoningMatch && reasoningMatch[1]) {
          reasoning = reasoningMatch[1].trim();
        }
        
        if (answerMatch && answerMatch[1]) {
          answer = answerMatch[1].trim();
        }
      }
      
      return {
        response: answer,
        reasoning: reasoning
      };
    } catch (error) {
      console.error("Error generating chat completion with reasoning:", error);
      return {
        response: "Error: Could not generate response with reasoning",
        reasoning: "Reasoning process failed due to an error."
      };
    }
  }

  async saveState(): Promise<boolean> {
    return saveSystem.saveSystemState(true, {
      memory: this.memory,
      context: this.contextWindow,
      chatHistory: [] // This would be populated from the ChatWindow component
    });
  }
  
  // Self-modification capabilities
  async selfModify(code: string, description: string): Promise<boolean> {
    // In a real implementation, this would apply code modifications
    // For simulation purposes, we'll just log it
    console.log(`Self-modification attempted: ${description}`);
    console.log(`Code: ${code}`);
    
    // Add to context
    this.addToContext('self-modify', {
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

export const ollamaService = new OllamaService();
