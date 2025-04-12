/**
 * Enhanced Memory Manager
 * 
 * Provides advanced memory capabilities including:
 * - Adaptive context window sizing
 * - Long-term memory with vector embeddings
 * - Memory summarization for condensing older memories
 * - Unified memory access layer with backend abstraction
 */

import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { BaseService } from '../base/BaseService';
import { 
  MemoryItem, 
  MemoryOptions, 
  MemorySearchResult,  
  MemoryStats, 
  StorageBackend,
  AdvancedStorageBackend,
  ContextWindow,
  MemorySummary
} from './MemoryTypes';
import { LocalStorageBackend } from './LocalStorageBackend';
import { SQLiteBackend } from './SQLiteBackend';
import { vectorEmbeddingService } from './VectorEmbeddingService';
import { ollamaService } from '../ollamaService';

const DEFAULT_OPTIONS: MemoryOptions = {
  shortTermCapacity: 50,
  longTermCapacity: 1000,
  decayFactor: 0.95,
  autoPruneThreshold: 0.2,
  summarizationThreshold: 20,
  contextWindowSize: 10,
  adaptiveMode: true,
  vectorDimensions: 384,
  persistenceMode: 'local'
};

/**
 * Enhanced Memory Manager - Unified interface for short and long-term memory operations
 * with additional capabilities for semantic search and adaptive context
 */
export class EnhancedMemoryManager extends BaseService {
  private shortTermMemory: MemoryItem[] = [];
  private contextWindow: ContextWindow;
  private storageBackend: StorageBackend;
  private options: MemoryOptions;
  private summaries: MemorySummary[] = [];
  
  constructor(backend?: StorageBackend, options?: Partial<MemoryOptions>) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Initialize the storage backend based on persistence mode
    this.storageBackend = backend || this.createBackend(this.options.persistenceMode);
    
    // Initialize the context window
    this.contextWindow = {
      size: this.options.contextWindowSize,
      adaptiveSize: this.options.adaptiveMode,
      items: [],
      summary: undefined
    };
    
