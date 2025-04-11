
/**
 * Types for the enhanced memory management system
 */

export interface MemoryItem {
  id: string;
  content: string;
  type: 'chat' | 'system' | 'code' | 'file' | 'action';
  timestamp: number;
  metadata?: Record<string, any>;
  embedding?: number[];
  importance: number; // 0-1 score for memory prioritization
}

export interface MemorySearchResult {
  item: MemoryItem;
  relevance: number; // 0-1 score
}

export interface MemoryStats {
  totalItems: number;
  shortTermSize: number;
  longTermSize: number;
  lastAccess: number;
  indexStatus: 'ready' | 'building' | 'error';
}

export interface MemoryOptions {
  shortTermCapacity: number;
  longTermCapacity: number; 
  decayFactor: number; // How quickly importance decays over time
  autoPruneThreshold: number; // Below this importance, memories can be pruned
  summarizationThreshold: number; // Number of items before summarization
}

export interface StorageBackend {
  store(item: MemoryItem): Promise<string>;
  retrieve(id: string): Promise<MemoryItem | null>;
  search(query: string, limit?: number): Promise<MemorySearchResult[]>;
  update(id: string, item: Partial<MemoryItem>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  getAll(type?: string): Promise<MemoryItem[]>;
  clear(): Promise<boolean>;
}
