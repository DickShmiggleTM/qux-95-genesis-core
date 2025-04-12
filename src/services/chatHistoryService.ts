/**
 * Chat History Service
 * 
 * Manages the persistence and retrieval of chat histories.
 * Provides functionality to save, load, delete, and export chat sessions.
 */

import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { BaseService } from './base/BaseService';
import { saveSystem } from './saveSystem';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  modelName?: string;
  tags?: string[];
  pinned?: boolean;
  metadata?: Record<string, any>;
}

export interface ChatHistoryStats {
  totalSessions: number;
  totalMessages: number;
  oldestSession: string | null;
  newestSession: string | null;
}

class ChatHistoryService extends BaseService {
  private readonly STORAGE_KEY = 'qux95_chat_history';
  private readonly MAX_SESSIONS = 100;
  private sessions: Record<string, ChatSession> = {};
  private currentSessionId: string | null = null;
  private initialized = false;
  
  constructor() {
    super();
    this.initialize();
  }
  
  /**
   * Initialize the chat history service
   */
  private initialize(): void {
    if (this.initialized) return;
    
    try {
      // Load chat sessions from localStorage
      const savedSessions = localStorage.getItem(this.STORAGE_KEY);
      if (savedSessions) {
        this.sessions = JSON.parse(savedSessions);
        console.log(`Loaded ${Object.keys(this.sessions).length} chat sessions`);
      }
      
      this.initialized = true;
    } catch (error) {
      this.handleError('Failed to initialize chat history', error);
      this.sessions = {};
    }
  }
  
