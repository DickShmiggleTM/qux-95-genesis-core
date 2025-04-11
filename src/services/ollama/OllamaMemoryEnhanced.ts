
import { BaseService } from "../base/BaseService";
import { OllamaMemoryItem } from "./types";
import { toast } from "sonner";
import { memoryManager } from '../memory/MemoryManager';

/**
 * Enhanced Ollama Memory service with improved memory management
 */
export class OllamaMemoryEnhanced extends BaseService {
  private contextWindow: OllamaMemoryItem[] = [];
  private sessionId: string = `session-${Date.now()}`;
  private contextWindowSize: number = 50;
  
  constructor() {
    super();
    this.loadMemoryState();
  }
  
  /**
   * Load memory from saved state
   */
  private loadMemoryState(): void {
    const savedContext = this.loadState<OllamaMemoryItem[]>('context');
    if (savedContext) {
      this.contextWindow = savedContext;
    } else {
      this.contextWindow = [];
    }
    
    // Load memory settings
    const options = memoryManager.getOptions();
    this.contextWindowSize = options.shortTermCapacity;
  }
  
  /**
   * Set context window size
   */
  setContextWindowSize(size: number): void {
    this.contextWindowSize = size;
    
    // Update memory manager options
    const options = memoryManager.getOptions();
    memoryManager.setOptions({ ...options, shortTermCapacity: size });
    
    // Trim context window if needed
    if (this.contextWindow.length > size) {
      // Before trimming, store the older items in memory manager
      const itemsToRemove = this.contextWindow.splice(
        size, 
        this.contextWindow.length - size
      );
      
      // Store items being removed in the long-term memory
      itemsToRemove.forEach(item => {
        memoryManager.storeMemory(
          JSON.stringify(item.data), 
          item.type as any, 
          { timestamp: item.timestamp },
          0.5 // Medium importance
        );
      });
    }
    
    // Save updated context
    this.saveState('context', this.contextWindow);
  }
  
  /**
   * Get current context window size
   */
  getContextWindowSize(): number {
    return this.contextWindowSize;
  }
  
  /**
   * Add item to context window
   */
  addToContext(type: string, data: any): void {
    const item: OllamaMemoryItem = {
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.contextWindow.push(item);
    
    // Keep context window at the configured size
    if (this.contextWindow.length > this.contextWindowSize) {
      const removedItem = this.contextWindow.shift();
      
      // Store the removed item in long-term memory
      if (removedItem) {
        memoryManager.storeMemory(
          JSON.stringify(removedItem.data), 
          removedItem.type as any, 
          { timestamp: removedItem.timestamp },
          0.4  // Lower importance for older items
        );
      }
    }
    
    // Also store in memory manager for unified memory access
    memoryManager.storeMemory(
      JSON.stringify(data),
      type as any,
      { timestamp: item.timestamp },
      0.7 // Higher importance for recent items
    );
    
    // Save updated context
    this.saveState('context', this.contextWindow);
  }
  
  /**
   * Store data in persistent memory
   */
  storeInMemory(category: string, key: string, data: any): void {
    // Store in Ollama's memory
    const memory = this.retrieveFromMemory(category) || {};
    memory[key] = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    // Save in memory
    this.saveState(`memory_${category}`, memory);
    
    // Also store in memory manager
    memoryManager.storeMemory(
      JSON.stringify(data),
      'system',
      { category, key },
      0.6 // Medium-high importance
    );
  }
  
  /**
   * Retrieve data from memory
   */
  retrieveFromMemory(category: string, key?: string): any {
    const memory = this.loadState<Record<string, any>>(`memory_${category}`);
    
    if (!memory) return null;
    if (!key) return memory;
    
    return memory[key] || null;
  }
  
  /**
   * Get recent context items with enhanced retrieval
   */
  async getContext(limit: number = 10, query?: string): Promise<OllamaMemoryItem[]> {
    if (!query) {
      // Simple recency-based retrieval
      return this.contextWindow.slice(-limit);
    }
    
    // Use semantic search for context retrieval when query is provided
    const searchResults = await memoryManager.searchMemories(query, limit);
    
    // Map search results back to OllamaMemoryItem format
    return searchResults.map(result => {
      try {
        const data = JSON.parse(result.item.content);
        return {
          type: result.item.type,
          data,
          timestamp: new Date(result.item.timestamp).toISOString()
        };
      } catch {
        // If parsing fails, return the content directly
        return {
          type: result.item.type,
          data: { content: result.item.content },
          timestamp: new Date(result.item.timestamp).toISOString()
        };
      }
    });
  }
  
  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
  
  /**
   * Save current state to storage
   */
  saveMemoryState(): boolean {
    return this.saveState('context', this.contextWindow);
  }
  
  /**
   * Process document for RAG
   */
  async processDocument(file: File, extractionOptions: any = {}): Promise<any> {
    try {
      toast.success("Processing document", {
        description: `Analyzing ${file.name}`
      });
      
      // Simulated document processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
      
      // Add to context
      this.addToContext('document', {
        filename: file.name,
        type: file.type,
        processed: true
      });
      
      toast.success("Document processed", {
        description: `${file.name} ready for RAG retrieval`
      });
      
      return documentData;
    } catch (error) {
      this.handleError("Error processing document", error, true);
      throw error;
    }
  }
  
  /**
   * Generate a summary of context items
   */
  async summarizeContext(): Promise<string> {
    if (this.contextWindow.length === 0) {
      return "No context to summarize";
    }
    
    // In a real implementation, we'd use the language model to generate this
    // For now we'll create a simple summary
    const typeCount: Record<string, number> = {};
    
    this.contextWindow.forEach(item => {
      typeCount[item.type] = (typeCount[item.type] || 0) + 1;
    });
    
    const summary = Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type} items`)
      .join(', ');
    
    return `Context contains ${this.contextWindow.length} items: ${summary}`;
  }
  
  /**
   * Clear context window
   */
  clearContext(): void {
    this.contextWindow = [];
    this.saveState('context', this.contextWindow);
    
    toast.info("Context window cleared", {
      description: "Short-term memory has been reset"
    });
  }
}
