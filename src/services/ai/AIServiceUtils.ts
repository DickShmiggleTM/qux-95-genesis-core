import { ollamaService } from '@/services/ollama';

// Define a more flexible interface to handle potentially missing methods
interface OllamaServiceExtended {
  generate?: (prompt: string, model: string, options?: any) => Promise<string>;
  chat?: (messages: Array<{ role: string; content: string }>, model: string, options?: any) => Promise<string>;
  embeddings?: (text: string, model: string) => Promise<number[]>;
  executeCommand?: (command: string) => Promise<string>;
}

/**
 * Helper functions to interact with AI services
 */
export const aiServiceUtils = {
  /**
   * Generate a text completion using the model
   */
  generateCompletion: async (
    model: string, 
    prompt: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> => {
    try {
      // Cast to our extended interface
      const service = ollamaService as OllamaServiceExtended;
      
      // Try to use native method if available
      if (service.generate) {
        return await service.generate(prompt, model, options);
      }
      
      // Fallback implementation
      console.log(`Generating completion with ${model}: ${prompt.substring(0, 50)}...`);
      
      // Simulate a response for demonstration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return `Simulated response from ${model} for prompt: ${prompt.substring(0, 30)}...`;
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  },

  /**
   * Generate a chat response using the model
   */
  generateChat: async (
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> => {
    try {
      // Cast to our extended interface
      const service = ollamaService as OllamaServiceExtended;
      
      // Try to use native method if available
      if (service.chat) {
        return await service.chat(messages, model, options);
      }
      
      // Try to use generate method with formatted prompt as fallback
      const formattedPrompt = messages
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');
      
      if (service.generate) {
        return await service.generate(formattedPrompt, model, options);
      }
      
      // Fallback implementation
      console.log(`Generating chat with ${model}: ${formattedPrompt.substring(0, 50)}...`);
      
      // Simulate a response for demonstration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return `Simulated response from ${model} for chat.`;
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw error;
    }
  },

  /**
   * Generate embeddings for a text using the model
   */
  generateEmbeddings: async (
    text: string,
    model: string = 'llama2'
  ): Promise<number[]> => {
    try {
      // Cast to our extended interface
      const service = ollamaService as OllamaServiceExtended;
      
      // Try to use native method if available
      if (service.embeddings) {
        return await service.embeddings(text, model);
      }
      
      // Fallback implementation
      console.log(`Generating embeddings with ${model}: ${text.substring(0, 50)}...`);
      
      // Return simulated embeddings (128-dimensional vector of random values)
      return Array.from({ length: 128 }, () => Math.random() - 0.5);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }
};

export default aiServiceUtils;
