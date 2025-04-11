import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { BaseService } from '../base/BaseService';
import { MemoryItem, MemoryOptions, MemorySearchResult, MemoryStats, StorageBackend } from './MemoryTypes';
import { LocalStorageBackend } from './LocalStorageBackend';

const DEFAULT_OPTIONS: MemoryOptions = {
  shortTermCapacity: 50,
  longTermCapacity: 1000,
  decayFactor: 0.95,
  autoPruneThreshold: 0.2,
  summarizationThreshold: 20,
};

/**
 * Memory Manager - Unified interface for short and long-term memory operations
 */
export class MemoryManager extends BaseService {
  private shortTermMemory: MemoryItem[] = [];
  private storageBackend: StorageBackend;
  private options: MemoryOptions;
  
  constructor(backend?: StorageBackend, options?: Partial<MemoryOptions>) {
    super();
    this.storageBackend = backend || new LocalStorageBackend();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadShortTermMemory();
  }
  
  /**
   * Load short term memory from storage or saved state
   */
  private async loadShortTermMemory(): Promise<void> {
    try {
      // First try to load from the service's own state
      const savedSTM = this.loadState<MemoryItem[]>('shortTermMemory');
      if (savedSTM) {
        this.shortTermMemory = savedSTM;
        return;
      }
      
      // If not found, load recent items from the storage backend
      const allItems = await this.storageBackend.getAll();
      const sortedByRecency = allItems.sort((a, b) => b.timestamp - a.timestamp);
      this.shortTermMemory = sortedByRecency.slice(0, this.options.shortTermCapacity);
    } catch (error) {
      console.error('Failed to load short-term memory:', error);
      this.shortTermMemory = [];
    }
  }
  
  /**
   * Store a new memory item
   */
  async storeMemory(
    content: string, 
    type: MemoryItem['type'],
    metadata?: Record<string, any>,
    importance: number = 0.5
  ): Promise<string> {
    try {
      const item: MemoryItem = {
        id: uuidv4(),
        content,
        type,
        timestamp: Date.now(),
        metadata,
        importance,
      };
      
      // Add to short-term memory
      this.shortTermMemory.unshift(item);
      
      // Trim short-term memory if needed
      if (this.shortTermMemory.length > this.options.shortTermCapacity) {
        const itemsToRemove = this.shortTermMemory.splice(
          this.options.shortTermCapacity,
          this.shortTermMemory.length - this.options.shortTermCapacity
        );
        
        // Potentially summarize items before removing them
        if (itemsToRemove.length >= this.options.summarizationThreshold) {
          this.generateSummary(itemsToRemove);
        }
      }
      
      // Save updated short-term memory
      this.saveState('shortTermMemory', this.shortTermMemory);
      
      // Store in long-term memory
      await this.storageBackend.store(item);
      
      return item.id;
    } catch (error) {
      this.handleError('Failed to store memory', error);
      throw error;
    }
  }
  
  /**
   * Generate a summary of multiple memory items and store it
   */
  private async generateSummary(items: MemoryItem[]): Promise<void> {
    if (items.length === 0) return;
    
    try {
      // In a real implementation, we'd use AI to generate this summary
      // For now we'll create a simple concatenation
      const itemsByType = items.reduce((acc, item) => {
        acc[item.type] = acc[item.type] || [];
        acc[item.type].push(item);
        return acc;
      }, {} as Record<string, MemoryItem[]>);
      
      for (const [type, typeItems] of Object.entries(itemsByType)) {
        if (typeItems.length < 3) continue; // Only summarize if we have enough items
        
        const summary = `Summary of ${typeItems.length} ${type} items from ${new Date(typeItems[0].timestamp).toLocaleString()} to ${new Date(typeItems[typeItems.length - 1].timestamp).toLocaleString()}`;
        
        await this.storeMemory(summary, 'system', {
          summaryOf: typeItems.map(item => item.id),
          itemCount: typeItems.length
        }, 0.8); // Summaries are important
      }
    } catch (error) {
      console.error('Failed to generate memory summary:', error);
    }
  }
  
