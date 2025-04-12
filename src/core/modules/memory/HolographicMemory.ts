/**
 * HolographicMemory.ts
 * 
 * Holographic memory system for distributed, associative storage with 
 * fault tolerance and phase conjugation for memory recovery.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { CognitiveEvent } from '../../orchestration/CognitiveOrchestrator';

// Types for holographic memory
export interface MemoryEntry {
  id: string;
  key: string;
  data: any;
  metadata: MemoryMetadata;
  vector: number[];
  timestamp: Date;
  lastAccessed: Date;
  accessCount: number;
  tags: string[];
}

export interface MemoryMetadata {
  category?: string;
  importance: number;
  confidence: number;
  source?: string;
  expirationDate?: Date;
  schema?: string;
  relationships?: Record<string, string[]>;
  [key: string]: any;
}

export interface MemoryQueryOptions {
  exact?: boolean;
  threshold?: number;
  limit?: number;
  sortBy?: 'relevance' | 'timestamp' | 'importance' | 'accessCount';
  includeTags?: string[];
  excludeTags?: string[];
  includeExpired?: boolean;
  includeMetadata?: string[];
}

export interface MemoryRecallResult {
  entries: MemoryEntry[];
  confidence: number;
  timing: number;
  query: string | object;
  matchCount: number;
}

export interface MemorySnapshot {
  id: string;
  timestamp: Date;
  memoryKeys: string[];
  metadata: Record<string, any>;
}

export class HolographicMemory extends EventEmitter {
  private memories: Map<string, MemoryEntry> = new Map();
  private vectorDimension: number = 128;
  private snapshots: MemorySnapshot[] = [];
  private connectedModules: Set<any> = new Set();
  
  private config = {
    maxMemories: 10000,
    defaultImportance: 0.5,
    defaultConfidence: 0.8,
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
    snapshotInterval: 60 * 60 * 1000, // 1 hour
    defaultThreshold: 0.7,
    faultToleranceLevel: 0.8,
    vectorSimilarityMethod: 'cosine',
    persistToDisk: true
  };
  
  constructor() {
    super();
    console.log('Holographic Memory initializing...');
  }
  
  /**
   * Lifecycle hook: Called when module is loaded
   */
  public async onLoad(): Promise<void> {
    console.log('Holographic Memory: loading stored memories...');
    
    // In a real implementation, this would load persisted memories
    this.setupCleanupTask();
    this.setupSnapshotTask();
    
    return Promise.resolve();
  }
  
  /**
   * Store an item in holographic memory
   */
  public store(
    key: string, 
    data: any, 
    metadata: Partial<MemoryMetadata> = {},
    tags: string[] = []
  ): string {
    // Generate ID if new, or get existing if updating
    let id: string;
    let existingEntry = false;
    
    // Check if key exists
    const existingKey = Array.from(this.memories.values()).find(m => m.key === key);
    if (existingKey) {
      id = existingKey.id;
      existingEntry = true;
    } else {
      id = uuidv4();
    }
    
    // Create or update memory entry
    const entry: MemoryEntry = {
      id,
      key,
      data,
      metadata: {
        importance: metadata.importance ?? this.config.defaultImportance,
        confidence: metadata.confidence ?? this.config.defaultConfidence,
        ...metadata
      },
      vector: this.generateVector(key, data),
      timestamp: new Date(),
      lastAccessed: new Date(),
      accessCount: existingEntry ? (existingKey?.accessCount || 0) + 1 : 1,
      tags: tags ?? []
    };
    
    // Store in memory
    this.memories.set(id, entry);
    
    // Clean up if we have too many memories
    if (this.memories.size > this.config.maxMemories) {
      this.cleanupOldMemories();
    }
    
    // Emit storage event
    this.emit('memory_stored', {
      id: uuidv4(),
      source: 'holographicMemory',
      type: 'MEMORY_STORED',
      priority: entry.metadata.importance * 10,
      timestamp: new Date(),
      data: {
        memoryId: id,
        key,
        tags
      },
      metadata: {
        intent: 'store_memory'
      }
    });
    
    return id;
  }
  
  /**
   * Retrieve item by exact key
   */
  public retrieve(key: string): any {
    const entry = Array.from(this.memories.values()).find(m => m.key === key);
    
    if (entry) {
      // Update access information
      entry.lastAccessed = new Date();
      entry.accessCount += 1;
      this.memories.set(entry.id, entry);
      
      return entry.data;
    }
    
    return null;
  }
  
  /**
   * Associate recall based on similarity
   */
  public associativeRecall(
    pattern: string | object,
    options: MemoryQueryOptions = {}
  ): MemoryRecallResult {
    const startTime = Date.now();
    
    // Convert pattern to vector
    const queryVector = this.generateVector(
      typeof pattern === 'string' ? pattern : JSON.stringify(pattern),
      pattern
    );
    
    // Default options
    const queryOptions: Required<MemoryQueryOptions> = {
      exact: options.exact ?? false,
      threshold: options.threshold ?? this.config.defaultThreshold,
      limit: options.limit ?? 10,
      sortBy: options.sortBy ?? 'relevance',
      includeTags: options.includeTags ?? [],
      excludeTags: options.excludeTags ?? [],
      includeExpired: options.includeExpired ?? false,
      includeMetadata: options.includeMetadata ?? []
    };
    
    // Get all memories
    let memories = Array.from(this.memories.values());
    
    // Filter by tags if specified
    if (queryOptions.includeTags.length > 0) {
      memories = memories.filter(memory => 
        queryOptions.includeTags!.some(tag => memory.tags.includes(tag))
      );
    }
    
    if (queryOptions.excludeTags.length > 0) {
      memories = memories.filter(memory => 
        !queryOptions.excludeTags!.some(tag => memory.tags.includes(tag))
      );
    }
    
    // Filter out expired memories unless includeExpired is true
    if (!queryOptions.includeExpired) {
      const now = new Date();
      memories = memories.filter(memory => 
        !memory.metadata.expirationDate || new Date(memory.metadata.expirationDate) > now
      );
    }
    
    // Calculate similarity for each memory
    const scoredMemories = memories.map(memory => {
      const similarity = this.calculateSimilarity(queryVector, memory.vector);
      return {
        memory,
        similarity
      };
    });
    
    // Filter by threshold
    const thresholdedMemories = scoredMemories.filter(item => 
      item.similarity >= queryOptions.threshold
    );
    
    // Sort based on sortBy option
    let sortedMemories: typeof thresholdedMemories;
    
    switch (queryOptions.sortBy) {
      case 'timestamp':
        sortedMemories = thresholdedMemories.sort((a, b) => 
          b.memory.timestamp.getTime() - a.memory.timestamp.getTime()
        );
        break;
      case 'importance':
        sortedMemories = thresholdedMemories.sort((a, b) => 
          b.memory.metadata.importance - a.memory.metadata.importance
        );
        break;
      case 'accessCount':
        sortedMemories = thresholdedMemories.sort((a, b) => 
          b.memory.accessCount - a.memory.accessCount
        );
        break;
      case 'relevance':
      default:
        sortedMemories = thresholdedMemories.sort((a, b) => 
          b.similarity - a.similarity
        );
    }
    
    // Limit results
    const limitedMemories = sortedMemories.slice(0, queryOptions.limit);
    
    // Update access time for returned memories
    limitedMemories.forEach(item => {
      const memory = item.memory;
      memory.lastAccessed = new Date();
      memory.accessCount += 1;
      this.memories.set(memory.id, memory);
    });
    
    // Calculate average confidence
    const avgConfidence = limitedMemories.length > 0 
      ? limitedMemories.reduce((sum, item) => sum + item.similarity, 0) / limitedMemories.length
      : 0;
    
    const result: MemoryRecallResult = {
      entries: limitedMemories.map(item => item.memory),
      confidence: avgConfidence,
      timing: Date.now() - startTime,
      query: pattern,
      matchCount: limitedMemories.length
    };
    
    return result;
  }
  
  /**
   * Generate a vector representation of data
   */
  private generateVector(key: string, data: any): number[] {
    // In a real implementation, this would use a proper embedding model
    // For this demo, we'll create a simple pseudo-random vector based on the data
    const vector: number[] = [];
    
    // Create a seed from the key and data
    const seed = key + (typeof data === 'object' ? JSON.stringify(data) : String(data));
    
    // Generate vector components
    for (let i = 0; i < this.vectorDimension; i++) {
      // Use a simple hash function to generate values between -1 and 1
      const hashValue = this.simpleHash(`${seed}:${i}`);
      vector.push((hashValue % 2000) / 1000 - 1);
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }
  
  /**
   * Simple hash function for demo purposes
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Calculate similarity between vectors
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    // Use cosine similarity
    if (vec1.length !== vec2.length) {
      // Pad shorter vector with zeros
      const maxLength = Math.max(vec1.length, vec2.length);
      if (vec1.length < maxLength) {
        vec1 = [...vec1, ...Array(maxLength - vec1.length).fill(0)];
      }
      if (vec2.length < maxLength) {
        vec2 = [...vec2, ...Array(maxLength - vec2.length).fill(0)];
      }
    }
    
    // Calculate dot product
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    
    // Calculate magnitudes
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    // Prevent division by zero
    if (mag1 === 0 || mag2 === 0) return 0;
    
    // Return cosine similarity
    return dotProduct / (mag1 * mag2);
  }
  
  /**
   * Create a snapshot of current memory state
   */
  public createSnapshot(): string {
    const snapshotId = uuidv4();
    
    const snapshot: MemorySnapshot = {
      id: snapshotId,
      timestamp: new Date(),
      memoryKeys: Array.from(this.memories.keys()),
      metadata: {
        memoryCount: this.memories.size,
        systemState: 'stable'
      }
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only the most recent snapshots
    if (this.snapshots.length > 50) {
      this.snapshots = this.snapshots.slice(-50);
    }
    
    // Notify connected modules
    this.notifyConnectedModules('memory_snapshots', {
      snapshot,
      timestamp: snapshot.timestamp
    });
    
    return snapshotId;
  }
  
  /**
   * Restore from a snapshot
   */
  public restoreFromSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    
    if (!snapshot) {
      console.error(`Snapshot ${snapshotId} not found`);
      return false;
    }
    
    // In a real implementation, this would restore the memory state
    console.log(`Restoring from snapshot ${snapshotId} from ${snapshot.timestamp}`);
    
    return true;
  }
  
  /**
   * Persist all memories to storage
   */
  public async persistAll(): Promise<boolean> {
    if (!this.config.persistToDisk) {
      return false;
    }
    
    console.log(`Persisting ${this.memories.size} memories to storage`);
    
    // In a real implementation, this would save to disk or database
    // For this demo, just create a snapshot
    this.createSnapshot();
    
    return true;
  }
  
  /**
   * Set up a periodic cleanup task
   */
  private setupCleanupTask(): void {
    setInterval(() => {
      this.cleanupOldMemories();
    }, this.config.cleanupInterval);
  }
  
  /**
   * Set up a periodic snapshot task
   */
  private setupSnapshotTask(): void {
    setInterval(() => {
      this.createSnapshot();
    }, this.config.snapshotInterval);
  }
  
  /**
   * Clean up old or less important memories
   */
  private cleanupOldMemories(): void {
    // If we're under the limit, don't clean up
    if (this.memories.size <= this.config.maxMemories) {
      return;
    }
    
    console.log('Cleaning up old memories...');
    
    // Calculate how many memories to remove
    const removeCount = Math.max(
      100, 
      Math.ceil(this.memories.size - this.config.maxMemories * 0.9)
    );
    
    // Get memories sorted by importance and recency
    const sortedMemories = Array.from(this.memories.values())
      .map(memory => {
        // Calculate a score based on importance, recency, and access count
        const ageInDays = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - ageInDays / 30); // Older = lower score
        
        const lastAccessAgeInDays = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
        const accessScore = Math.max(0, 1 - lastAccessAgeInDays / 30);
        
        const accessCountScore = Math.min(1, memory.accessCount / 10);
        
        // Weighted score
        const score = 
          memory.metadata.importance * 0.4 + 
          recencyScore * 0.3 + 
          accessScore * 0.2 + 
          accessCountScore * 0.1;
        
        return { memory, score };
      })
      .sort((a, b) => a.score - b.score); // Sort ascending (lowest score first)
    
    // Remove the least important memories
    const memoriesToRemove = sortedMemories.slice(0, removeCount);
    memoriesToRemove.forEach(item => {
      this.memories.delete(item.memory.id);
    });
    
    console.log(`Removed ${memoriesToRemove.length} memories`);
  }
  
  /**
   * Phase conjugation for memory recovery
   */
  public phaseConjugate(partialData: any): any {
    console.log('Applying phase conjugation for memory recovery...');
    
    // Generate a partial vector from the incomplete data
    const partialVector = this.generateVector('partial', partialData);
    
    // Find the closest complete memory
    const recall = this.associativeRecall(partialData, {
      threshold: 0.5,
      limit: 1
    });
    
    if (recall.entries.length > 0) {
      console.log(`Recovered memory with key: ${recall.entries[0].key}`);
      return recall.entries[0].data;
    }
    
    console.log('Could not recover memory through phase conjugation');
    return null;
  }
  
  /**
   * Connect to another module for data exchange
   */
  public connectModule(module: any, dataTypes: string[]): void {
    console.log(`Holographic Memory connecting to module: ${module.constructor.name}`);
    this.connectedModules.add(module);
  }
  
  /**
   * Notify connected modules of data
   */
  private notifyConnectedModules(dataType: string, data: any): void {
    this.connectedModules.forEach(module => {
      if (module.receiveData && typeof module.receiveData === 'function') {
        module.receiveData(dataType, data, 'holographicMemory');
      }
    });
  }
  
  /**
   * Handle incoming events
   */
  public handleEvent(event: CognitiveEvent): void {
    switch (event.type) {
      case 'MEMORY_STORE_REQUEST':
        try {
          const memoryId = this.store(
            event.data.key,
            event.data.data,
            event.data.metadata,
            event.data.tags
          );
          
          // Emit result as new event
          this.emit('memory_store_result', {
            id: uuidv4(),
            source: 'holographicMemory',
            target: event.source,
            type: 'MEMORY_STORE_RESULT',
            priority: event.priority,
            timestamp: new Date(),
            data: {
              memoryId,
              requestId: event.id
            },
            metadata: event.metadata
          });
        } catch (error) {
          console.error('Error storing memory:', error);
        }
        break;
        
      case 'MEMORY_RECALL_REQUEST':
        try {
          const result = this.associativeRecall(
            event.data.pattern,
            event.data.options
          );
          
          // Emit result as new event
          this.emit('memory_recall_result', {
            id: uuidv4(),
            source: 'holographicMemory',
            target: event.source,
            type: 'MEMORY_RECALL_RESULT',
            priority: event.priority,
            timestamp: new Date(),
            data: {
              result,
              requestId: event.id
            },
            metadata: event.metadata
          });
        } catch (error) {
          console.error('Error recalling memory:', error);
        }
        break;
        
      case 'MEMORY_SNAPSHOT_REQUEST':
        try {
          const snapshotId = this.createSnapshot();
          
          // Emit result as new event
          this.emit('memory_snapshot_result', {
            id: uuidv4(),
            source: 'holographicMemory',
            target: event.source,
            type: 'MEMORY_SNAPSHOT_RESULT',
            priority: event.priority,
            timestamp: new Date(),
            data: {
              snapshotId,
              requestId: event.id
            },
            metadata: event.metadata
          });
        } catch (error) {
          console.error('Error creating snapshot:', error);
        }
        break;
    }
  }
  
  /**
   * Get memory statistics
   */
  public getStats(): any {
    const now = Date.now();
    const memoryCount = this.memories.size;
    
    // Calculate memory age statistics
    const ages = Array.from(this.memories.values()).map(memory => 
      now - memory.timestamp.getTime()
    );
    
    const avgAge = ages.reduce((sum, age) => sum + age, 0) / (ages.length || 1);
    const oldestMemory = Math.max(...ages);
    const newestMemory = Math.min(...ages);
    
    // Count by tag
    const tagCounts: Record<string, number> = {};
    Array.from(this.memories.values()).forEach(memory => {
      memory.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    return {
      memoryCount,
      snapshotCount: this.snapshots.length,
      avgAgeMs: avgAge,
      oldestMemoryMs: oldestMemory,
      newestMemoryMs: newestMemory,
      tagCounts,
      lastSnapshotTime: this.snapshots.length > 0 ? 
        this.snapshots[this.snapshots.length - 1].timestamp : null
    };
  }
}
