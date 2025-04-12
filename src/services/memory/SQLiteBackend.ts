/**
 * SQLiteBackend - Implements persistent storage using SQLite
 * This provides both a standard key-value store and vector-based retrieval
 */

import { AdvancedStorageBackend, MemoryBackendStats, MemoryItem, MemorySearchResult } from './MemoryTypes';
import { toast } from 'sonner';

// We'll simulate the SQLite functionality since we can't use node modules directly in the browser
// In a real implementation, this would use either a Node.js SQLite module or an IndexedDB-based SQLite wrapper
export class SQLiteBackend implements AdvancedStorageBackend {
  private readonly DB_NAME = 'qux95_memory.db';
  private ready: boolean = false;
  private memoryCache: Record<string, MemoryItem> = {};
  private vectorCache: Record<string, number[]> = {};
  private vectorDimensions: number = 384; // Default for small embeddings
  
  constructor(vectorDimensions?: number) {
    if (vectorDimensions) {
      this.vectorDimensions = vectorDimensions;
    }
    this.initDatabase();
  }
  
  private async initDatabase(): Promise<void> {
    try {
      console.log(`Initializing SQLite database (${this.DB_NAME})`);
      
      // In a real implementation, we would create tables:
      // - memories (id, content, type, timestamp, metadata, importance)
      // - vectors (id, memory_id, vector_data)
      
      // For this simulation, just populate the cache
      const savedData = localStorage.getItem(this.DB_NAME);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.memories) {
            this.memoryCache = parsed.memories;
          }
          if (parsed.vectors) {
            this.vectorCache = parsed.vectors;
          }
        } catch (e) {
          console.error('Failed to parse saved memory data', e);
        }
      }
      
      this.ready = true;
      console.log('SQLite database initialized');
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      toast.error('Memory database initialization failed', {
        description: 'Using in-memory storage only'
      });
    }
  }
  
  private saveToLocalStorage(): void {
    // In a real SQLite implementation, this would be unnecessary
    // This is just for the simulation
    try {
      localStorage.setItem(this.DB_NAME, JSON.stringify({
        memories: this.memoryCache,
        vectors: this.vectorCache
      }));
    } catch (error) {
      console.error('Failed to persist memory data to localStorage:', error);
    }
  }
  
  // Check if the database is ready
  private async ensureReady(): Promise<void> {
    if (!this.ready) {
      // Wait for initialization to complete
      let attempts = 0;
      while (!this.ready && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!this.ready) {
        throw new Error('SQLite database not ready');
      }
    }
  }

  // Basic StorageBackend implementation
  async store(item: MemoryItem): Promise<string> {
    await this.ensureReady();
    this.memoryCache[item.id] = item;
    this.saveToLocalStorage();
    return item.id;
  }
  
  async retrieve(id: string): Promise<MemoryItem | null> {
    await this.ensureReady();
    return this.memoryCache[id] || null;
  }
  
  async search(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    await this.ensureReady();
    // Basic text search - in real implementation we would use SQLite FTS
    const items = Object.values(this.memoryCache);
    
    const results = items
      .filter(item => item.content.toLowerCase().includes(query.toLowerCase()))
      .map(item => ({
        item,
        relevance: this.calculateRelevance(query, item)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
    
    return results;
  }
  
  private calculateRelevance(query: string, item: MemoryItem): number {
    // Simple text-based relevance calculation
    const queryTerms = query.toLowerCase().split(/\s+/);
    const content = item.content.toLowerCase();
    
    // Term frequency calculation
    let matchScore = 0;
    queryTerms.forEach(term => {
      if (content.includes(term)) {
        matchScore += 1;
        
        // Bonus for exact phrase matches
        if (content.includes(query.toLowerCase())) {
          matchScore += 2;
        }
      }
    });
    
    // Normalize based on query terms
    const termScore = queryTerms.length > 0 ? matchScore / queryTerms.length : 0;
    
    // Age decay - older items get slightly lower scores
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const age = Date.now() - item.timestamp;
    const ageFactor = Math.max(0, 1 - (age / maxAge));
    
    // Calculate final score with importance
    return Math.min(1, (termScore * 0.6) + (item.importance * 0.3) + (ageFactor * 0.1));
  }
  
  async update(id: string, itemChanges: Partial<MemoryItem>): Promise<boolean> {
    await this.ensureReady();
    const existingItem = this.memoryCache[id];
    if (!existingItem) return false;
    
    this.memoryCache[id] = { ...existingItem, ...itemChanges };
    this.saveToLocalStorage();
    return true;
  }
  
  async delete(id: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.memoryCache[id]) return false;
    
    delete this.memoryCache[id];
    // Also delete vector if exists
    if (this.vectorCache[id]) {
      delete this.vectorCache[id];
    }
    
    this.saveToLocalStorage();
    return true;
  }
  
  async getAll(type?: string): Promise<MemoryItem[]> {
    await this.ensureReady();
    const items = Object.values(this.memoryCache);
    
    if (type) {
      return items.filter(item => item.type === type);
    }
    
    return items;
  }
  
  async clear(): Promise<boolean> {
    await this.ensureReady();
    this.memoryCache = {};
    this.vectorCache = {};
    this.saveToLocalStorage();
    return true;
  }
  
  // Advanced vector operations
  async storeVector(id: string, vector: number[], text: string): Promise<boolean> {
    await this.ensureReady();
    if (vector.length !== this.vectorDimensions) {
      console.error(`Vector dimension mismatch: expected ${this.vectorDimensions}, got ${vector.length}`);
      return false;
    }
    
    this.vectorCache[id] = vector;
    this.saveToLocalStorage();
    return true;
  }
  
  async searchSimilar(vector: number[], limit: number = 5): Promise<MemorySearchResult[]> {
    await this.ensureReady();
    if (vector.length !== this.vectorDimensions) {
      console.error(`Vector dimension mismatch: expected ${this.vectorDimensions}, got ${vector.length}`);
      return [];
    }
    
    // Calculate cosine similarity with all stored vectors
    const results: {id: string, similarity: number}[] = [];
    
    for (const [id, storedVector] of Object.entries(this.vectorCache)) {
      const similarity = this.cosineSimilarity(vector, storedVector);
      results.push({ id, similarity });
    }
    
    // Sort by similarity and get top results
    const topResults = results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    // Map to memory items
    const memoryResults: MemorySearchResult[] = [];
    
    for (const result of topResults) {
      const item = this.memoryCache[result.id];
      if (item) {
        memoryResults.push({
          item,
          relevance: result.similarity
        });
      }
    }
    
    return memoryResults;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
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
  
  async getVectorStats(): Promise<{ count: number, dimensions: number }> {
    await this.ensureReady();
    return {
      count: Object.keys(this.vectorCache).length,
      dimensions: this.vectorDimensions
    };
  }
  
  // Storage backend operations
  getBackendType(): string {
    return 'sqlite';
  }
  
  async getBackendStats(): Promise<MemoryBackendStats> {
    await this.ensureReady();
    
    const items = Object.values(this.memoryCache);
    const totalSize = items.reduce((size, item) => {
      return size + JSON.stringify(item).length;
    }, 0);
    
    return {
      totalItems: items.length,
      totalSize,
      indexingStatus: 'ready',
      lastAccess: Date.now(),
      backend: 'sqlite'
    };
  }
  
  async vacuum(): Promise<boolean> {
    await this.ensureReady();
    // In a real SQLite implementation, this would run VACUUM
    return true;
  }
  
  async backup(destination: string): Promise<boolean> {
    await this.ensureReady();
    // In a real implementation, this would create a backup file
    // For simulation, we'll create a JSON export
    try {
      const exportData = JSON.stringify({
        memories: this.memoryCache,
        vectors: this.vectorCache,
        stats: await this.getBackendStats()
      });
      
      localStorage.setItem(`${this.DB_NAME}_backup_${Date.now()}`, exportData);
      
      console.log(`Memory database backed up to ${destination}`);
      return true;
    } catch (error) {
      console.error('Failed to back up memory database:', error);
      return false;
    }
  }
} 