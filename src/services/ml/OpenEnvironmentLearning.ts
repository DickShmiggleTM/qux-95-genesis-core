/**
 * Open-Environment Machine Learning
 * 
 * Handles learning in dynamic environments where data distributions,
 * feature spaces, and tasks evolve over time. This system adapts to
 * changing conditions without requiring complete retraining.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { vectorEmbeddingService } from '../memory/VectorEmbeddingService';
import { energyBasedModelService } from './EnergyBasedModel';

/**
 * Configuration for Open-Environment Learning system
 */
export interface OELConfig {
  // Core system parameters
  featureAdaptationRate: number;
  conceptDriftThreshold: number;
  noveltyDetectionThreshold: number;
  
  // Learning parameters
  incrementalLearningRate: number;
  memoryRetentionFactor: number;
  forgettingRate: number;
  
  // Environment monitoring
  environmentSamplingRate: number;
  anomalyThreshold: number;
  driftDetectionWindowSize: number;
}

/**
 * Environment state representation
 */
export interface EnvironmentState {
  timestamp: number;
  featureDistribution: {
    mean: number[];
    variance: number[];
    skewness?: number[];
    kurtosis?: number[];
  };
  observedClasses: Set<string>;
  driftScore: number;
  stabilityScore: number;
}

/**
 * Data point with potentially evolving features
 */
export interface DynamicDataPoint {
  id: string;
  features: Record<string, number | string>;
  label?: string;
  timestamp: number;
  context?: Record<string, any>;
}

/**
 * Feature evolution tracking
 */
export interface FeatureEvolution {
  featureId: string;
  name: string;
  firstSeen: number;
  lastSeen: number;
  occurrenceCount: number;
  valueDistribution: Record<string, number>;
  statisticalProperties: {
    mean?: number;
    variance?: number;
    drift?: number[];
  };
}

/**
 * Result of incremental learning
 */
export interface IncrementalLearningResult {
  newFeatureCount: number;
  newClassCount: number;
  driftDetected: boolean;
  modelUpdated: boolean;
  performanceMetrics: {
    beforeAccuracy?: number;
    afterAccuracy?: number;
    adaptationTime: number;
  };
}

/**
 * Open Environment Learning system capable of handling
 * evolving data distributions, new features, and new classes
 */
export class OpenEnvironmentLearning extends EventEmitter {
  private modelId: string;
  private modelName: string;
  private config: OELConfig;
  
  // Current knowledge base
  private knownFeatures: Map<string, FeatureEvolution> = new Map();
  private knownClasses: Map<string, {
    firstSeen: number;
    lastSeen: number;
    count: number;
    exemplars: DynamicDataPoint[];
  }> = new Map();
  
  // Environment tracking
  private environmentHistory: EnvironmentState[] = [];
  private currentState: EnvironmentState | null = null;
  
  // Learning components
  private baseClassifier: any = null; // Core classification model
  private noveltyDetector: any = null; // For detecting new classes/outliers
  private featureSelector: any = null; // For handling dynamic feature spaces
  
  // Metrics and monitoring
  private performanceHistory: Array<{
    timestamp: number;
    accuracy: number;
    f1Score: number;
    adaptationSpeed: number;
  }> = [];
  
  /**
   * Create a new Open-Environment Learning system
   */
  constructor(modelName: string, config: Partial<OELConfig> = {}) {
    super();
    this.modelId = uuidv4();
    this.modelName = modelName;
    
    // Default configuration
    this.config = {
      featureAdaptationRate: 0.05,
      conceptDriftThreshold: 0.15,
      noveltyDetectionThreshold: 0.8,
      incrementalLearningRate: 0.1,
      memoryRetentionFactor: 0.95,
      forgettingRate: 0.01,
      environmentSamplingRate: 0.1,
      anomalyThreshold: 3.0,
      driftDetectionWindowSize: 100,
      ...config
    };
    
    // Initialize components
    this.initializeComponents();
  }
  
