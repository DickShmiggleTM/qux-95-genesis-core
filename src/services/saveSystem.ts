
/**
 * Save System - Handles persisting system state across page reloads
 */
import { ThemeType } from '@/contexts/ThemeContext';
import { Workspace } from './workspaceService';

// Define the saved state interface
export interface SavedState {
  settings?: {
    theme?: ThemeType;
    animationsEnabled?: boolean;
    isDarkMode?: boolean;
    [key: string]: any;
  };
  models?: {
    available: string[];
    selected?: string;
  };
  workspace?: Workspace;
  learning?: LearningState;
  github?: {
    authenticated: boolean;
    username?: string;
    token?: string;
    repositories?: any[];
  };
  [key: string]: any;
}

export interface LearningState {
  enabled: boolean;
  stats: {
    totalExamples: number;
    lastLearnedAt: number | null;
    improvementRate: number;
  };
  models: LearningModel[];
  activeModelId: string | null;
  examples: LearningExample[];
}

export interface LearningModel {
  id: string;
  name: string;
  created: number;
  performance: {
    accuracy: number;
    iterations: number;
    lastImprovement: number;
  };
}

export interface LearningExample {
  id: string;
  input: string;
  output: string;
  tags: string[];
  timestamp: number;
  feedback?: 'positive' | 'negative' | 'neutral';
}

// The save system service
class SaveSystem {
  private readonly STORAGE_KEY = 'qux95_system_state';
  
  /**
   * Save system state to local storage
   */
  saveSystemState(state: SavedState): boolean {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Error saving system state:', error);
      return false;
    }
  }
  
  /**
   * Load system state from local storage
   */
  loadSystemState(): SavedState | null {
    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      return savedState ? JSON.parse(savedState) : null;
    } catch (error) {
      console.error('Error loading system state:', error);
      return null;
    }
  }
  
  /**
   * Clear system state from local storage
   */
  clearSystemState(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing system state:', error);
      return false;
    }
  }
}

export const saveSystem = new SaveSystem();
