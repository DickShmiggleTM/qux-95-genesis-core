
/**
 * Learning Service Types
 * 
 * Type definitions for the Learning Service
 */

export interface LearningModel {
  id: string;
  name: string;
  created: number;
  performance: {
    accuracy: number;
    iterations: number;
    lastImprovement: number;
  };
  description?: string;
}

export interface LearningExample {
  id: string;
  input: string;
  output: string;
  tags: string[];
  timestamp: number;
  feedback?: 'positive' | 'negative' | 'neutral';
}

export interface LearningStats {
  totalExamples: number;
  lastLearnedAt: number | null;
  improvementRate: number;
}

export interface LearningState {
  enabled: boolean;
  stats: LearningStats;
  models: LearningModel[];
  activeModelId: string | null;
  examples: LearningExample[];
}

export interface LearningFilter {
  tags?: string[];
  feedback?: 'positive' | 'negative' | 'neutral';
}

export interface ModelOptions {
  learningRate?: number;
}
