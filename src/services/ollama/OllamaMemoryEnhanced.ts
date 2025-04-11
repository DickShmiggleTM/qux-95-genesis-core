import { MemoryItem, MemorySearchResult } from '../memory/MemoryTypes';
import { memoryManager } from '../memory/MemoryManager';
import { ollamaService } from './ollamaService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced memory system that uses Ollama embeddings for semantic search
 */
class OllamaMemoryEnhanced {
  private embeddingModel: string = 'nomic-embed-text';
  private isInitialized: boolean = false;
  private embeddingCache: Map<string, number[]> = new Map();
  private maxCacheSize: number = 1000;

  /**
   * Initialize the embedding model
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if the embedding model is available
      const models = await ollamaService.listModels();
      const hasEmbeddingModel = models.some(model => model.name === this.embeddingModel);
      
      if (!hasEmbeddingModel) {
        console.warn(`Embedding model ${this.embeddingModel} not found. Semantic search will be limited.`);
        // Try to use another model as fallback
        const fallbackModels = ['all-minilm', 'nomic-embed-text', 'mxbai-embed-large'];
        for (const model of fallbackModels) {
          if (models.some(m => m.name === model)) {
            this.embeddingModel = model;
            console.log(`Using ${model} as fallback embedding model`);
            break;
          }
        }
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Ollama memory enhancement:', error);
      return false;
    }
  }

  /**
   * Generate embeddings for a text using Ollama
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Check cache first
    const cacheKey = `${text.slice(0, 100)}`;
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey) || null;
    }
    
    try {
      const embedding = await ollamaService.generateEmbedding(text, this.embeddingModel);
      
      // Cache the result
      if (embedding && this.embeddingCache.size < this.maxCacheSize) {
        this.embeddingCache.set(cacheKey, embedding);
      }
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return null;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search for memories using semantic similarity
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Get query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }
      
      // Get all memories
      const memories = await memoryManager.getAllMemories();
      
      // Calculate similarity for each memory
      const results: MemorySearchResult[] = [];
      
      for (const memory of memories) {
        // Generate embedding for memory if it doesn't have one
        if (!memory.embedding) {
          memory.embedding = await this.generateEmbedding(memory.content);
          if (memory.embedding) {
            // Update the memory with the embedding
            await memoryManager.updateMemory(memory.id, { embedding: memory.embedding });
          }
        }
        
        if (memory.embedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
          results.push({
            item: memory,
            relevance: similarity
          });
        }
      }
      
      // Sort by relevance and limit results
      const searchResults = results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
      
      // Log this memory access
      memoryManager.storeMemory(`Memory access: ${query}`, 'memory', { result: searchResults }, 0.7);
      
      return searchResults;
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Store a memory with embedding
   */
  async storeMemoryWithEmbedding(
    content: string,
    type: 'chat' | 'system' | 'code' | 'file' | 'action' | 'error' | 'memory',
    metadata?: Record<string, any>,
    importance: number = 0.5
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(content);
      
      // Create memory item
      const memoryItem: MemoryItem = {
        id: uuidv4(),
        content,
        type,
        timestamp: Date.now(),
        metadata,
        embedding,
        importance
      };
      
      // Store in memory manager
      return await memoryManager.storeMemoryItem(memoryItem);
    } catch (error) {
      console.error('Failed to store memory with embedding:', error);
      // Fallback to regular memory storage
      return await memoryManager.storeMemory(content, type, metadata, importance);
    }
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }
}

export const ollamaMemoryEnhanced = new OllamaMemoryEnhanced();