  /**
   * Search for memories based on relevance to a query
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    try {
      // First search short-term memory (which is in-memory and fast)
      const stmResults = this.shortTermMemory
        .filter(item => item.content.toLowerCase().includes(query.toLowerCase()))
        .map(item => ({
          item,
          relevance: this.calculateRelevance(query, item)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
      
      // If we have enough results from STM, just return those
      if (stmResults.length >= limit) {
        return stmResults;
      }
      
      // Otherwise, also search long-term memory
      const ltmResults = await this.storageBackend.search(
        query, 
        limit - stmResults.length
      );
      
      // Combine results, removing duplicates
      const stmIds = new Set(stmResults.map(result => result.item.id));
      const combinedResults = [
        ...stmResults,
        ...ltmResults.filter(result => !stmIds.has(result.item.id))
      ].sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
      
      return combinedResults;
    } catch (error) {
      this.handleError('Failed to search memories', error);
      return [];
    }
  }
  
  /**
   * Calculate relevance score between query and memory item
   */
  private calculateRelevance(query: string, item: MemoryItem): number {
    // Simple relevance calculation - in a real system we'd use vectors
    // This considers both text similarity and the item's importance
    const queryLower = query.toLowerCase();
    const contentLower = item.content.toLowerCase();
    
    const textSimilarity = queryLower.split(' ').reduce((score, word) => {
      return contentLower.includes(word) ? score + 0.2 : score;
    }, 0);
    
    // Recency factor - more recent items get higher relevance
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const age = Date.now() - item.timestamp;
    const recencyFactor = Math.max(0, 1 - (age / maxAge));
    
    // Combined score with importance
    return Math.min(
      1, 
      (textSimilarity * 0.4) + 
      (item.importance * 0.4) + 
      (recencyFactor * 0.2)
    );
  }
  
  /**
   * Get all short-term memory items
   */
  getShortTermMemory(): MemoryItem[] {
    return [...this.shortTermMemory];
  }
  
  /**
   * Get all memory items of a specific type
   */
  async getAllMemoriesByType(type: string): Promise<MemoryItem[]> {
    try {
      return await this.storageBackend.getAll(type);
    } catch (error) {
      this.handleError('Failed to get memories by type', error);
      return [];
    }
  }
  
  /**
   * Update memory item importance
   */
  async updateImportance(id: string, newImportance: number): Promise<boolean> {
    try {
      // Update in short-term memory if present
      const stmIndex = this.shortTermMemory.findIndex(item => item.id === id);
      if (stmIndex >= 0) {
        this.shortTermMemory[stmIndex].importance = newImportance;
        this.saveState('shortTermMemory', this.shortTermMemory);
      }
      
      // Update in long-term storage
      return await this.storageBackend.update(id, { importance: newImportance });
    } catch (error) {
      this.handleError('Failed to update memory importance', error);
      return false;
    }
  }
  
  /**
   * Apply memory decay to reduce importance of older memories
   */
  async applyMemoryDecay(): Promise<void> {
    try {
      // Apply decay to short-term memory
      this.shortTermMemory = this.shortTermMemory.map(item => ({
        ...item,
        importance: item.importance * this.options.decayFactor
      }));
      
      this.saveState('shortTermMemory', this.shortTermMemory);
      
      // Prune short-term memory items below threshold
      this.shortTermMemory = this.shortTermMemory.filter(
        item => item.importance >= this.options.autoPruneThreshold
      );
      
      // For long-term memory, we would ideally batch this operation
      // but for simplicity in this implementation, we'll skip it
      
      toast.info("Memory decay applied", {
        description: "Low importance memories have been pruned"
      });
    } catch (error) {
      this.handleError('Failed to apply memory decay', error);
    }
  }
  
  /**
   * Get memory system statistics
   */
  async getStats(): Promise<MemoryStats> {
    try {
      const allItems = await this.storageBackend.getAll();
      
      return {
        totalItems: allItems.length,
        shortTermSize: this.shortTermMemory.length,
        longTermSize: allItems.length,
        lastAccess: Date.now(),
        indexStatus: 'ready'
      };
    } catch (error) {
      this.handleError('Failed to get memory stats', error);
      
      return {
        totalItems: this.shortTermMemory.length,
        shortTermSize: this.shortTermMemory.length,
        longTermSize: 0,
        lastAccess: Date.now(),
        indexStatus: 'error'
      };
    }
  }
  
  /**
   * Set memory system options
   */
  setOptions(options: Partial<MemoryOptions>): void {
    this.options = { ...this.options, ...options };
    this.saveState('memoryOptions', this.options);
  }
  
  /**
   * Get current memory options
   */
  getOptions(): MemoryOptions {
    return { ...this.options };
  }
  
  /**
   * Clear all memory
   */
  async clearMemory(): Promise<boolean> {
    try {
      // Clear short-term memory
      this.shortTermMemory = [];
      this.saveState('shortTermMemory', this.shortTermMemory);
      
      // Clear long-term memory
      await this.storageBackend.clear();
      
      toast.success("Memory cleared", {
        description: "All memory items have been deleted"
      });
      
      return true;
    } catch (error) {
      this.handleError('Failed to clear memory', error);
      return false;
    }
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();