  /**
   * Initialize system components
   */
  private initializeComponents(): void {
    // Initialize base classifier (simplified)
    this.baseClassifier = {
      features: new Set<string>(),
      classes: new Set<string>(),
      model: null, // Placeholder for actual ML model
      
      // Methods to be implemented
      predict: (sample: any) => ({ class: 'unknown', probability: 0 }),
      update: (samples: any[]) => true
    };
    
    // Initialize novelty detector using Energy-Based Model
    this.noveltyDetector = energyBasedModelService.createModel(
      `${this.modelName}_novelty_detector`,
      {
        energyType: 'hybrid',
        hiddenLayers: [32, 16],
        adaptationRate: 0.2
      }
    );
    
    // Initialize feature selector (simplified)
    this.featureSelector = {
      selectedFeatures: new Set<string>(),
      featureScores: new Map<string, number>(),
      
      // Methods to be implemented
      selectFeatures: (features: Record<string, any>[]) => new Set<string>(),
      updateScores: (features: Record<string, any>[], targets: any[]) => true
    };
    
    // Initialize current state with defaults
    this.currentState = {
      timestamp: Date.now(),
      featureDistribution: {
        mean: [],
        variance: []
      },
      observedClasses: new Set<string>(),
      driftScore: 0,
      stabilityScore: 1.0
    };
  }
  
  /**
   * Process new data in an open environment
   */
  public async processNewData(
    data: DynamicDataPoint[],
    options: {
      updateModel?: boolean;
      detectDrift?: boolean;
      adaptFeatures?: boolean;
    } = {}
  ): Promise<IncrementalLearningResult> {
    const startTime = Date.now();
    const result: IncrementalLearningResult = {
      newFeatureCount: 0,
      newClassCount: 0,
      driftDetected: false,
      modelUpdated: false,
      performanceMetrics: {
        adaptationTime: 0
      }
    };
    
    if (data.length === 0) {
      return result;
    }
    
    // 1. Monitor environment and detect changes
    if (options.detectDrift !== false) {
      const driftInfo = this.detectEnvironmentChanges(data);
      result.driftDetected = driftInfo.driftDetected;
      
      // Log significant changes
      if (driftInfo.driftDetected) {
        console.log(`OEL: Detected environment drift (score=${driftInfo.driftScore.toFixed(3)})`);
        this.emit('environmentDrift', driftInfo);
      }
    }
    
    // 2. Detect and process new features
    if (options.adaptFeatures !== false) {
      const featureInfo = this.processNewFeatures(data);
      result.newFeatureCount = featureInfo.newFeatures.length;
      
      // Log new features
      if (featureInfo.newFeatures.length > 0) {
        console.log(`OEL: Discovered ${featureInfo.newFeatures.length} new features`);
        this.emit('newFeatures', featureInfo);
      }
    }
    
    // 3. Identify new classes
    const classInfo = this.identifyNewClasses(data);
    result.newClassCount = classInfo.newClasses.length;
    
    // Log new classes
    if (classInfo.newClasses.length > 0) {
      console.log(`OEL: Discovered ${classInfo.newClasses.length} new classes`);
      this.emit('newClasses', classInfo);
    }
    
    // 4. Update model if needed
    if (options.updateModel !== false && 
        (result.driftDetected || result.newFeatureCount > 0 || result.newClassCount > 0)) {
      // Measure current performance before update
      result.performanceMetrics.beforeAccuracy = await this.evaluatePerformance(data);
      
      // Update the model
      const updateSuccess = await this.updateModel(data);
      result.modelUpdated = updateSuccess;
      
      // Measure performance after update
      result.performanceMetrics.afterAccuracy = await this.evaluatePerformance(data);
    }
    
    // Calculate adaptation time
    result.performanceMetrics.adaptationTime = Date.now() - startTime;
    
    // Record performance metrics
    this.recordPerformance(result);
    
    return result;
  }
  
