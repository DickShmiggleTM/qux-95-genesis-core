
/**
 * Learning Models Manager
 * 
 * Handles all model-related functionality for the learning system
 */
import { v4 as uuidv4 } from 'uuid';
import { BaseService } from "../base/BaseService";
import { LearningModel } from "./types";
import { workspaceService } from "../workspaceService";

export class LearningModels extends BaseService {
  private models: LearningModel[] = [];
  private activeModelId: string | null = null;
  
  constructor(initialModels: LearningModel[] = [], activeId: string | null = null) {
    super();
    this.models = initialModels;
    this.activeModelId = activeId;
    
    // Initialize with default model if empty
    if (this.models.length === 0) {
      this.initializeDefaultModel();
    }
  }
  
  /**
   * Initialize with a default model
   */
  private initializeDefaultModel(): void {
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
    
    this.models = [defaultModel];
    this.activeModelId = defaultModel.id;
  }
  
  /**
   * Create a new learning model
   */
  createModel(name: string, description: string, options?: { learningRate?: number }): string {
    const model: LearningModel = {
      id: uuidv4(),
      name,
      description,
      created: Date.now(),
      performance: {
        accuracy: 0.5,
        iterations: 0,
        lastImprovement: Date.now()
      }
    };
    
    this.models.push(model);
    
    // Log to workspace
    workspaceService.log(`New learning model created: ${name} (${model.id})`, 'learning.log');
    
    return model.id;
  }
  
  /**
   * Get all learning models
   */
  getModels(): LearningModel[] {
    return [...this.models];
  }
  
  /**
   * Set the active learning model
   */
  setActiveModel(modelId: string): boolean {
    if (!this.models.some(m => m.id === modelId)) {
      return false;
    }
    
    this.activeModelId = modelId;
    return true;
  }
  
  /**
   * Get active learning model
   */
  getActiveModel(): LearningModel | null {
    if (!this.activeModelId) {
      return null;
    }
    
    const model = this.models.find(m => m.id === this.activeModelId);
    return model ? { ...model } : null;
  }
  
  /**
   * Update model performance after learning
   */
  updateModelPerformance(modelId: string, accuracyIncrease: number = 0.01): boolean {
    const modelIndex = this.models.findIndex(m => m.id === modelId);
    
    if (modelIndex === -1) {
      return false;
    }
    
    this.models[modelIndex].performance.iterations += 1;
    this.models[modelIndex].performance.accuracy += accuracyIncrease;
    this.models[modelIndex].performance.lastImprovement = Date.now();
    
    return true;
  }
  
  /**
   * Get the current model state
   */
  getState() {
    return {
      models: this.models,
      activeModelId: this.activeModelId
    };
  }
  
  /**
   * Load models from state
   */
  loadFromState(models: LearningModel[], activeModelId: string | null): void {
    this.models = models;
    this.activeModelId = activeModelId;
  }
}