    // Load memory from storage
    this.initialize();
  }
  
  /**
   * Create a storage backend based on the specified mode
   */
  private createBackend(mode: MemoryOptions['persistenceMode']): StorageBackend {
    switch (mode) {
      case 'sqlite':
        return new SQLiteBackend(this.options.vectorDimensions);
      case 'indexed-db':
        // In a real implementation, we would add more backends
        console.warn('IndexedDB backend not implemented, falling back to localStorage');
        return new LocalStorageBackend();
      case 'file':
        console.warn('File backend not implemented, falling back to localStorage');
        return new LocalStorageBackend();
      case 'local':
      default:
        return new LocalStorageBackend();
    }
  }
  
  /**
   * Initialize the memory system
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadShortTermMemory();
      await this.loadSummaries();
      console.log('EnhancedMemoryManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize memory manager:', error);
      toast.error('Memory initialization failed', {
        description: 'Using default settings instead'
      });
    }
  }
  
  /**
   * Load short term memory from storage
   */
  private async loadShortTermMemory(): Promise<void> {
    try {
      // First try to load from the service's own state
      const savedSTM = this.loadState<MemoryItem[]>('shortTermMemory');
      if (savedSTM) {
        this.shortTermMemory = savedSTM;
        console.log(`Loaded ${savedSTM.length} items from saved short-term memory`);
        return;
      }
      
      // If not found, load recent items from the storage backend
      const allItems = await this.storageBackend.getAll();
      const sortedByRecency = allItems.sort((a, b) => b.timestamp - a.timestamp);
      this.shortTermMemory = sortedByRecency.slice(0, this.options.shortTermCapacity);
      console.log(`Loaded ${this.shortTermMemory.length} items from storage backend`);
    } catch (error) {
      console.error('Failed to load short-term memory:', error);
      this.shortTermMemory = [];
    }
  }
  
  /**
   * Load memory summaries
   */
  private async loadSummaries(): Promise<void> {
    try {
      // Try to load from the service's own state
      const savedSummaries = this.loadState<MemorySummary[]>('summaries');
      if (savedSummaries) {
        this.summaries = savedSummaries;
        console.log(`Loaded ${savedSummaries.length} memory summaries`);
        return;
      }
      
      // Otherwise try to load from storage backend if it supports type filtering
      const systemMemories = await this.storageBackend.getAll('system');
      const potentialSummaries = systemMemories.filter(item => 
        item.metadata?.summaryOf && Array.isArray(item.metadata.summaryOf)
      );
      
      // Convert to summaries format
      this.summaries = potentialSummaries.map(item => ({
        id: item.id,
        summaryOf: item.metadata?.summaryOf || [],
        content: item.content,
        timestamp: item.timestamp,
        itemCount: item.metadata?.itemCount || item.metadata?.summaryOf?.length || 0
      }));
      
      console.log(`Loaded ${this.summaries.length} memory summaries from system memories`);
    } catch (error) {
      console.error('Failed to load memory summaries:', error);
      this.summaries = [];
    }
  }
  
  /**
   * Store a new memory item with vector embedding
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
        metadata: metadata || {},
        importance,
      };
      
      // Generate vector embedding if possible
      try {
        const embedding = await vectorEmbeddingService.generateEmbedding(content);
        item.embedding = embedding;
        
        // Store vector separately if using advanced backend
        if (this.isAdvancedBackend() && item.embedding) {
          await (this.storageBackend as AdvancedStorageBackend).storeVector(
            item.id, 
            item.embedding, 
            content
          );
        }
      } catch (error) {
        console.error('Failed to generate embedding for memory item:', error);
        // Continue without embedding
      }
      
      // Add to short-term memory
      this.shortTermMemory.unshift(item);
      
      // Update context window
      this.updateContextWindow(item);
      
      // Trim short-term memory if needed
      if (this.shortTermMemory.length > this.options.shortTermCapacity) {
        const itemsToRemove = this.shortTermMemory.splice(
          this.options.shortTermCapacity,
          this.shortTermMemory.length - this.options.shortTermCapacity
        );
        
        // Potentially summarize items before removing them
        if (itemsToRemove.length >= this.options.summarizationThreshold) {
          await this.generateSummary(itemsToRemove);
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
   * Update the context window with a new memory item
   */
  private updateContextWindow(item: MemoryItem): void {
    // Check if the item is important enough to be in the context window
    const isImportant = item.importance >= 0.6;
    
    // Always include items that are marked as important
    if (isImportant) {
      this.contextWindow.items.unshift(item);
    } 
    // For regular items, only include certain types in the context window
    else if (['chat', 'code', 'action'].includes(item.type)) {
      this.contextWindow.items.unshift(item);
    }
    
    // Adjust context window size if in adaptive mode
    if (this.contextWindow.adaptiveSize) {
      // Determine complexity based on recent items
      const isComplex = this.isConversationComplex();
      const newSize = isComplex ? 
        Math.min(20, this.options.contextWindowSize * 1.5) : 
        this.options.contextWindowSize;
      
      this.contextWindow.size = Math.round(newSize);
    }
    
    // Trim context window if needed
    if (this.contextWindow.items.length > this.contextWindow.size) {
      // Keep important items if possible
      const importantItems = this.contextWindow.items.filter(i => i.importance >= 0.7);
      const regularItems = this.contextWindow.items.filter(i => i.importance < 0.7);
      
      // Sort regular items by recency
      regularItems.sort((a, b) => b.timestamp - a.timestamp);
      
      // Calculate how many regular items to keep
      const maxRegularItems = Math.max(0, this.contextWindow.size - importantItems.length);
      const regularItemsToKeep = regularItems.slice(0, maxRegularItems);
      
      // Regenerate the context window
      this.contextWindow.items = [...importantItems, ...regularItemsToKeep]
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // If we've significantly trimmed the context, generate a summary
      const trimmedCount = this.contextWindow.items.length - this.contextWindow.size;
      if (trimmedCount >= 5) {
        this.summarizeContextWindow();
      }
    }
  }
  
  /**
   * Determine if the current conversation is complex based on content
   */
  private isConversationComplex(): boolean {
    // Look at the most recent items (up to 5) to determine complexity
    const recentItems = this.contextWindow.items.slice(0, 5);
    
    // Count how many of the items contain complex terms
    const complexityMarkers = [
      'explain', 'why', 'how', 'complex', 'difficult', 'analyze', 'compare',
      'contrast', 'relationship', 'function', 'implementation', 'algorithm'
    ];
    
    let complexityScore = 0;
    
    for (const item of recentItems) {
      const content = item.content.toLowerCase();
      
      // Check for complexity markers
      for (const marker of complexityMarkers) {
        if (content.includes(marker)) {
          complexityScore += 1;
          break; // Only count one marker per item
        }
      }
      
      // Long messages are more likely to be complex
      if (content.length > 200) {
        complexityScore += 0.5;
      }
      
      // Code is usually complex
      if (item.type === 'code') {
        complexityScore += 1;
      }
    }
    
    // Determine if complex based on the score
    return complexityScore >= 2;
  }
  
  /**
   * Summarize the context window to preserve important information
   */
  private async summarizeContextWindow(): Promise<void> {
    if (!this.contextWindow.items.length) return;
    
    try {
      // Use Ollama to generate a summary (if available)
      if (ollamaService.isConnected()) {
        const itemContents = this.contextWindow.items
          .map(item => `[${item.type}]: ${item.content}`)
          .join('\n\n');
        
        const prompt = `Summarize the following conversation/context items concisely, preserving key information and context:\n\n${itemContents}`;
        
        const currentModel = ollamaService.getCurrentModel();
        if (currentModel) {
          const summary = await ollamaService.generateChatCompletion(
            [{ role: 'user', content: prompt }],
            currentModel,
            { temperature: 0.3, max_tokens: 200 }
          );
          
          this.contextWindow.summary = summary;
          return;
        }
      }
      
      // Fallback: Create a simple concatenation-based summary
      const topItems = this.contextWindow.items
        .filter(item => item.importance >= 0.6)
        .slice(0, 3);
      
      if (topItems.length > 0) {
        this.contextWindow.summary = `Context contains ${this.contextWindow.items.length} items. Key points: ` + 
          topItems.map(item => item.content.substring(0, 50) + '...').join(' | ');
      } else {
        this.contextWindow.summary = `Context contains ${this.contextWindow.items.length} recent interaction items.`;
      }
    } catch (error) {
      console.error('Failed to summarize context window:', error);
      // Set a simple fallback summary
      this.contextWindow.summary = `Context contains ${this.contextWindow.items.length} items from the conversation.`;
    }
  }
  
  /**
   * Generate a summary of multiple memory items and store it
   */
  private async generateSummary(items: MemoryItem[]): Promise<void> {
    if (items.length === 0) return;
    
    try {
      // Group items by type
      const itemsByType = items.reduce((acc, item) => {
        acc[item.type] = acc[item.type] || [];
        acc[item.type].push(item);
        return acc;
      }, {} as Record<string, MemoryItem[]>);
      
      // Process each type group
      for (const [type, typeItems] of Object.entries(itemsByType)) {
        if (typeItems.length < 3) continue; // Only summarize if we have enough items
        
        let summaryContent = '';
        
        // Try to use Ollama for intelligent summarization
        if (ollamaService.isConnected() && type === 'chat') {
          const itemContents = typeItems
            .map(item => item.content)
            .join('\n\n');
          
          const prompt = `Summarize the following ${typeItems.length} conversation messages concisely, preserving key information and context:\n\n${itemContents}`;
          
          const currentModel = ollamaService.getCurrentModel();
          if (currentModel) {
            summaryContent = await ollamaService.generateChatCompletion(
              [{ role: 'user', content: prompt }],
              currentModel,
              { temperature: 0.3, max_tokens: 200 }
            );
          }
        }
        
        // Fallback to simple summary if needed
        if (!summaryContent) {
          const timeRange = `${new Date(typeItems[0].timestamp).toLocaleString()} to ${new Date(typeItems[typeItems.length - 1].timestamp).toLocaleString()}`;
          summaryContent = `Summary of ${typeItems.length} ${type} items from ${timeRange}. ` +
                           `Key content: ${typeItems[0].content.substring(0, 50)}... and ${typeItems[typeItems.length - 1].content.substring(0, 50)}...`;
        }
        
        // Create and store the summary
        const summary: MemorySummary = {
          id: uuidv4(),
          summaryOf: typeItems.map(item => item.id),
          content: summaryContent,
          timestamp: Date.now(),
          itemCount: typeItems.length
        };
        
        // Store in summaries collection
        this.summaries.push(summary);
        this.saveState('summaries', this.summaries);
        
        // Store as a system memory item
        await this.storeMemory(summary.content, 'system', {
          summaryOf: summary.summaryOf,
          itemCount: summary.itemCount,
          summaryType: type
        }, 0.8); // Summaries are important
      }
    } catch (error) {
      console.error('Failed to generate memory summary:', error);
    }
  }
  
  /**
   * Search for memories using semantic similarity if available
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    try {
      // First check if we can do vector search
      if (this.isAdvancedBackend() && query.length > 3) {
        try {
          // Generate query embedding
          const queryEmbedding = await vectorEmbeddingService.generateEmbedding(query);
          
          // Perform vector search
          const vectorResults = await (this.storageBackend as AdvancedStorageBackend)
            .searchSimilar(queryEmbedding, limit);
          
          if (vectorResults.length > 0) {
            return vectorResults;
          }
        } catch (error) {
          console.error('Vector search failed, falling back to text search:', error);
          // Fall back to text search
        }
      }
      
      // If vector search failed or isn't available, use text search
      
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
      console.error('Failed to search memories:', error);
      return [];
    }
  }
  
  /**
   * Calculate relevance score between query and memory item
   */
  private calculateRelevance(query: string, item: MemoryItem): number {
    // Text-based relevance calculation
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
    return Math.min(1, (termScore * 0.5) + (item.importance * 0.3) + (ageFactor * 0.2));
  }
  
  /**
   * Check if we're using an advanced storage backend
   */
  private isAdvancedBackend(): boolean {
    return (
      this.storageBackend &&
      'storeVector' in this.storageBackend &&
      'searchSimilar' in this.storageBackend
    );
  }
  
  /**
   * Get the current context window for prompting
   */
  getContextWindow(): ContextWindow {
    return this.contextWindow;
  }
  
  /**
   * Get context window as formatted text for prompting
   */
  getFormattedContext(): string {
    if (this.contextWindow.items.length === 0) {
      return '';
    }
    
    // If we have a summary, use that plus the most recent items
    if (this.contextWindow.summary) {
      const recentItems = this.contextWindow.items
        .slice(0, 3)
        .map(item => `[${item.type}]: ${item.content}`)
        .join('\n\n');
      
      return `CONTEXT SUMMARY: ${this.contextWindow.summary}\n\nRECENT ITEMS:\n${recentItems}`;
    }
    
    // Otherwise format all context items
    return this.contextWindow.items
      .map(item => `[${item.type}]: ${item.content}`)
      .join('\n\n');
  }
  
  /**
   * Get all short-term memory items
   */
  getShortTermMemory(): MemoryItem[] {
    return [...this.shortTermMemory];
  }
  
  /**
   * Get memory items by type
   */
  async getMemoriesByType(type: string): Promise<MemoryItem[]> {
    try {
      return await this.storageBackend.getAll(type);
    } catch (error) {
      console.error(`Failed to get memories of type ${type}:`, error);
      return [];
    }
  }
  
  /**
   * Update importance of a memory item
   */
  async updateImportance(id: string, newImportance: number): Promise<boolean> {
    try {
      // Update in short-term memory if present
      const stmIndex = this.shortTermMemory.findIndex(item => item.id === id);
      if (stmIndex >= 0) {
        this.shortTermMemory[stmIndex].importance = newImportance;
        this.saveState('shortTermMemory', this.shortTermMemory);
      }
      
      // Update in context window if present
      const ctxIndex = this.contextWindow.items.findIndex(item => item.id === id);
      if (ctxIndex >= 0) {
        this.contextWindow.items[ctxIndex].importance = newImportance;
      }
      
      // Update in storage backend
      return await this.storageBackend.update(id, { importance: newImportance });
    } catch (error) {
      console.error(`Failed to update importance for memory ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Apply memory decay to reduce importance of older memories
   */
  async applyMemoryDecay(): Promise<void> {
    try {
      // Apply decay to short-term memory
      const now = Date.now();
      
      for (const item of this.shortTermMemory) {
        const ageInDays = (now - item.timestamp) / (1000 * 60 * 60 * 24);
        const decayFactor = Math.pow(this.options.decayFactor, ageInDays);
        
        // Apply decay but maintain a minimum importance
        item.importance = Math.max(0.1, item.importance * decayFactor);
      }
      
      // Save updated short-term memory
      this.saveState('shortTermMemory', this.shortTermMemory);
      
      // Also update the context window
      for (const item of this.contextWindow.items) {
        const ageInDays = (now - item.timestamp) / (1000 * 60 * 60 * 24);
        const decayFactor = Math.pow(this.options.decayFactor, ageInDays);
        
        // Apply decay but maintain a minimum importance
        item.importance = Math.max(0.1, item.importance * decayFactor);
      }
      
      // Auto-prune very low importance items
      const itemsToRemove = this.shortTermMemory
        .filter(item => item.importance < this.options.autoPruneThreshold)
        .map(item => item.id);
      
      if (itemsToRemove.length > 0) {
        this.shortTermMemory = this.shortTermMemory
          .filter(item => item.importance >= this.options.autoPruneThreshold);
          
        this.contextWindow.items = this.contextWindow.items
          .filter(item => item.importance >= this.options.autoPruneThreshold);
          
        console.log(`Auto-pruned ${itemsToRemove.length} low-importance memories`);
      }
    } catch (error) {
      console.error('Failed to apply memory decay:', error);
    }
  }
  
  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    try {
      // Get count of all items in long-term storage
      const allItems = await this.storageBackend.getAll();
      
      // Get backend-specific stats if available
      let indexStatus: MemoryStats['indexStatus'] = 'ready';
      if (this.isAdvancedBackend()) {
        const backendStats = await (this.storageBackend as AdvancedStorageBackend).getBackendStats();
        indexStatus = backendStats.indexingStatus;
      }
      
      return {
        totalItems: allItems.length,
        shortTermSize: this.shortTermMemory.length,
        longTermSize: allItems.length,
        lastAccess: Date.now(),
        indexStatus
      };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
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
   * Update memory options
   */
  setOptions(options: Partial<MemoryOptions>): void {
    const oldPersistenceMode = this.options.persistenceMode;
    
    // Update options
    this.options = { ...this.options, ...options };
    
    // Update context window size if it changed
    if (options.contextWindowSize !== undefined) {
      this.contextWindow.size = options.contextWindowSize;
    }
    
    // Update adaptive mode if it changed
    if (options.adaptiveMode !== undefined) {
      this.contextWindow.adaptiveSize = options.adaptiveMode;
    }
    
    // If persistence mode changed, we need to reinitialize
    if (options.persistenceMode !== undefined && options.persistenceMode !== oldPersistenceMode) {
      this.storageBackend = this.createBackend(options.persistenceMode);
      this.initialize();
    }
    
    toast.success('Memory options updated', {
      description: 'New memory settings applied'
    });
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
      
      // Clear context window
      this.contextWindow.items = [];
      this.contextWindow.summary = undefined;
      
      // Clear summaries
      this.summaries = [];
      this.saveState('summaries', this.summaries);
      
      // Clear storage backend
      await this.storageBackend.clear();
      
      toast.success('Memory cleared', {
        description: 'All memory items have been removed'
      });
      
      return true;
    } catch (error) {
      console.error('Failed to clear memory:', error);
      toast.error('Failed to clear memory', {
        description: 'Some memory items may remain'
      });
      return false;
    }
  }
  
  /**
   * Back up memory to a file (if supported by backend)
   */
  async backupMemory(destination: string): Promise<boolean> {
    if (this.isAdvancedBackend()) {
      try {
        return await (this.storageBackend as AdvancedStorageBackend).backup(destination);
      } catch (error) {
        console.error('Failed to back up memory:', error);
        return false;
      }
    } else {
      console.warn('Memory backup not supported by current backend');
      return false;
    }
  }
}

// Create a singleton instance
export const enhancedMemoryManager = new EnhancedMemoryManager(); 