  /**
   * Detect changes in the data environment
   */
  private detectEnvironmentChanges(data: DynamicDataPoint[]): {
    driftDetected: boolean;
    driftScore: number;
    driftType: 'gradual' | 'sudden' | 'recurring' | 'none';
    affectedFeatures: string[];
  } {
    // Extract numeric features for statistical analysis
    const numericFeatures: Record<string, number[]> = {};
    
    for (const point of data) {
      for (const [key, value] of Object.entries(point.features)) {
        if (typeof value === 'number') {
          if (!numericFeatures[key]) {
            numericFeatures[key] = [];
          }
          numericFeatures[key].push(value);
        }
      }
    }
    
    // Calculate new distribution statistics
    const newDistribution: {
      mean: number[];
      variance: number[];
      featureNames: string[];
    } = {
      mean: [],
      variance: [],
      featureNames: []
    };
    
    const affectedFeatures: string[] = [];
    
    for (const [feature, values] of Object.entries(numericFeatures)) {
      // Calculate mean
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      // Calculate variance
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      
      newDistribution.featureNames.push(feature);
      newDistribution.mean.push(mean);
      newDistribution.variance.push(variance);
      
      // Check if we have a previous distribution to compare
      if (this.currentState && this.currentState.featureDistribution.mean.length > 0) {
        const featureIndex = this.currentState.featureDistribution.mean.findIndex(
          (_, idx) => idx === featureIndex
        );
        
        if (featureIndex >= 0) {
          const prevMean = this.currentState.featureDistribution.mean[featureIndex];
          const prevVar = this.currentState.featureDistribution.variance[featureIndex];
          
          // Calculate normalized difference
          const meanDiff = Math.abs(mean - prevMean) / Math.sqrt(prevVar + 1e-6);
          
          // If difference exceeds threshold, mark feature as affected
          if (meanDiff > this.config.conceptDriftThreshold) {
            affectedFeatures.push(feature);
          }
        }
      }
    }
    
    // Calculate overall drift score
    let driftScore = 0;
    if (affectedFeatures.length > 0) {
      driftScore = affectedFeatures.length / Object.keys(numericFeatures).length;
    }
    
    // Determine drift type
    let driftType: 'gradual' | 'sudden' | 'recurring' | 'none' = 'none';
    
    if (driftScore > 0) {
      // Check history to determine drift type
      if (this.environmentHistory.length >= 2) {
        const recentHistory = this.environmentHistory.slice(-5);
        const driftTrend = recentHistory.map(state => state.driftScore);
        
        // If drift has been increasing steadily
        const isGradual = driftTrend.every((val, idx, arr) => 
          idx === 0 || val >= arr[idx - 1] * 0.8
        );
        
        // If drift suddenly appeared
        const isSudden = driftScore > 0.3 && 
          recentHistory[recentHistory.length - 1].driftScore < 0.1;
        
        // If drift pattern has appeared before
        const hasSimilarState = this.environmentHistory
          .slice(0, -5)
          .some(state => Math.abs(state.driftScore - driftScore) < 0.1);
        
        if (isGradual) driftType = 'gradual';
        else if (isSudden) driftType = 'sudden';
        else if (hasSimilarState) driftType = 'recurring';
      } else {
        driftType = 'sudden'; // Default for first drift
      }
    }
    
    // Update current state
    const newState: EnvironmentState = {
      timestamp: Date.now(),
      featureDistribution: {
        mean: newDistribution.mean,
        variance: newDistribution.variance
      },
      observedClasses: new Set([...data].filter(p => p.label).map(p => p.label!) as string[]),
      driftScore,
      stabilityScore: 1.0 - driftScore
    };
    
    // Save to history
    this.currentState = newState;
    this.environmentHistory.push(newState);
    
    // Trim history if too long
    if (this.environmentHistory.length > 50) {
      this.environmentHistory = this.environmentHistory.slice(-50);
    }
    
    return {
      driftDetected: driftScore > this.config.conceptDriftThreshold,
      driftScore,
      driftType,
      affectedFeatures
    };
  }
  
