
import { toast } from "sonner";
import { BaseService } from "../base/BaseService";
import { OllamaConnection } from "./OllamaConnection";
import { OllamaMemory } from "./OllamaMemory";
import { OllamaCompletion as OllamaCompletionType } from "./types";

export class OllamaCompletion extends BaseService {
  private connection: OllamaConnection;
  private memory: OllamaMemory;
  private reasoningEnabled: boolean = false;
  
  constructor(connection: OllamaConnection, memory: OllamaMemory) {
    super();
    this.connection = connection;
    this.memory = memory;
  }

  /**
   * Generate text completion
   */
  async generateCompletion(request: OllamaCompletionType): Promise<string> {
    try {
      if (!this.connection.isConnected()) {
        const isConnected = await this.connection.checkConnection();
        if (!isConnected) {
          throw new Error('Not connected to Ollama');
        }
      }

      const response = await fetch(`${this.connection.getBaseUrl()}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate completion');
      }
      
      const data = await response.json();
      // Add to context window for memory
      this.memory.addToContext('completion', {
        prompt: request.prompt,
        response: data.response,
        timestamp: new Date().toISOString()
      });
      
      return data.response;
    } catch (error) {
      this.handleError("Error generating completion", error, true);
      return "Error: Could not generate response";
    }
  }

  /**
   * Generate chat completion
   */
  async generateChatCompletion(
    messages: Array<{role: string, content: string}>,
    model: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<string> {
    try {
      if (!this.connection.isConnected()) {
        const isConnected = await this.connection.checkConnection();
        if (!isConnected) {
          throw new Error('Not connected to Ollama');
        }
      }

      const requestBody = {
        model,
        messages,
        options
      };

      const response = await fetch(`${this.connection.getBaseUrl()}/chat`, {
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
      this.memory.addToContext('chat', {
        messages,
        response: responseContent,
        timestamp: new Date().toISOString()
      });
      
      return responseContent;
    } catch (error) {
      this.handleError("Error generating chat completion", error, true);
      return "Error: Could not generate chat response";
    }
  }
  
  /**
   * Generate image from text
   */
  async generateImage(prompt: string, options: any = {}): Promise<string> {
    try {
      if (!this.connection.isConnected()) {
        const isConnected = await this.connection.checkConnection();
        if (!isConnected) {
          throw new Error('Not connected to Ollama');
        }
      }
      
      toast.success("Generating image", {
        description: "Processing your prompt..."
      });
      
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For now return a placeholder image
      const imageUrl = 'https://source.unsplash.com/random/512x512/?cyberpunk';
      
      // Add to context window for memory
      this.memory.addToContext('image', {
        prompt,
        imageUrl,
        options,
        timestamp: new Date().toISOString()
      });
      
      return imageUrl;
    } catch (error) {
      this.handleError("Error generating image", error, true);
      throw error;
    }
  }
  
  /**
   * Generate chat completion with reasoning steps
   */
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
      this.handleError("Error generating chat completion with reasoning", error);
      return {
        response: "Error: Could not generate response with reasoning",
        reasoning: "Reasoning process failed due to an error."
      };
    }
  }
  
  /**
   * Execute command through Ollama
   */
  async executeCommand(command: string): Promise<string> {
    try {
      if (!this.connection.isConnected()) {
        const isConnected = await this.connection.checkConnection();
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
      this.memory.addToContext('terminal', {
        command,
        result,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      this.handleError("Error executing command", error, true);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  enableReasoning(enabled: boolean): void {
    this.reasoningEnabled = enabled;
  }
  
  isReasoningEnabled(): boolean {
    return this.reasoningEnabled;
  }
}
