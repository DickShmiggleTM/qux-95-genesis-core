
/**
 * Self-Supervised Learning Service
 * 
 * This service enables the system to learn from its own outputs and interactions.
 * It stores training data and learning artifacts in the AI workspace.
 */
import { workspaceService } from './workspaceService';
import { saveSystem } from './saveSystem';
import { toast } from 'sonner';

interface LearningExample {
  id: string;
  timestamp: number;
  input: string;
  output: string;
  feedback?: 'positive' | 'negative' | 'neutral';
  tags: string[];
  contextId?: string;
}

interface LearningModel {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  parameters: Record<string, any>;
  performance: {
    accuracy: number;
    iterations: number;
    lastImprovement: number;
  };
}

interface LearningState {
  enabled: boolean;
  examples: LearningExample[];
  models: LearningModel[];
  activeModelId: string | null;
  stats: {
    totalExamples: number;
    lastLearnedAt: number | null;
    improvementRate: number;
  };
}

class LearningService {
  private state: LearningState;
  private readonly dataPath = 'data/learning';
  private readonly modelsPath = 'data/models';
  private saveTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    // Initialize with default state
    this.state = {
      enabled: false,
      examples: [],
      models: [],
      activeModelId: null,
      stats: {
        totalExamples: 0,
        lastLearnedAt: null,
        improvementRate: 0
      }
    };
    
    // Load any existing state
    this.loadState();
    