  /**
   * Process and adapt to new features in the data
   */
  private processNewFeatures(data: DynamicDataPoint[]): {
    newFeatures: string[];
    updatedFeatures: string[];
    featureImportance: Record<string, number>;
  } {
    const newFeatures: string[] = [];
    const updatedFeatures: string[] = [];
    const featureImportance: Record<string, number> = {};
    
    // Extract all feature names present in the data
    const presentFeatures = new Set<string>();
    for (const point of data) {
      for (const featureName of Object.keys(point.features)) {
        presentFeatures.add(featureName);
      }
    }
    
    // Check for new features
    for (const featureName of presentFeatures) {
      if (!this.knownFeatures.has(featureName)) {
        // Add new feature
        const newFeature: FeatureEvolution = {
          featureId: uuidv4(),
          name: featureName,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          occurrenceCount: 1,
          valueDistribution: {},
          statisticalProperties: {}
        };
        
        this.knownFeatures.set(featureName, newFeature);
        newFeatures.push(featureName);
        
        // Default importance for new feature
        featureImportance[featureName] = 0.5;
      } else {
        // Update existing feature
        const feature = this.knownFeatures.get(featureName)!;
        feature.lastSeen = Date.now();
        feature.occurrenceCount += 1;
        updatedFeatures.push(featureName);
      }
    }
    
    // Calculate feature statistics and distributions
    for (const feature of [...newFeatures, ...updatedFeatures]) {
      const values = data
        .map(point => point.features[feature])
        .filter(val => val !== undefined);
      
      // Calculate value distribution
      const valueDistribution: Record<string, number> = {};
      for (const value of values) {
        const key = String(value);
        valueDistribution[key] = (valueDistribution[key] || 0) + 1;
      }
      
      // Update feature information
      const featureInfo = this.knownFeatures.get(feature)!;
      featureInfo.valueDistribution = valueDistribution;
      
      // Calculate statistical properties for numeric features
      const numericValues = values
        .filter(val => typeof val === 'number')
        .map(val => val as number);
      
      if (numericValues.length > 0) {
        const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
        
        featureInfo.statisticalProperties = {
          mean,
          variance,
          drift: featureInfo.statisticalProperties.drift || []
        };
        
        // Track drift if we have previous statistics
        if (featureInfo.statisticalProperties.drift) {
          const prevMean = featureInfo.statisticalProperties.drift.length > 0
            ? featureInfo.statisticalProperties.drift[featureInfo.statisticalProperties.drift.length - 1]
            : mean;
          
          featureInfo.statisticalProperties.drift.push(mean - prevMean);
          
          // Keep drift history limited
          if (featureInfo.statisticalProperties.drift.length > 10) {
            featureInfo.statisticalProperties.drift = featureInfo.statisticalProperties.drift.slice(-10);
          }
        }
      }
      
      // Calculate feature importance (simplified)
      if (updatedFeatures.includes(feature)) {
        // For existing features, use occurrence frequency as a proxy for importance
        featureImportance[feature] = Math.min(0.9, featureInfo.occurrenceCount / 100);
      }
    }
    
    // Update base classifier's feature set
    if (this.baseClassifier) {
      for (const feature of [...newFeatures, ...updatedFeatures]) {
        this.baseClassifier.features.add(feature);
      }
    }
    
    return {
      newFeatures,
      updatedFeatures,
      featureImportance
    };
  }
  
  /**
   * Identify new classes in the data
   */
  private identifyNewClasses(data: DynamicDataPoint[]): {
    newClasses: string[];
    updatedClasses: string[];
    classCounts: Record<string, number>;
  } {
    const newClasses: string[] = [];
    const updatedClasses: string[] = [];
    const classCounts: Record<string, number> = {};
    
    // Extract all classes with counts
    for (const point of data) {
      if (point.label) {
        classCounts[point.label] = (classCounts[point.label] || 0) + 1;
      }
    }
    
    // Process each class
    for (const [className, count] of Object.entries(classCounts)) {
      if (!this.knownClasses.has(className)) {
        // New class discovered
        this.knownClasses.set(className, {
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          count,
          exemplars: data.filter(p => p.label === className).slice(0, 5) // Store a few examples
        });
        
        newClasses.push(className);
        
        // Update base classifier
        if (this.baseClassifier) {
          this.baseClassifier.classes.add(className);
        }
      } else {
        // Update existing class
        const classInfo = this.knownClasses.get(className)!;
        classInfo.lastSeen = Date.now();
        classInfo.count += count;
        
        // Update exemplars with newer examples
        const newExemplars = data.filter(p => p.label === className).slice(0, 2);
        if (newExemplars.length > 0) {
          classInfo.exemplars = [...classInfo.exemplars, ...newExemplars]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);
        }
        
        updatedClasses.push(className);
      }
    }
    
