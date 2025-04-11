
import { StorageBackend, MemoryItem, MemorySearchResult } from './MemoryTypes';

/**
 * Simple localStorage-based implementation of the StorageBackend interface
 * for development and testing.
 */
export class LocalStorageBackend implements StorageBackend {
  private readonly STORAGE_KEY = 'qux95_memory';
  
  private getStorageData(): Record<string, MemoryItem> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }
  
  private setStorageData(data: Record<string, MemoryItem>): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  async store(item: MemoryItem): Promise<string> {
    const data = this.getStorageData();
    data[item.id] = item;
    this.setStorageData(data);
    return item.id;
  }
  
  async retrieve(id: string): Promise<MemoryItem | null> {
    const data = this.getStorageData();
    return data[id] || null;
  }
  
  async search(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    const data = this.getStorageData();
    const items = Object.values(data);
    
    // Simple search implementation - in a real system we'd use vector similarity
    const results = items
      .filter(item => item.content.toLowerCase().includes(query.toLowerCase()))
      .map(item => ({
        item,
        relevance: this.calculateSimpleRelevance(query, item.content)
      }))
      .sort((a, b) => b.relevance - a.relevance);
    
    return results.slice(0, limit);
  }
  
  private calculateSimpleRelevance(query: string, content: string): number {
    // Simple relevance calculation based on term frequency
    // In a real implementation, this would use vector embeddings
    const queryWords = query.toLowerCase().split(' ');
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    queryWords.forEach(word => {
      if (contentLower.includes(word)) matches++;
    });
    
    return matches / queryWords.length;
  }
  
  async update(id: string, itemChanges: Partial<MemoryItem>): Promise<boolean> {
    const data = this.getStorageData();
    if (!data[id]) return false;
    
    data[id] = { ...data[id], ...itemChanges };
    this.setStorageData(data);
    return true;
  }
  
  async delete(id: string): Promise<boolean> {
    const data = this.getStorageData();
    if (!data[id]) return false;
    
    delete data[id];
    this.setStorageData(data);
    return true;
  }
  
  async getAll(type?: string): Promise<MemoryItem[]> {
    const data = this.getStorageData();
    const items = Object.values(data);
    
    if (type) {
      return items.filter(item => item.type === type);
    }
    
    return items;
  }
  
  async clear(): Promise<boolean> {
    localStorage.removeItem(this.STORAGE_KEY);
    return true;
  }
}
