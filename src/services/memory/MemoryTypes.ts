/**
 * Types for the enhanced memory management system
 */

export interface MemoryItem {
  id: string;
  content: string;
  type: 'chat' | 'system' | 'code' | 'file' | 'action' | 'error' | 'memory';
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
  contextWindowSize: number; // Configurable context window size
  adaptiveMode: boolean; // Whether to adapt context size based on complexity
  vectorDimensions: number; // Size of vector embeddings
  persistenceMode: 'local' | 'indexed-db' | 'file' | 'sqlite'; // Storage backend type
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

export interface MemorySummary {
  id: string;
  summaryOf: string[]; // IDs of summarized items
  content: string;
  timestamp: number;
  itemCount: number;
}

export interface VectorEmbedding {
  id: string;
  vector: number[];
  text: string;
  timestamp: number;
}

export interface ContextWindow {
  size: number;
  adaptiveSize: boolean;
  items: MemoryItem[];
  summary?: string;
}

export interface MemoryBackendStats {
  totalItems: number;
  totalSize: number; // in bytes
  indexingStatus: 'ready' | 'building' | 'error';
  lastAccess: number;
  backend: string;
}

export interface AdvancedStorageBackend extends StorageBackend {
  // Vector operations
  storeVector(id: string, vector: number[], text: string): Promise<boolean>;
  searchSimilar(vector: number[], limit?: number): Promise<MemorySearchResult[]>;
  getVectorStats(): Promise<{ count: number, dimensions: number }>;
  
  // Storage operations
  getBackendType(): string;
  getBackendStats(): Promise<MemoryBackendStats>;
  vacuum(): Promise<boolean>; // Optimize storage
  backup(destination: string): Promise<boolean>;
}
