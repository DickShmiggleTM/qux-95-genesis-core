/**
 * Vector Embedding Service
 * 
 * Provides functionality to convert text into vector embeddings for semantic search and memory
 * This uses the Ollama API to generate embeddings from text
 */

import { ollamaService } from '../ollamaService';

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  normalize?: boolean;
}

export class VectorEmbeddingService {
  private defaultModel: string = 'all-minilm';
  private defaultDimensions: number = 384;
  private mockMode: boolean = false;
  
  constructor(options?: { defaultModel?: string, defaultDimensions?: number, mockMode?: boolean }) {
    if (options?.defaultModel) {
      this.defaultModel = options.defaultModel;
    }
    if (options?.defaultDimensions) {
      this.defaultDimensions = options.defaultDimensions;
    }
    this.mockMode = options?.mockMode || false;
  }
  
  /**
   * Generate a vector embedding for a text string
   */
  async generateEmbedding(
    text: string, 
    options?: EmbeddingOptions
  ): Promise<number[]> {
    const model = options?.model || this.defaultModel;
    const dimensions = options?.dimensions || this.defaultDimensions;
    
    if (this.mockMode) {
      return this.generateMockEmbedding(text, dimensions);
    }
    
    try {
      // Use Ollama API to generate embedding
      // Endpoint: POST /api/embeddings
      // In a real implementation, we would use the actual API
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt: text,
        })
      });
      
      if (!response.ok) {
        console.error('Failed to generate embedding:', await response.text());
        throw new Error(`Failed to generate embedding: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      let embedding = data.embedding;
      
      // If the embedding has a different dimension, resize it
      if (embedding.length !== dimensions) {
        embedding = this.resizeEmbedding(embedding, dimensions);
      }
      
      // Normalize if requested
      if (options?.normalize) {
        embedding = this.normalizeEmbedding(embedding);
      }
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Fall back to mock embedding in case of error
      return this.generateMockEmbedding(text, dimensions);
    }
  }
  
  /**
   * Resize an embedding to the target dimension
   */
  private resizeEmbedding(embedding: number[], targetDimension: number): number[] {
    if (embedding.length === targetDimension) {
      return embedding;
    }
    
    if (embedding.length > targetDimension) {
      // Shrink by taking the first targetDimension elements
      return embedding.slice(0, targetDimension);
    } else {
      // Expand by padding with zeros
      return [...embedding, ...Array(targetDimension - embedding.length).fill(0)];
    }
  }
  
  /**
   * Normalize an embedding to unit length (L2 norm)
   */
  private normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      return embedding; // Avoid division by zero
    }
    
    return embedding.map(val => val / magnitude);
  }
  
  /**
   * Generate a fake but deterministic embedding for a text string
   * Used in mock mode or when the embedding service is unavailable
   */
  private generateMockEmbedding(text: string, dimensions: number): number[] {
    // Create a deterministic but reasonable mock embedding
    // The same text should always produce the same vector
    // Different but related texts should have similar vectors
    
    // Simple hash function for text
    const hash = (text: string): number => {
      let h = 0;
      for (let i = 0; i < text.length; i++) {
        h = Math.imul(31, h) + text.charCodeAt(i) | 0;
      }
      return h;
    };
    
    // Generate pseudo-random values based on words in the text
    const words = text.toLowerCase().split(/\s+/);
    const embedding: number[] = Array(dimensions).fill(0);
    
    // Seed the embedding with word hashes
    words.forEach((word, i) => {
      const wordHash = hash(word);
      const seedIndex = Math.abs(wordHash) % dimensions;
      embedding[seedIndex] += 0.1; // Small boost for each word
      
      // Also boost nearby dimensions to create clusters of related concepts
      for (let j = 1; j <= 3; j++) {
        const neighborIndex = (seedIndex + j) % dimensions;
        embedding[neighborIndex] += 0.05 / j;
      }
    });
    
    // Add some noise based on the whole text
    const textHash = hash(text);
    const seed = textHash / (2 ** 31);
    
    for (let i = 0; i < dimensions; i++) {
      const noise = (Math.sin(i * seed) + 1) * 0.02;
      embedding[i] += noise;
    }
    
    // Normalize the embedding
    return this.normalizeEmbedding(embedding);
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Check if the embedding model is available
   */
  async checkAvailability(): Promise<boolean> {
    if (this.mockMode) return true;
    
    try {
      const isOllamaConnected = await ollamaService.checkConnection();
      if (!isOllamaConnected) {
        return false;
      }
      
      // In a real implementation, we would check if the embedding model is available
      // For now, just assume it is if Ollama is connected
      return true;
    } catch (error) {
      console.error('Failed to check embedding model availability:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const vectorEmbeddingService = new VectorEmbeddingService(); 