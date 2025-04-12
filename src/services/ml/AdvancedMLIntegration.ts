/**
 * Advanced ML Integration
 * 
 * Integrates Energy-Based Models, Open-Environment Learning, and Meta-Learning
 * with the qux-95-genesis-core system's NLP processor and autonomous workflows.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { energyBasedModelService } from './EnergyBasedModel';
import { openEnvironmentLearningService } from './OpenEnvironmentLearning';
import { metaLearningService } from './MetaLearning';
import { vectorEmbeddingService } from '../memory/VectorEmbeddingService';
import { ollamaService } from '../ollama/OllamaService';
import { workspaceService } from '../workspaceService';

/**
 * Configuration for Advanced ML Integration
 */
export interface AdvancedMLConfig {
  // Feature flags
  enableEnergyBasedModels: boolean;
  enableOpenEnvironmentLearning: boolean;
  enableMetaLearning: boolean;
  
  // Integration settings
  confidenceThreshold: number;
  adaptationFrequency: number;
  feedbackIntegration: boolean;
  
  // Resource constraints
  maxModelCount: number;
  minResourceAvailability: number;
  
  // Specific configurations for each component
  ebmConfig: {
    primaryModelName: string;
    defaultEnergyType: 'quadratic' | 'neural' | 'exponential' | 'hybrid';
  };
  
  oelConfig: {
    environmentMonitoringInterval: number;
    adaptToDataDrift: boolean;
  };
  
  metaConfig: {
    defaultTaskDomain: string;
    transferLearningEnabled: boolean;
  };
}

/**
 * Context for advanced ML inference
 */
export interface MLInferenceContext {
  id: string;
  timestamp: number;
  source: string;
  features: Record<string, any>;
  domainContext?: string;
  previousResults?: any[];
  confidenceRequired?: number;
}

/**
 * Result of advanced ML inference
 */
export interface MLInferenceResult {
  contextId: string;
  result: any;
  confidence: number;
  uncertainty: number;
  adaptationsApplied: string[];
  modelUsed: string;
  inferenceTime: number;
  noveltyDetected: boolean;
}

/**
 * Advanced ML system that integrates Energy-Based Models, Open-Environment Learning,
 * and Meta-Learning capabilities into the core system
 */
export class AdvancedMLIntegration extends EventEmitter {
  private static instance: AdvancedMLIntegration;
  private config: AdvancedMLConfig;
  private modelRegistry: Map<string, {
    type: 'ebm' | 'oel' | 'meta';
    id: string;
    name: string;
    domain: string;
    lastUsed: number;
    useCount: number;
  }> = new Map();
  
  private feedbackHistory: Array<{
    contextId: string;
    resultId: string;
    score: number;
    timestamp: number;
    comments?: string;
  }> = [];
  