    return {
      newClasses,
      updatedClasses,
      classCounts
    };
  }
  
  /**
   * Update the model to adapt to environmental changes
   */
  private async updateModel(data: DynamicDataPoint[]): Promise<boolean> {
    // In a real implementation, this would update the underlying ML model
    // Here we simulate the update process
    
    try {
      // 1. Convert dynamic data points to format expected by model
      const samples = data.map(point => ({
        features: Object.entries(point.features)
          .filter(([key]) => this.knownFeatures.has(key))
          .map(([key, value]) => typeof value === 'number' ? value : 0),
        label: point.label,
        weight: 1.0
      }));
      
      // 2. Update novelty detector first
      const noveltyData = samples.map((sample, idx) => ({
        id: uuidv4(),
        features: sample.features,
        label: sample.label,
        weight: sample.weight
      }));
      
      if (noveltyData.length > 0) {
        await this.noveltyDetector.train(noveltyData);
      }
      
      // 3. Update base classifier (simplified)
      this.baseClassifier.update(samples);
      
      // 4. Apply incremental forgetting to older data
      // In a real implementation, this would adjust the model to forget
      // older patterns at a controlled rate
      
      console.log(`OEL: Updated model with ${data.length} samples`);
      return true;
    } catch (error) {
      console.error('Error updating open environment model:', error);
      return false;
    }
  }
  
  /**
   * Make predictions on new data
   */
  public async predict(
    data: Record<string, any>[],
    options: {
      detectNovelty?: boolean;
      returnConfidence?: boolean;
      returnFeatureContributions?: boolean;
    } = {}
  ): Promise<Array<{
    prediction: string;
    confidence?: number;
    isNovel?: boolean;
    featureContributions?: Record<string, number>;
  }>> {
    if (!this.baseClassifier) {
      throw new Error('Model not initialized');
    }
    
    const results = [];
    
    for (const sample of data) {
      // Convert sample to internal format
      const formattedSample = {
        features: Object.entries(sample)
          .filter(([key]) => this.knownFeatures.has(key))
          .map(([key, value]) => typeof value === 'number' ? value : 0)
      };
      
      // Make base prediction
      const baseResult = this.baseClassifier.predict(formattedSample);
      
      // Detect if sample is novel/out-of-distribution
      let isNovel = false;
      if (options.detectNovelty) {
        const noveltyResult = this.noveltyDetector.inference([{
          id: uuidv4(),
          features: formattedSample.features
        }])[0];
        
        isNovel = noveltyResult.isOutOfDistribution;
      }
      
      const result: any = {
        prediction: baseResult.class,
      };
      
      if (options.returnConfidence) {
        result.confidence = baseResult.probability;
      }
      
      if (options.detectNovelty) {
        result.isNovel = isNovel;
      }
      
      if (options.returnFeatureContributions) {
        // In a real implementation, this would calculate feature importance
        // for this specific prediction
        result.featureContributions = {};
      }
      
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Evaluate model performance
   */
  private async evaluatePerformance(data: DynamicDataPoint[]): Promise<number> {
    // In a real implementation, this would compute metrics like accuracy, F1, etc.
    // For this simplified version, we return a simulated accuracy
    
    // Filter samples with labels
    const labeledData = data.filter(point => point.label);
    if (labeledData.length === 0) return 0;
    
    let correctPredictions = 0;
    
    // Make predictions and compare to actual labels
    for (const sample of labeledData) {
      const prediction = await this.predict([sample.features]);
      if (prediction[0].prediction === sample.label) {
        correctPredictions++;
      }
    }
    
    return correctPredictions / labeledData.length;
  }
  
  /**
   * Record performance metrics
   */
  private recordPerformance(result: IncrementalLearningResult): void {
    // Calculate F1 score (simplified)
    const f1Score = result.performanceMetrics.afterAccuracy || 0;
    
    // Record metrics
    this.performanceHistory.push({
      timestamp: Date.now(),
      accuracy: result.performanceMetrics.afterAccuracy || 0,
      f1Score,
      adaptationSpeed: result.performanceMetrics.adaptationTime
    });
    
    // Keep history size manageable
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }
  
  /**
   * Get performance trend over time
   */
  public getPerformanceTrend(): {
    timestamps: number[];
    accuracy: number[];
    f1Score: number[];
    adaptationSpeed: number[];
  } {
    return {
      timestamps: this.performanceHistory.map(p => p.timestamp),
      accuracy: this.performanceHistory.map(p => p.accuracy),
      f1Score: this.performanceHistory.map(p => p.f1Score),
      adaptationSpeed: this.performanceHistory.map(p => p.adaptationSpeed)
    };
  }
  
  /**
   * Optimize model performance with current knowledge
   */
  public async optimize(): Promise<{
    performanceBefore: number;
    performanceAfter: number;
    optimizationTime: number;
  }> {
    const startTime = Date.now();
    
    // Measure current performance using recent history
    const recentPerformance = this.performanceHistory.length > 0
      ? this.performanceHistory[this.performanceHistory.length - 1].accuracy
      : 0.5;
    
    // In a real implementation, this would tune hyperparameters
    // and optimize the model architecture
    console.log(`OEL: Optimizing model ${this.modelName}`);
    
    // Simulate optimization effect
    const optimizedPerformance = Math.min(0.99, recentPerformance * 1.1);
    
    return {
      performanceBefore: recentPerformance,
      performanceAfter: optimizedPerformance,
      optimizationTime: Date.now() - startTime
    };
  }
  
  /**
   * Reset the model while preserving learned feature knowledge
   */
  public reset(options: { preserveFeatures?: boolean } = {}): void {
    // Reset base model
    this.baseClassifier = {
      features: options.preserveFeatures ? this.baseClassifier.features : new Set(),
      classes: new Set(),
      model: null,
      predict: (sample: any) => ({ class: 'unknown', probability: 0 }),
      update: (samples: any[]) => true
    };
    
    // Reset novelty detector
    this.noveltyDetector.reset();
    
    // Keep feature knowledge if requested
    if (!options.preserveFeatures) {
      this.knownFeatures.clear();
    }
    
    // Reset class knowledge
    this.knownClasses.clear();
    
    // Reset performance history
    this.performanceHistory = [];
    
    console.log(`OEL: Reset model ${this.modelName}`);
  }
  
  /**
   * Export model to serializable format
   */
  public exportModel(): any {
    return {
      modelId: this.modelId,
      modelName: this.modelName,
      config: this.config,
      knownFeatures: Array.from(this.knownFeatures.entries()),
      knownClasses: Array.from(this.knownClasses.entries()),
      environmentHistory: this.environmentHistory,
      currentState: this.currentState,
      performanceHistory: this.performanceHistory
    };
  }
  
  /**
   * Import model from serialized format
   */
  public static importModel(serialized: any): OpenEnvironmentLearning {
    const model = new OpenEnvironmentLearning(serialized.modelName, serialized.config);
    
    model.modelId = serialized.modelId;
    model.knownFeatures = new Map(serialized.knownFeatures);
    model.knownClasses = new Map(serialized.knownClasses);
    model.environmentHistory = serialized.environmentHistory;
    model.currentState = serialized.currentState;
    model.performanceHistory = serialized.performanceHistory;
    
    return model;
  }
}

// Singleton service for managing OEL models
class OpenEnvironmentLearningService {
  private static instance: OpenEnvironmentLearningService;
  private models: Map<string, OpenEnvironmentLearning> = new Map();
  
  private constructor() {}
  
  public static getInstance(): OpenEnvironmentLearningService {
    if (!OpenEnvironmentLearningService.instance) {
      OpenEnvironmentLearningService.instance = new OpenEnvironmentLearningService();
    }
    return OpenEnvironmentLearningService.instance;
  }
  
  public createModel(name: string, config?: Partial<OELConfig>): OpenEnvironmentLearning {
    const model = new OpenEnvironmentLearning(name, config);
    this.models.set(model.exportModel().modelId, model);
    return model;
  }
  
  public getModel(id: string): OpenEnvironmentLearning | undefined {
    return this.models.get(id);
  }
  
  public deleteModel(id: string): boolean {
    return this.models.delete(id);
  }
  
  public listModels(): Array<{ id: string; name: string }> {
    return Array.from(this.models.entries()).map(([id, model]) => ({
      id,
      name: model.exportModel().modelName
    }));
  }
}

export const openEnvironmentLearningService = OpenEnvironmentLearningService.getInstance();