    // Create necessary directories
    workspaceService.createDirectory(this.dataPath);
    workspaceService.createDirectory(this.modelsPath);
  }
  
  /**
   * Load learning state
   */
  private loadState(): void {
    try {
      // Try to load from workspace
      const stateJson = workspaceService.readFile('configs/learning_state.json');
      
      if (stateJson) {
        const parsedState = JSON.parse(stateJson);
        this.state = parsedState;
        workspaceService.log('Learning state loaded from workspace');
      } else {
        // If not in workspace, try loading from system state
        const savedState = saveSystem.loadSystemState();
        
        if (savedState?.learning) {
          this.state = savedState.learning;
          workspaceService.log('Learning state loaded from system state');
          
          // Also save to workspace for future use
          this.saveState();
        } else {
          workspaceService.log('No learning state found, initializing with defaults');
          this.initializeDefaultModel();
        }
      }
    } catch (error) {
      console.error('Error loading learning state:', error);
      workspaceService.log(`Error loading learning state: ${error instanceof Error ? error.message : String(error)}`);
      this.initializeDefaultModel();
    }
  }
  
  /**
   * Initialize a default learning model
   */
  private initializeDefaultModel(): void {
    const defaultModel: LearningModel = {
      id: 'default-' + Date.now().toString(36),
      name: 'Default Learning Model',
      description: 'Initial learning model for QUX-95',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      parameters: {
        learningRate: 0.01,
        decayFactor: 0.95,
        memorization: 0.5,
        creativity: 0.5
      },
      performance: {
        accuracy: 0,
        iterations: 0,
        lastImprovement: Date.now()
      }
    };
    
    this.state.models.push(defaultModel);
    this.state.activeModelId = defaultModel.id;
    
    // Save the model definition
    const modelDefinition = JSON.stringify(defaultModel, null, 2);
    workspaceService.writeFile(`${this.modelsPath}/${defaultModel.id}.json`, modelDefinition);
    
    workspaceService.log(`Initialized default learning model: ${defaultModel.name}`);
    this.saveState();
  }
  
  /**
   * Save learning state
   */
  private saveState(): void {
    try {
      // Save to workspace
      workspaceService.writeFile('configs/learning_state.json', JSON.stringify(this.state, null, 2));
      
      // Also update system state
      const systemState = saveSystem.loadSystemState() || {};
      
      saveSystem.saveSystemState({
        ...systemState,
        learning: this.state
      });
      
      workspaceService.log('Learning state saved');
    } catch (error) {
      console.error('Error saving learning state:', error);
      workspaceService.log(`Error saving learning state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Schedule state saving with debounce
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveState();
      this.saveTimeout = null;
    }, 2000);
  }
  
  /**
   * Enable learning
   */
  enable(): void {
    if (!this.state.enabled) {
      this.state.enabled = true;
      workspaceService.log('Learning system enabled');
      this.saveState();
    }
  }
  
  /**
   * Disable learning
   */
  disable(): void {
    if (this.state.enabled) {
      this.state.enabled = false;
      workspaceService.log('Learning system disabled');
      this.saveState();
    }
  }
  
  /**
   * Record a learning example
   */
  recordExample(input: string, output: string, tags: string[] = [], contextId?: string): string {
    if (!this.state.enabled) {
      return '';
    }
    
    const example: LearningExample = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      input,
      output,
      tags,
      contextId,
      feedback: 'neutral'
    };
    
    this.state.examples.push(example);
    this.state.stats.totalExamples = this.state.examples.length;
    
    // Save example to file
    workspaceService.writeFile(`${this.dataPath}/example_${example.id}.json`, JSON.stringify(example, null, 2));
    
    workspaceService.log(`Recorded learning example: ${example.id}`);
    this.scheduleSave();
    
    return example.id;
  }
  
  /**
   * Provide feedback for a learning example
   */
  provideFeedback(exampleId: string, feedback: 'positive' | 'negative' | 'neutral'): boolean {
    const example = this.state.examples.find(e => e.id === exampleId);
    
    if (!example) {
      workspaceService.log(`Example not found: ${exampleId}`);
      return false;
    }
    
    example.feedback = feedback;
    
    // Update example file
    workspaceService.writeFile(`${this.dataPath}/example_${exampleId}.json`, JSON.stringify(example, null, 2));
    
    workspaceService.log(`Updated feedback for example ${exampleId}: ${feedback}`);
    this.scheduleSave();
    
    return true;
  }
  
  /**
   * Learn from collected examples
   */
  async learn(): Promise<boolean> {
    if (!this.state.enabled || this.state.examples.length === 0) {
      workspaceService.log('Cannot learn: System disabled or no examples');
      return false;
    }
    
    try {
      const activeModel = this.getActiveModel();
      
      if (!activeModel) {
        workspaceService.log('Cannot learn: No active model');
        return false;
      }
      
      // Simulate learning process
      workspaceService.log(`Starting learning process with model: ${activeModel.name}`);
      
      // Get positive examples
      const positiveExamples = this.state.examples.filter(e => e.feedback === 'positive');
      const totalExamples = this.state.examples.length;
      
      // Update model performance (simulate improvement)
      const oldAccuracy = activeModel.performance.accuracy;
      
      // Calculate new accuracy based on positive examples ratio
      const positiveRatio = positiveExamples.length / Math.max(1, totalExamples);
      const improvement = Math.min(0.05, positiveRatio * 0.1); // Cap improvement at 5%
      
      activeModel.performance.accuracy = Math.min(0.99, oldAccuracy + improvement);
      activeModel.performance.iterations += 1;
      activeModel.performance.lastImprovement = Date.now();
      activeModel.updatedAt = Date.now();
      
      // Update improvement rate
      this.state.stats.improvementRate = improvement * 100;
      this.state.stats.lastLearnedAt = Date.now();
      
      // Save model updates
      workspaceService.writeFile(`${this.modelsPath}/${activeModel.id}.json`, JSON.stringify(activeModel, null, 2));
      
      // Record learning session
      const learningLog = {
        timestamp: Date.now(),
        modelId: activeModel.id,
        examples: totalExamples,
        positiveExamples: positiveExamples.length,
        oldAccuracy,
        newAccuracy: activeModel.performance.accuracy,
        improvement
      };
      
      workspaceService.writeFile(`${this.dataPath}/learning_session_${Date.now()}.json`, JSON.stringify(learningLog, null, 2));
      
      workspaceService.log(`Learning complete. Accuracy improved from ${oldAccuracy.toFixed(4)} to ${activeModel.performance.accuracy.toFixed(4)}`);
      
      this.saveState();
      return true;
    } catch (error) {
      console.error('Error during learning:', error);
      workspaceService.log(`Learning error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Get active learning model
   */
  getActiveModel(): LearningModel | null {
    if (!this.state.activeModelId) return null;
    return this.state.models.find(m => m.id === this.state.activeModelId) || null;
  }
  
  /**
   * Set active learning model
   */
  setActiveModel(modelId: string): boolean {
    const model = this.state.models.find(m => m.id === modelId);
    
    if (!model) {
      workspaceService.log(`Model not found: ${modelId}`);
      return false;
    }
    
    this.state.activeModelId = modelId;
    workspaceService.log(`Active model set to: ${model.name}`);
    this.saveState();
    
    return true;
  }
  
  /**
   * Create a new learning model
   */
  createModel(name: string, description: string, parameters: Record<string, any>): string {
    const newModel: LearningModel = {
      id: 'model-' + Date.now().toString(36),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      parameters,
      performance: {
        accuracy: 0,
        iterations: 0,
        lastImprovement: Date.now()
      }
    };
    
    this.state.models.push(newModel);
    
    // Save model definition
    workspaceService.writeFile(`${this.modelsPath}/${newModel.id}.json`, JSON.stringify(newModel, null, 2));
    
    workspaceService.log(`Created new learning model: ${name} (${newModel.id})`);
    this.saveState();
    
    return newModel.id;
  }
  
  /**
   * Get all learning models
   */
  getModels(): LearningModel[] {
    return [...this.state.models];
  }
  
  /**
   * Get learning examples filtered by tags or feedback
   */
  getExamples(filter?: { tags?: string[], feedback?: 'positive' | 'negative' | 'neutral' }): LearningExample[] {
    if (!filter) {
      return [...this.state.examples];
    }
    
    return this.state.examples.filter(example => {
      const tagMatch = filter.tags ? filter.tags.some(tag => example.tags.includes(tag)) : true;
      const feedbackMatch = filter.feedback ? example.feedback === filter.feedback : true;
      return tagMatch && feedbackMatch;
    });
  }
  
  /**
   * Get learning statistics
   */
  getStats(): LearningState['stats'] {
    return { ...this.state.stats };
  }
  
  /**
   * Check if learning is enabled
   */
  isEnabled(): boolean {
    return this.state.enabled;
  }
}

export const learningService = new LearningService();
