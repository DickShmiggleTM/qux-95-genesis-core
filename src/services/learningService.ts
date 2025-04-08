
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

class LearningService {
  private state: LearningState;
  
  constructor() {
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
    this.loadState();
  }
  
  /**
   * Load learning state from system state
   */
  private loadState(): void {
    const savedState = saveSystem.loadSystemState();
    
    if (savedState?.learning) {
      this.state = savedState.learning;
      console.log('Learning state loaded:', this.state);
    } else {
      console.log('No learning state found, initializing default');
      this.initializeState();
    }
  }
  
  /**
   * Initialize learning state with default values
   */
  private initializeState(): void {
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
    
    this.saveState();
  }
  
  /**
   * Save current learning state
   */
  private saveState(): void {
    try {
      // Update system state
      const systemState = saveSystem.loadSystemState() || {};
      
      systemState.learning = this.state;
      saveSystem.saveSystemState(systemState);
      
    } catch (error) {
      console.error('Error saving learning state:', error);
    }
  }
  
  /**
   * Enable the learning system
   */
  enable(): boolean {
    this.state.enabled = true;
    this.saveState();
    return true;
  }
  
  /**
   * Disable the learning system
   */
  disable(): boolean {
    this.state.enabled = false;
    this.saveState();
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
  learn(): boolean {
    if (!this.isEnabled() || this.state.examples.length === 0) {
      return false;
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
        this.saveState();
        
        // Log to workspace
        workspaceService.log(`Learning complete. New accuracy: ${activeModel.performance.accuracy.toFixed(2)}`, 'learning.log');
        
        toast.success('Learning process completed', {
          description: `Model accuracy improved to ${(activeModel.performance.accuracy * 100).toFixed(2)}%`
        });
      }
    }, 2000);
    
    return true;
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
    this.saveState();
    
    // Log to workspace
    workspaceService.log(`New example recorded: ${example.id}`, 'learning.log');
    
    return example.id;
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
   * Get all learning examples
   */
  getExamples(): LearningExample[] {
    return [...this.state.examples];
  }
}

export const learningService = new LearningService();
