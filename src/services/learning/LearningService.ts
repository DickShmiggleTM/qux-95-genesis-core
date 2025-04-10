
/**
 * Learning Service
 * 
 * Provides self-improvement capabilities for the AI system through
 * learning from previous examples and user feedback
 */
import { BaseService } from '../base/BaseService';
import { toast } from 'sonner';
import { workspaceService } from '../workspaceService';
import { LearningModels } from './LearningModels';
import { LearningExamples } from './LearningExamples';
import { LearningState, LearningStats, LearningFilter, LearningModel, LearningExample } from './types';

class LearningService extends BaseService {
  private enabled: boolean = false;
  private stats: LearningStats;
  private models: LearningModels;
  private examples: LearningExamples;
  
  constructor() {
    super();
    // Default stats
    this.stats = {
      totalExamples: 0,
      lastLearnedAt: null,
      improvementRate: 0,
    };
    
    this.models = new LearningModels();
    this.examples = new LearningExamples();
    
    // Try to load from saved state
    this.loadLearningState();
  }
  
  /**
   * Load learning state from system state
   */
  private loadLearningState(): void {
    const savedState = this.loadState<LearningState>('learning');
    
    if (savedState) {
      this.enabled = savedState.enabled;
      this.stats = savedState.stats;
      
      // Initialize models and examples with saved state
      this.models = new LearningModels(savedState.models, savedState.activeModelId);
      this.examples = new LearningExamples(savedState.examples);
      
      // Update total examples count
      this.stats.totalExamples = this.examples.getExampleCount();
      
      console.log('Learning state loaded:', savedState);
    } else {
      console.log('No learning state found, initializing default');
      this.initializeState();
    }
  }
  
  /**
   * Initialize learning state with default values
   */
  initializeState() {
    this.enabled = false;
    this.stats = {
      totalExamples: 0,
      lastLearnedAt: null,
      improvementRate: 0,
    };
    
    this.models = new LearningModels();
    this.examples = new LearningExamples();
    
    this.saveLearningState();
  }
  
  /**
   * Save current learning state
   */
  private saveLearningState(): void {
    try {
      const state: LearningState = {
        enabled: this.enabled,
        stats: this.stats,
        ...this.models.getState(),
        ...this.examples.getState()
      };
      
      super.saveState('learning', state);
    } catch (error) {
      console.error('Error saving learning state:', error);
    }
  }
  
  /**
   * Enable the learning system
   */
  enable(): boolean {
    this.enabled = true;
    this.saveLearningState();
    return true;
  }
  
  /**
   * Disable the learning system
   */
  disable(): boolean {
    this.enabled = false;
    this.saveLearningState();
    return true;
  }
  
  /**
   * Check if learning is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Start learning process
   */
  learn(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isEnabled() || this.examples.getExampleCount() === 0) {
        resolve(false);
        return;
      }
      
      // Record learning attempt
      workspaceService.log('Learning process started', 'learning.log');
      
      // Simulate learning process
      setTimeout(() => {
        const activeModel = this.models.getActiveModel();
        
        if (activeModel) {
          // Update model performance
          this.models.updateModelPerformance(activeModel.id);
          
          // Update stats
          this.stats.lastLearnedAt = Date.now();
          this.stats.improvementRate += 0.5;
          
          // Save state
          this.saveLearningState();
          
          // Log to workspace
          workspaceService.log(`Learning complete. New accuracy: ${activeModel.performance.accuracy.toFixed(2)}`, 'learning.log');
          
          toast.success('Learning process completed', {
            description: `Model accuracy improved to ${(activeModel.performance.accuracy * 100).toFixed(2)}%`
          });
          
          resolve(true);
        } else {
          resolve(false);
        }
      }, 2000);
    });
  }
  
  /**
   * Record a new learning example
   */
  recordExample(input: string, output: string, tags: string[] = []): string | null {
    if (!this.isEnabled()) {
      return null;
    }
    
    const exampleId = this.examples.recordExample(input, output, tags);
    this.stats.totalExamples += 1;
    
    // Save state
    this.saveLearningState();
    
    return exampleId;
  }
  
  /**
   * Set the active learning model
   */
  setActiveModel(modelId: string): boolean {
    const result = this.models.setActiveModel(modelId);
    
    if (result) {
      this.saveLearningState();
    }
    
    return result;
  }
  
  /**
   * Create a new learning model
   */
  createModel(name: string, description: string, options?: { learningRate?: number }): string | null {
    const modelId = this.models.createModel(name, description, options);
    this.saveLearningState();
    return modelId;
  }
  
  /**
   * Provide feedback for a learning example
   */
  provideFeedback(exampleId: string, feedback: 'positive' | 'negative' | 'neutral'): boolean {
    const result = this.examples.provideFeedback(exampleId, feedback);
    
    if (result) {
      this.saveLearningState();
    }
    
    return result;
  }
  
  /**
   * Get learning system statistics
   */
  getStats(): LearningStats {
    return { ...this.stats };
  }
  
  /**
   * Get active learning model
   */
  getActiveModel(): LearningModel | null {
    return this.models.getActiveModel();
  }
  
  /**
   * Get all learning models
   */
  getModels(): LearningModel[] {
    return this.models.getModels();
  }
  
  /**
   * Get all learning examples with optional filtering
   */
  getExamples(filter?: LearningFilter): LearningExample[] {
    return this.examples.getExamples(filter);
  }
}

export const learningService = new LearningService();
