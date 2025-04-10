import { BaseService } from "../base/BaseService";
import { OllamaMemoryItem } from "./types";
import { toast } from "sonner";

export class OllamaMemory extends BaseService {
  private memory: Record<string, any> = {};
  private contextWindow: OllamaMemoryItem[] = [];
  private sessionId: string = `session-${Date.now()}`;
  
  constructor() {
    super();
    this.loadMemoryState();
  }
  
  /**
   * Load memory from saved state
   */
  private loadMemoryState(): void {
    const savedState = this.loadState('memory');
    if (savedState) {
      this.memory = savedState;
    }
    
    const savedContext = this.loadState('context');
    if (savedContext) {
      this.contextWindow = savedContext;
    }
  }
  
  /**
   * Add item to context window
   */
  addToContext(type: string, data: any): void {
    this.contextWindow.push({
      type,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Keep context window at a reasonable size
    if (this.contextWindow.length > 100) {
      this.contextWindow.shift();
    }
    
    // Save updated context
    this.saveState('context', this.contextWindow);
  }
  
  /**
   * Store data in persistent memory
   */
  storeInMemory(category: string, key: string, data: any): void {
    if (!this.memory[category]) {
      this.memory[category] = {};
    }
    
    this.memory[category][key] = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    // Save updated memory
    this.saveState('memory', this.memory);
  }
  
  /**
   * Retrieve data from memory
   */
  retrieveFromMemory(category: string, key?: string): any {
    if (!key) {
      return this.memory[category] || {};
    }
    
    return this.memory[category]?.[key] || null;
  }
  
  /**
   * Get recent context items
   */
  getContext(limit: number = 10): OllamaMemoryItem[] {
    return this.contextWindow.slice(-limit);
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
  saveState(): Promise<boolean> {
    return Promise.resolve(
      super.saveState('memory', this.memory) && 
      super.saveState('context', this.contextWindow)
    );
  }
  
  /**
   * Process document for RAG
   */
  async processDocument(file: File, extractionOptions: any = {}): Promise<any> {
    try {
      toast.success("Processing document", {
        description: `Analyzing ${file.name}`
      });
      
      // Simulate document processing delay
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
      
      toast.success("Document processed", {
        description: `${file.name} ready for RAG retrieval`
      });
      
      return documentData;
    } catch (error) {
      this.handleError("Error processing document", error, true);
      throw error;
    }
  }
}