  /**
   * Save sessions to localStorage
   */
  private saveSessions(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sessions));
      
      // Also save to system state for backup
      const systemState = saveSystem.loadSystemState() || {};
      if (!systemState.chatHistory) {
        systemState.chatHistory = {};
      }
      systemState.chatHistory.sessions = this.sessions;
      systemState.chatHistory.currentSessionId = this.currentSessionId;
      saveSystem.saveSystemState(systemState);
    } catch (error) {
      this.handleError('Failed to save chat sessions', error);
      
      // If storage quota exceeded, try to prune old sessions
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.pruneOldSessions();
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sessions));
        } catch (retryError) {
          this.handleError('Failed to save even after pruning', retryError);
        }
      }
    }
  }
  
  /**
   * Prune old sessions when storage limit is reached
   */
  private pruneOldSessions(): void {
    const sessionIds = Object.keys(this.sessions);
    if (sessionIds.length <= this.MAX_SESSIONS / 2) return;
    
    // Sort sessions by updatedAt (oldest first)
    const sortedIds = sessionIds.sort((a, b) => {
      const dateA = new Date(this.sessions[a].updatedAt).getTime();
      const dateB = new Date(this.sessions[b].updatedAt).getTime();
      return dateA - dateB;
    });
    
    // Remove oldest sessions until we're at half capacity
    const toRemove = sortedIds.slice(0, Math.floor(sessionIds.length / 2));
    toRemove.forEach(id => {
      if (!this.sessions[id].pinned) { // Don't remove pinned sessions
        delete this.sessions[id];
      }
    });
    
    toast.info('Chat history pruned', {
      description: `Removed ${toRemove.length} old chat sessions to free up space`
    });
  }
  
  /**
   * Create a new chat session
   */
  public createSession(title?: string, modelName?: string): string {
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    this.sessions[sessionId] = {
      id: sessionId,
      title: title || `Chat ${Object.keys(this.sessions).length + 1}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
      modelName
    };
    
    this.currentSessionId = sessionId;
    this.saveSessions();
    
    return sessionId;
  }
  
  /**
   * Get the current session ID
   */
  public getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
  
  /**
   * Set the current session ID
   */
  public setCurrentSessionId(sessionId: string | null): void {
    if (sessionId && !this.sessions[sessionId]) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    this.currentSessionId = sessionId;
    this.saveSessions();
  }
  
  /**
   * Get a chat session by ID
   */
  public getSession(sessionId: string): ChatSession | null {
    return this.sessions[sessionId] || null;
  }
  
  /**
   * Get the current chat session
   */
  public getCurrentSession(): ChatSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions[this.currentSessionId] || null;
  }
  
  /**
   * Get all chat sessions
   */
  public getAllSessions(): ChatSession[] {
    return Object.values(this.sessions).sort((a, b) => {
      // Pinned sessions first, then by updatedAt (newest first)
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
  
  /**
   * Add a message to the current session
   */
  public addMessage(message: Omit<ChatMessage, 'timestamp'>): void {
    if (!this.currentSessionId) {
      this.createSession();
    }
    
    if (!this.currentSessionId || !this.sessions[this.currentSessionId]) {
      throw new Error('No active chat session');
    }
    
    const session = this.sessions[this.currentSessionId];
    const timestamp = new Date().toISOString();
    
    session.messages.push({
      ...message,
      timestamp
    });
    
    session.updatedAt = timestamp;
    
    // Update title if it's the default and this is a user message
    if (
      session.title.startsWith('Chat ') && 
      message.role === 'user' && 
      message.content.length > 0
    ) {
      // Use the first ~30 chars of the first user message as the title
      const titleContent = message.content.substring(0, 30).trim();
      if (titleContent) {
        session.title = titleContent + (message.content.length > 30 ? '...' : '');
      }
    }
    
    this.saveSessions();
  }
  
  /**
   * Update a session's metadata
   */
  public updateSession(
    sessionId: string, 
    updates: Partial<Omit<ChatSession, 'id' | 'messages' | 'createdAt'>>
  ): void {
    if (!this.sessions[sessionId]) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    this.sessions[sessionId] = {
      ...this.sessions[sessionId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveSessions();
  }
  
  /**
   * Delete a chat session
   */
  public deleteSession(sessionId: string): void {
    if (!this.sessions[sessionId]) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    delete this.sessions[sessionId];
    
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    
    this.saveSessions();
    
    toast.success('Chat deleted', {
      description: 'The chat session has been removed'
    });
  }
  
  /**
   * Clear all chat sessions
   */
  public clearAllSessions(): void {
    this.sessions = {};
    this.currentSessionId = null;
    this.saveSessions();
    
    toast.success('Chat history cleared', {
      description: 'All chat sessions have been removed'
    });
  }
  
  /**
   * Export a chat session as text
   */
  public exportSessionAsText(sessionId: string): string {
    const session = this.sessions[sessionId];
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    let output = `# ${session.title}\n`;
    output += `Date: ${new Date(session.createdAt).toLocaleString()}\n`;
    if (session.modelName) {
      output += `Model: ${session.modelName}\n`;
    }
    output += '\n';
    
    session.messages.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'QUX-95' : 'System';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      output += `[${time}] ${role}:\n${msg.content}\n\n`;
    });
    
    return output;
  }
  
  /**
   * Download a chat session as a text file
   */
  public downloadSessionAsText(sessionId: string): void {
    try {
      const session = this.sessions[sessionId];
      if (!session) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }
      
      const text = this.exportSessionAsText(sessionId);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Chat exported', {
        description: 'The chat has been downloaded as a text file'
      });
    } catch (error) {
      this.handleError('Failed to download chat', error);
    }
  }
  
  /**
   * Get chat history statistics
   */
  public getStats(): ChatHistoryStats {
    const sessions = Object.values(this.sessions);
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        oldestSession: null,
        newestSession: null
      };
    }
    
    const totalMessages = sessions.reduce(
      (sum, session) => sum + session.messages.length, 
      0
    );
    
    const sortedByDate = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    return {
      totalSessions: sessions.length,
      totalMessages,
      oldestSession: sortedByDate[0].createdAt,
      newestSession: sortedByDate[sortedByDate.length - 1].createdAt
    };
  }
  
  /**
   * Toggle pinned status for a session
   */
  public togglePinned(sessionId: string): void {
    if (!this.sessions[sessionId]) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    this.sessions[sessionId].pinned = !this.sessions[sessionId].pinned;
    this.saveSessions();
  }
  
  /**
   * Set tags for a session
   */
  public setTags(sessionId: string, tags: string[]): void {
    if (!this.sessions[sessionId]) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    this.sessions[sessionId].tags = tags;
    this.saveSessions();
  }
}

// Export singleton instance
export const chatHistoryService = new ChatHistoryService();
export default ChatHistoryService;
