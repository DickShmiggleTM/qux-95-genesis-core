/**
 * Learning Service
 * 
 * Provides self-improvement capabilities for the AI system through
 * learning from previous examples and user feedback
 */
import { v4 as uuidv4 } from 'uuid';
import { saveSystem, LearningState, LearningModel, LearningExample } from './saveSystem';
import { workspaceService } from './workspaceService';
import { toast } from 'sonner';
import { BaseService } from './base/BaseService';

class LearningService extends BaseService {
  private state: LearningState;
  
  constructor() {
    super();
    // Default state
    this.state = {
      enabled: false,
      stats: {
        totalExamples: 0,
        lastLearnedAt: null,
        improvementRate: 0,
      },
      models: [],
      activeModelId: null,
      examples: []
    };
    
    // Try to load from saved state
    this.loadLearningState();
  }
  
  /**
   * Load learning state from system state
   */
  private loadLearningState(): void {
    const savedState = this.loadState<LearningState>('learning');
    
    if (savedState) {
      this.state = savedState;
      console.log('Learning state loaded:', this.state);
    } else {
      console.log('No learning state found, initializing default');
      this.initializeState();
    }
  }
  
  /**
   * Initialize learning state with default values
   */
  initializeState() {
    const defaultModel: LearningModel = {
      id: uuidv4(),
      name: 'BaseModel',
      created: Date.now(),
      performance: {
        accuracy: 0.7,
        iterations: 0,
        lastImprovement: Date.now()
      }
    };
    
    this.state = {
      enabled: false,
      stats: {
        totalExamples: 0,
        lastLearnedAt: null,
        improvementRate: 0,
      },
      models: [defaultModel],
      activeModelId: defaultModel.id,
      examples: []
    };
    
    this.saveLearningState();
  }
  
  /**
   * Save current learning state
   */
  private saveLearningState(): void {
    try {
      super.saveState('learning', this.state);
    } catch (error) {
      console.error('Error saving learning state:', error);
    }
  }
  
  /**
   * Enable the learning system
   */
  enable(): boolean {
    this.state.enabled = true;
    this.saveLearningState();
    return true;
  }
  
  /**
   * Disable the learning system
   */
  disable(): boolean {
    this.state.enabled = false;
    this.saveLearningState();
    return true;
  }
  
  /**
   * Check if learning is enabled
   */
  isEnabled(): boolean {
    return this.state.enabled;
  }
  
  /**
   * Start learning process
   */
  learn(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isEnabled() || this.state.examples.length === 0) {
        resolve(false);
        return;
      }
      
      // Record learning attempt
      workspaceService.log('Learning process started', 'learning.log');
      
      // Simulate learning process
      setTimeout(() => {
        const activeModel = this.getActiveModel();
        
        if (activeModel) {
          // Update model performance
          const modelIndex = this.state.models.findIndex(m => m.id === activeModel.id);
          
          if (modelIndex !== -1) {
            this.state.models[modelIndex].performance.iterations += 1;
            this.state.models[modelIndex].performance.accuracy += 0.01;
            this.state.models[modelIndex].performance.lastImprovement = Date.now();
          }
          
          // Update stats
          this.state.stats.lastLearnedAt = Date.now();
          this.state.stats.improvementRate += 0.5;
          
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
    
    const example: LearningExample = {
      id: uuidv4(),
      input,
      output,
      tags,
      timestamp: Date.now()
    };
    
    this.state.examples.push(example);
    this.state.stats.totalExamples += 1;
    
    // Save state
    this.saveLearningState();
    
    // Log to workspace
    workspaceService.log(`New example recorded: ${example.id}`, 'learning.log');
    
    return example.id;
  }
  
  /**
   * Set the active learning model
   */
  setActiveModel(modelId: string): boolean {
    if (!this.state.models.some(m => m.id === modelId)) {
      return false;
    }
    
    this.state.activeModelId = modelId;
    this.saveLearningState();
    return true;
  }
  
  /**
   * Create a new learning model
   */
  createModel(name: string, description: string, options?: { learningRate?: number }): string | null {
    const model: LearningModel = {
      id: uuidv4(),
      name,
      created: Date.now(),
      performance: {
        accuracy: 0.5,
        iterations: 0,
        lastImprovement: Date.now()
      }
    };
    
    this.state.models.push(model);
    this.saveLearningState();
    
    // Log to workspace
    workspaceService.log(`New learning model created: ${name} (${model.id})`, 'learning.log');
    
    return model.id;
  }
  
  /**
   * Provide feedback for a learning example
   */
  provideFeedback(exampleId: string, feedback: 'positive' | 'negative' | 'neutral'): boolean {
    const exampleIndex = this.state.examples.findIndex(e => e.id === exampleId);
    
    if (exampleIndex === -1) {
      return false;
    }
    
    this.state.examples[exampleIndex].feedback = feedback;
    this.saveLearningState();
    
    // Log to workspace
    workspaceService.log(`Feedback provided for example ${exampleId}: ${feedback}`, 'learning.log');
    
    return true;
  }
  
  /**
   * Get learning system statistics
   */
  getStats(): typeof this.state.stats {
    return { ...this.state.stats };
  }
  
  /**
   * Get active learning model
   */
  getActiveModel(): LearningModel | null {
    if (!this.state.activeModelId) {
      return null;
    }
    
    const model = this.state.models.find(m => m.id === this.state.activeModelId);
    return model ? { ...model } : null;
  }
  
  /**
   * Get all learning models
   */
  getModels(): LearningModel[] {
    return [...this.state.models];
  }
  
  /**
   * Get all learning examples with optional filtering
   */
  getExamples(filter?: { tags?: string[], feedback?: 'positive' | 'negative' | 'neutral' }): LearningExample[] {
    let examples = [...this.state.examples];
    
    if (filter) {
      if (filter.tags && filter.tags.length > 0) {
        examples = examples.filter(e => 
          filter.tags!.some(tag => e.tags.includes(tag))
        );
      }
      
      if (filter.feedback) {
        examples = examples.filter(e => e.feedback === filter.feedback);
      }
    }
    
    return examples;
  }
}

export const learningService = new LearningService();
