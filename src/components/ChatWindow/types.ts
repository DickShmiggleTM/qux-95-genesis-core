
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'code' | 'self-modification' | 'github' | 'autonomous-action' | 'error';
    action?: string;
    status?: 'pending' | 'success' | 'error' | 'in-progress';
    details?: any;
    importance?: number; // Memory importance factor (0-1)
    contextId?: string; // ID for context retrieval
  };
}

export interface SelfModificationAction {
  id: string;
  description: string;
  code: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';
  timestamp: Date;
  prUrl?: string;
  commitSha?: string;
}

export interface GitHubPullRequest {
  id: number;
  title: string;
  description: string;
  branch: string;
  status: 'open' | 'closed' | 'merged';
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ThemeType = 'cyberpunk' | 'terminal' | 'hacker' | 'dark';

export interface SystemStatus {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  gpu?: {
    usage: number;
    vram: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  activeProcesses: {
    id: string;
    name: string;
    status: 'active' | 'pending' | 'completed' | 'error';
    startTime: Date;
    progress?: number;
  }[];
}

// Interfaces for memory management
export interface MemorySettings {
  contextWindowSize: number;
  shortTermMemoryEnabled: boolean;
  longTermMemoryEnabled: boolean;
  memoryAutoSummarize: boolean;
  semanticSearchEnabled: boolean;
  memoryDecayRate: number; // 0-1, how quickly memory importance decays
}