  private constructor() {
    super();
    
    // Default configuration
    this.config = {
      enableEnergyBasedModels: true,
      enableOpenEnvironmentLearning: true,
      enableMetaLearning: true,
      
      confidenceThreshold: 0.7,
      adaptationFrequency: 0.2, // Adapt 20% of the time
      feedbackIntegration: true,
      
      maxModelCount: 10,
      minResourceAvailability: 0.3,
      
      ebmConfig: {
        primaryModelName: 'primary_ebm',
        defaultEnergyType: 'hybrid'
      },
      
      oelConfig: {
        environmentMonitoringInterval: 3600000, // 1 hour
        adaptToDataDrift: true
      },
      
      metaConfig: {
        defaultTaskDomain: 'general',
        transferLearningEnabled: true
      }
    };
    
    this.initializeComponents();
    this.setupEventListeners();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AdvancedMLIntegration {
    if (!AdvancedMLIntegration.instance) {
      AdvancedMLIntegration.instance = new AdvancedMLIntegration();
    }
    return AdvancedMLIntegration.instance;
  }
  
  /**
   * Initialize advanced ML components
   */
  private initializeComponents(): void {
    // Initialize Energy-Based Models
    if (this.config.enableEnergyBasedModels) {
      const primaryEbm = energyBasedModelService.createModel(
        this.config.ebmConfig.primaryModelName,
        {
          energyType: this.config.ebmConfig.defaultEnergyType,
          hiddenLayers: [128, 64, 32],
          adaptationRate: 0.15
        }
      );
      
      this.registerModel('ebm', primaryEbm.getId(), primaryEbm.getName(), 'general');
    }
    
    // Initialize Open-Environment Learning
    if (this.config.enableOpenEnvironmentLearning) {
      const oel = openEnvironmentLearningService.createModel('primary_oel', {
        featureAdaptationRate: 0.1,
        conceptDriftThreshold: 0.2,
        environmentSamplingRate: 0.1
      });
      
      this.registerModel('oel', oel.exportModel().modelId, 'primary_oel', 'general');
    }
    
    // Initialize Meta-Learning
    if (this.config.enableMetaLearning) {
      const meta = metaLearningService.createModel('primary_meta', {
        embeddingDimension: 128,
        metricType: 'adaptive',
        taskSimilarityThreshold: 0.65
      });
      
      this.registerModel('meta', meta.exportModel().modelId, 'primary_meta', 'general');
    }
  }
  
  /**
   * Set up event listeners for component integration
   */
  private setupEventListeners(): void {
    // Listen for environment changes from Open-Environment Learning
    if (this.config.enableOpenEnvironmentLearning) {
      // Periodically check for environment changes
      setInterval(() => {
        this.monitorEnvironment();
      }, this.config.oelConfig.environmentMonitoringInterval);
    }
    
    // Forward relevant events
    this.on('modelAdaptation', (details) => {
      console.log(`Advanced ML: Model adaptation - ${JSON.stringify(details)}`);
    });
    
    this.on('noveltyDetected', (details) => {
      console.log(`Advanced ML: Novelty detected - ${JSON.stringify(details)}`);
    });
  }
  
  /**
   * Register a model in the integration layer
   */
  private registerModel(
    type: 'ebm' | 'oel' | 'meta',
    id: string,
    name: string,
    domain: string
  ): void {
    this.modelRegistry.set(id, {
      type,
      id,
      name,
      domain,
      lastUsed: Date.now(),
      useCount: 0
    });
    
    console.log(`Advanced ML: Registered ${type} model "${name}" for domain "${domain}"`);
  }
  
  /**
   * Monitor the environment for changes using OEL capabilities
   */
  private async monitorEnvironment(): Promise<void> {
    if (!this.config.enableOpenEnvironmentLearning) return;
    
    try {
      // Get all OEL models
      const oelModels = Array.from(this.modelRegistry.values())
        .filter(model => model.type === 'oel')
        .map(model => openEnvironmentLearningService.getModel(model.id))
        .filter(model => model !== undefined) as any[];
      
      if (oelModels.length === 0) return;
      
      // Check each model for environmental changes
      for (const model of oelModels) {
        const trends = model.getPerformanceTrend();
        
        // Check for significant performance drop
        const recentAccuracy = trends.accuracy.slice(-3);
        if (recentAccuracy.length >= 3) {
          const avgRecent = recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length;
          const previousAccuracy = trends.accuracy.slice(-6, -3);
          
          if (previousAccuracy.length >= 3) {
            const avgPrevious = previousAccuracy.reduce((a, b) => a + b, 0) / previousAccuracy.length;
            
            // If significant drop, trigger adaptation
            if (avgRecent < avgPrevious * 0.8) {
              console.log(`Advanced ML: Detected performance drop in ${model.exportModel().modelName}`);
              
              // Optimize the model
              const result = await model.optimize();
              
              this.emit('modelAdaptation', {
                modelType: 'oel',
                modelName: model.exportModel().modelName,
                adaptationType: 'performance_drop_response',
                improvement: result.performanceAfter - result.performanceBefore
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error monitoring environment:', error);
    }
  }
  
  /**
   * Run inference using the appropriate advanced ML technique
   */
  public async runInference(
    context: MLInferenceContext
  ): Promise<MLInferenceResult> {
    const startTime = Date.now();
    
    // Determine which approach to use based on context
    const approach = this.selectInferenceApproach(context);
    let result: any = null;
    let confidence = 0;
    let uncertainty = 0.5;
    let noveltyDetected = false;
    let adaptationsApplied: string[] = [];
    
    try {
      switch (approach.type) {
        case 'ebm':
          ({ result, confidence, uncertainty, noveltyDetected, adaptationsApplied } = 
            await this.runEBMInference(context, approach.modelId));
          break;
          
        case 'oel':
          ({ result, confidence, uncertainty, noveltyDetected, adaptationsApplied } = 
            await this.runOELInference(context, approach.modelId));
          break;
          
        case 'meta':
          ({ result, confidence, uncertainty, noveltyDetected, adaptationsApplied } = 
            await this.runMetaLearningInference(context, approach.modelId));
          break;
      }
      
      // Update model usage statistics
      const modelInfo = this.modelRegistry.get(approach.modelId);
      if (modelInfo) {
        modelInfo.lastUsed = Date.now();
        modelInfo.useCount += 1;
      }
      
      // Log novelty if detected
      if (noveltyDetected) {
        this.emit('noveltyDetected', {
          contextId: context.id,
          source: context.source,
          domain: context.domainContext || 'general',
          timestamp: Date.now()
        });
      }
      
      // If confidence is too low, try to adapt
      if (confidence < (context.confidenceRequired || this.config.confidenceThreshold)) {
        const shouldAdapt = Math.random() < this.config.adaptationFrequency;
        
        if (shouldAdapt) {
          const adaptationResult = await this.adaptToLowConfidence(
            context, approach, result, confidence
          );
          
          if (adaptationResult.improved) {
            result = adaptationResult.newResult;
            confidence = adaptationResult.newConfidence;
            adaptationsApplied.push(...adaptationResult.adaptationsApplied);
          }
        }
      }
      
      // Return the final result
      return {
        contextId: context.id,
        result,
        confidence,
        uncertainty,
        adaptationsApplied,
        modelUsed: approach.modelId,
        inferenceTime: Date.now() - startTime,
        noveltyDetected
      };
    } catch (error) {
      console.error('Error during advanced ML inference:', error);
      
      // Return a fallback result
      return {
        contextId: context.id,
        result: null,
        confidence: 0,
        uncertainty: 1.0,
        adaptationsApplied: ['error_fallback'],
        modelUsed: approach.modelId,
        inferenceTime: Date.now() - startTime,
        noveltyDetected: false
      };
    }
  }
  
  /**
   * Select the appropriate inference approach based on context
   */
  private selectInferenceApproach(
    context: MLInferenceContext
  ): {
    type: 'ebm' | 'oel' | 'meta';
    modelId: string;
  } {
    // Default approach
    let approach: {
      type: 'ebm' | 'oel' | 'meta';
      modelId: string;
    } = {
      type: 'ebm',
      modelId: ''
    };
    
    // Get domain-appropriate models
    const domain = context.domainContext || 'general';
    const domainModels = Array.from(this.modelRegistry.values())
      .filter(model => model.domain === domain || model.domain === 'general');
    
    if (domainModels.length === 0) {
      // Fallback to any model
      const anyModel = Array.from(this.modelRegistry.values())[0];
      if (anyModel) {
        approach.type = anyModel.type;
        approach.modelId = anyModel.id;
      } else {
        throw new Error('No models available for inference');
      }
    } else {
      // Heuristics for approach selection
      const hasHistory = context.previousResults && context.previousResults.length > 0;
      const featureCount = Object.keys(context.features).length;
      const requiresConfidence = (context.confidenceRequired || 0) > 0.8;
      
      if (requiresConfidence && this.config.enableEnergyBasedModels) {
        // High confidence needs -> EBM for uncertainty quantification
        const ebmModels = domainModels.filter(model => model.type === 'ebm');
        if (ebmModels.length > 0) {
          approach.type = 'ebm';
          approach.modelId = ebmModels[0].id;
        }
      } else if (hasHistory && this.config.enableOpenEnvironmentLearning) {
        // Has history -> OEL for adapting to changes
        const oelModels = domainModels.filter(model => model.type === 'oel');
        if (oelModels.length > 0) {
          approach.type = 'oel';
          approach.modelId = oelModels[0].id;
        }
      } else if (featureCount < 10 && this.config.enableMetaLearning) {
        // Few features -> Meta-learning for few-shot learning
        const metaModels = domainModels.filter(model => model.type === 'meta');
        if (metaModels.length > 0) {
          approach.type = 'meta';
          approach.modelId = metaModels[0].id;
        }
      } else {
        // Default: use the most recently used model
        domainModels.sort((a, b) => b.lastUsed - a.lastUsed);
        approach.type = domainModels[0].type;
        approach.modelId = domainModels[0].id;
      }
    }
    
    return approach;
  }
  
  /**
   * Run inference using Energy-Based Models
   */
  private async runEBMInference(
    context: MLInferenceContext,
    modelId: string
  ): Promise<{
    result: any;
    confidence: number;
    uncertainty: number;
    noveltyDetected: boolean;
    adaptationsApplied: string[];
  }> {
    if (!this.config.enableEnergyBasedModels) {
      throw new Error('Energy-Based Models are disabled');
    }
    
    const model = energyBasedModelService.getModel(modelId);
    if (!model) {
      throw new Error(`EBM model ${modelId} not found`);
    }
    
    // Convert features to vector format
    const featureArray = this.convertFeaturesToArray(context.features);
    
    // Create EBM sample
    const sample = {
      id: uuidv4(),
      features: featureArray
    };
    
    // Run inference
    const inferenceResults = model.inference([sample]);
    if (inferenceResults.length === 0) {
      throw new Error('EBM inference failed to return results');
    }
    
    const inferenceResult = inferenceResults[0];
    
    // Convert energy to result (probability can be used as score)
    const result = {
      prediction: inferenceResult.energy < 0.5 ? 'positive' : 'negative',
      score: inferenceResult.probability,
      entropy: inferenceResult.entropy
    };
    
    return {
      result,
      confidence: inferenceResult.confidenceScore,
      uncertainty: inferenceResult.entropy,
      noveltyDetected: inferenceResult.isOutOfDistribution,
      adaptationsApplied: []
    };
  }
  
  /**
   * Run inference using Open-Environment Learning
   */
  private async runOELInference(
    context: MLInferenceContext,
    modelId: string
  ): Promise<{
    result: any;
    confidence: number;
    uncertainty: number;
    noveltyDetected: boolean;
    adaptationsApplied: string[];
  }> {
    if (!this.config.enableOpenEnvironmentLearning) {
      throw new Error('Open-Environment Learning is disabled');
    }
    
    const model = openEnvironmentLearningService.getModel(modelId);
    if (!model) {
      throw new Error(`OEL model ${modelId} not found`);
    }
    
    // Run prediction
    const predictions = await model.predict(
      [context.features],
      {
        detectNovelty: true,
        returnConfidence: true
      }
    );
    
    if (predictions.length === 0) {
      throw new Error('OEL prediction failed to return results');
    }
    
    const prediction = predictions[0];
    
    return {
      result: {
        prediction: prediction.prediction,
        score: prediction.confidence
      },
      confidence: prediction.confidence || 0.5,
      uncertainty: 1 - (prediction.confidence || 0.5),
      noveltyDetected: prediction.isNovel || false,
      adaptationsApplied: []
    };
  }
  
  /**
   * Run inference using Meta-Learning
   */
  private async runMetaLearningInference(
    context: MLInferenceContext,
    modelId: string
  ): Promise<{
    result: any;
    confidence: number;
    uncertainty: number;
    noveltyDetected: boolean;
    adaptationsApplied: string[];
  }> {
    if (!this.config.enableMetaLearning) {
      throw new Error('Meta-Learning is disabled');
    }
    
    const model = metaLearningService.getModel(modelId);
    if (!model) {
      throw new Error(`Meta-Learning model ${modelId} not found`);
    }
    
    // Convert features to array
    const featureArray = this.convertFeaturesToArray(context.features);
    
    // Create a sample for meta-learning
    const sample = {
      id: uuidv4(),
      features: featureArray,
      label: 'unknown' // For inference, label is unknown
    };
    
    // Get list of tasks for this model
    const tasks = model.getTasks();
    let taskId = undefined;
    
    // Find a relevant task if available
    if (context.domainContext && tasks.length > 0) {
      const domainTasks = tasks.filter(task => task.domain === context.domainContext);
      if (domainTasks.length > 0) {
        // Use most recent task in the domain
        domainTasks.sort((a, b) => b.created - a.created);
        taskId = domainTasks[0].id;
      }
    }
    
    // Run prediction
    const predictions = await model.predict([sample], taskId);
    
    if (predictions.length === 0) {
      throw new Error('Meta-Learning prediction failed to return results');
    }
    
    const prediction = predictions[0];
    
    return {
      result: {
        prediction: prediction.label,
        score: prediction.confidence
      },
      confidence: prediction.confidence,
      uncertainty: 1 - prediction.confidence,
      noveltyDetected: prediction.isNovel,
      adaptationsApplied: []
    };
  }
  
  /**
   * Convert feature object to feature array for models
   */
  private convertFeaturesToArray(features: Record<string, any>): number[] {
    const featureArray: number[] = [];
    
    // Process each feature based on type
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'number') {
        // Numeric features can be used directly
        featureArray.push(value);
      } else if (typeof value === 'boolean') {
        // Boolean features become 0 or 1
        featureArray.push(value ? 1 : 0);
      } else if (typeof value === 'string') {
        // For string features, we'll just use length as a simple feature
        // In a real implementation, we'd use proper embeddings
        featureArray.push(value.length);
      }
    }
    
    return featureArray;
  }
  
  /**
   * Adapt to low confidence by applying advanced techniques
   */
  private async adaptToLowConfidence(
    context: MLInferenceContext,
    approach: { type: 'ebm' | 'oel' | 'meta'; modelId: string },
    initialResult: any,
    initialConfidence: number
  ): Promise<{
    improved: boolean;
    newResult: any;
    newConfidence: number;
    adaptationsApplied: string[];
  }> {
    const adaptationsApplied: string[] = [];
    let improved = false;
    let newResult = initialResult;
    let newConfidence = initialConfidence;
    
    switch (approach.type) {
      case 'ebm':
        // For EBM, try using a more complex energy function
        const ebmModel = energyBasedModelService.getModel(approach.modelId);
        if (ebmModel) {
          const currentConfig = ebmModel.getConfig();
          
          // Try a different energy type if current one isn't working well
          if (currentConfig.energyType !== 'hybrid') {
            ebmModel.updateConfig({ energyType: 'hybrid' });
            adaptationsApplied.push('switched_to_hybrid_energy');
            
            // Re-run inference
            const result = await this.runEBMInference(context, approach.modelId);
            newResult = result.result;
            newConfidence = result.confidence;
            improved = newConfidence > initialConfidence;
            
            // Restore original config if not improved
            if (!improved) {
              ebmModel.updateConfig({ energyType: currentConfig.energyType });
            }
          }
        }
        break;
        
      case 'oel':
        // For OEL, try processing the sample as new environment data
        const oelModel = openEnvironmentLearningService.getModel(approach.modelId);
        if (oelModel) {
          // Create a dynamic data point for adaptation
          const timestamp = Date.now();
          const dynamicPoint = {
            id: uuidv4(),
            features: context.features,
            timestamp
          };
          
          // Process as new data without updating model initially
          await oelModel.processNewData([dynamicPoint], { updateModel: false });
          adaptationsApplied.push('analyzed_as_new_environment');
          
          // Re-run prediction
          const result = await this.runOELInference(context, approach.modelId);
          newResult = result.result;
          newConfidence = result.confidence;
          improved = newConfidence > initialConfidence;
        }
        break;
        
      case 'meta':
        // For Meta-Learning, try finding similar tasks
        const metaModel = metaLearningService.getModel(approach.modelId);
        if (metaModel) {
          // Use task domain if available
          const domain = context.domainContext || this.config.metaConfig.defaultTaskDomain;
          
          // Convert features to array
          const featureArray = this.convertFeaturesToArray(context.features);
          
          // Create a temporary support set with the current sample
          const supportSample = {
            id: uuidv4(),
            features: featureArray,
            label: 'unknown'
          };
          
          // Try adaptation with similar tasks
          try {
            const adaptResult = await metaModel.adaptToTask(
              [supportSample],
              {
                domain,
                adaptationSteps: 3,
                useSimilarTasks: true
              }
            );
            
            adaptationsApplied.push('meta_adaptation_with_similar_tasks');
            
            // Re-run prediction
            const result = await this.runMetaLearningInference(context, approach.modelId);
            newResult = result.result;
            newConfidence = result.confidence;
            improved = newConfidence > initialConfidence;
          } catch (error) {
            console.error('Error during meta-learning adaptation:', error);
          }
        }
        break;
    }
    
    return {
      improved,
      newResult,
      newConfidence,
      adaptationsApplied
    };
  }
  
  /**
   * Process user feedback to improve models
   */
  public async processFeedback(
    contextId: string,
    resultId: string,
    score: number,
    comments?: string
  ): Promise<boolean> {
    if (!this.config.feedbackIntegration) {
      return false;
    }
    
    // Record feedback
    this.feedbackHistory.push({
      contextId,
      resultId,
      score,
      timestamp: Date.now(),
      comments
    });
    
    // Keep feedback history manageable
    if (this.feedbackHistory.length > 1000) {
      this.feedbackHistory = this.feedbackHistory.slice(-1000);
    }
    
    // TODO: Apply feedback to models
    // This would be implemented in a real system to update model weights
    
    return true;
  }
  
  /**
   * Create a domain-specific specialized model
   */
  public async createSpecializedModel(
    modelType: 'ebm' | 'oel' | 'meta',
    domain: string,
    name: string,
    config?: any
  ): Promise<string> {
    let modelId = '';
    
    switch (modelType) {
      case 'ebm':
        if (!this.config.enableEnergyBasedModels) {
          throw new Error('Energy-Based Models are disabled');
        }
        
        const ebm = energyBasedModelService.createModel(name, config);
        modelId = ebm.getId();
        break;
        
      case 'oel':
        if (!this.config.enableOpenEnvironmentLearning) {
          throw new Error('Open-Environment Learning is disabled');
        }
        
        const oel = openEnvironmentLearningService.createModel(name, config);
        modelId = oel.exportModel().modelId;
        break;
        
      case 'meta':
        if (!this.config.enableMetaLearning) {
          throw new Error('Meta-Learning is disabled');
        }
        
        const meta = metaLearningService.createModel(name, config);
        modelId = meta.exportModel().modelId;
        break;
    }
    
    if (modelId) {
      this.registerModel(modelType, modelId, name, domain);
    }
    
    return modelId;
  }
  
  /**
   * Get the configuration
   */
  public getConfig(): AdvancedMLConfig {
    return { ...this.config };
  }
  
  /**
   * Update the configuration
   */
  public updateConfig(config: Partial<AdvancedMLConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reinitialize if necessary
    if (config.enableEnergyBasedModels !== undefined ||
        config.enableOpenEnvironmentLearning !== undefined ||
        config.enableMetaLearning !== undefined) {
      this.initializeComponents();
    }
  }
  
  /**
   * Get status of registered models
   */
  public getModelStatus(): Array<{
    id: string;
    name: string;
    type: string;
    domain: string;
    useCount: number;
    lastUsed: number;
  }> {
    return Array.from(this.modelRegistry.values()).map(model => ({
      id: model.id,
      name: model.name,
      type: model.type,
      domain: model.domain,
      useCount: model.useCount,
      lastUsed: model.lastUsed
    }));
  }
}

// Export singleton instance
export const advancedMLIntegration = AdvancedMLIntegration.getInstance();
