/**
 * Meta-Learning (Learning to Learn) Implementation
 * 
 * Enables models to leverage prior learning experiences to rapidly adapt
 * to new tasks with minimal data, supporting few-shot and zero-shot learning.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { vectorEmbeddingService } from '../memory/VectorEmbeddingService';
import { energyBasedModelService } from './EnergyBasedModel';

/**
 * Configuration for Meta-Learning system
 */
export interface MetaLearningConfig {
  // Architecture parameters
  embeddingDimension: number;
  prototypicalNetworkLayers: number[];
  metricType: 'cosine' | 'euclidean' | 'mahalanobis' | 'adaptive';
  
  // Learning parameters
  innerLoopLearningRate: number;
  outerLoopLearningRate: number;
  adaptationSteps: number;
  
  // Task handling
  supportSetSize: number;
  querySetSize: number;
  taskSimilarityThreshold: number;
}

/**
 * Task definition for meta-learning
 */
export interface MetaTask {
  id: string;
  name: string;
  description: string;
  domain: string;
  created: number; // timestamp
  samples: {
    support: MetaSample[]; // samples for learning
    query?: MetaSample[]; // samples for evaluation
  };
  metadata?: Record<string, any>;
}

/**
 * Sample for meta-learning
 */
export interface MetaSample {
  id: string;
  features: number[];
  label: string | number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

/**
 * Prototypical representation of a class
 */
export interface Prototype {
  label: string | number;
  embedding: number[];
  standardDeviation?: number[];
  sampleCount: number;
}

/**
 * Meta-learning adaptation result
 */
export interface AdaptationResult {
  taskId: string;
  accuracy: number;
  adaptationTime: number;
  prototypes: Prototype[];
  confidence: number;
}

/**
 * Meta-Learning system implementation focusing on rapid adaptation
 * to new tasks by leveraging prior learning experiences
 */
export class MetaLearning extends EventEmitter {
  private modelId: string;
  private modelName: string;
  private config: MetaLearningConfig;
  
  // Repository of tasks and experiences
  private tasks: Map<string, MetaTask> = new Map();
  private prototypes: Map<string, Prototype[]> = new Map();
  
  // Task relationships
  private taskSimilarityMatrix: Map<string, Map<string, number>> = new Map();
  
  // Adaptation history
  private adaptationHistory: Map<string, AdaptationResult[]> = new Map();
  
  /**
   * Create a new Meta-Learning system
   */
  constructor(modelName: string, config: Partial<MetaLearningConfig> = {}) {
    super();
    this.modelId = uuidv4();
    this.modelName = modelName;
    
    // Default configuration
    this.config = {
      embeddingDimension: 64,
      prototypicalNetworkLayers: [128, 64],
      metricType: 'cosine',
      innerLoopLearningRate: 0.05,
      outerLoopLearningRate: 0.01,
      adaptationSteps: 5,
      supportSetSize: 5,
      querySetSize: 10,
      taskSimilarityThreshold: 0.7,
      ...config
    };
  }
  
  /**
   * Register a new task for meta-learning
   */
  public async registerTask(
    name: string,
    description: string,
    domain: string,
    supportSamples: MetaSample[],
    querySamples?: MetaSample[]
  ): Promise<string> {
    const taskId = uuidv4();
    
    // Process embeddings for all samples if not already present
    const processedSupportSamples = await this.processSampleEmbeddings(supportSamples);
    const processedQuerySamples = querySamples 
      ? await this.processSampleEmbeddings(querySamples)
      : undefined;
    
    const task: MetaTask = {
      id: taskId,
      name,
      description,
      domain,
      created: Date.now(),
      samples: {
        support: processedSupportSamples,
        query: processedQuerySamples
      }
    };
    
    // Register the task
    this.tasks.set(taskId, task);
    
    // Compute prototypes for this task
    const prototypes = this.computePrototypes(processedSupportSamples);
    this.prototypes.set(taskId, prototypes);
    
    // Update task similarity matrix
    await this.updateTaskSimilarities(taskId);
    
    console.log(`Meta-Learning: Registered task "${name}" with ${supportSamples.length} support samples`);
    
    return taskId;
  }
  
  /**
   * Process sample embeddings if not already present
   */
  private async processSampleEmbeddings(samples: MetaSample[]): Promise<MetaSample[]> {
    const processedSamples = [...samples];
    
    // Process samples without embeddings
    const samplesToProcess = processedSamples.filter(s => !s.embedding);
    
    if (samplesToProcess.length > 0) {
      // Extract features for embedding generation
      // In a real implementation, this would use a proper embedding model
      // Here we'll use a simplified approach
      for (const sample of samplesToProcess) {
        // If vectorEmbeddingService is available, use it
        try {
          // Simulate embedding generation
          if (sample.features.length > 0) {
            // Normalize features to create an embedding-like representation
            const sum = sample.features.reduce((acc, val) => acc + val * val, 0);
            const norm = Math.sqrt(sum);
            
            if (norm > 0) {
              sample.embedding = sample.features.map(f => f / norm);
            } else {
              // Fallback to random embedding
              sample.embedding = Array(this.config.embeddingDimension)
                .fill(0)
                .map(() => (Math.random() * 2 - 1) * 0.1);
            }
            
            // Ensure embedding has the right dimension
            if (sample.embedding.length < this.config.embeddingDimension) {
              const padding = Array(this.config.embeddingDimension - sample.embedding.length)
                .fill(0);
              sample.embedding = [...sample.embedding, ...padding];
            } else if (sample.embedding.length > this.config.embeddingDimension) {
              sample.embedding = sample.embedding.slice(0, this.config.embeddingDimension);
            }
          }
        } catch (error) {
          console.error('Error generating embeddings:', error);
          // Fallback to default embedding
          sample.embedding = Array(this.config.embeddingDimension)
            .fill(0)
            .map(() => (Math.random() * 2 - 1) * 0.1);
        }
      }
    }
    
    return processedSamples;
  }
  
  /**
   * Compute class prototypes from samples
   */
  private computePrototypes(samples: MetaSample[]): Prototype[] {
    // Group samples by label
    const samplesByLabel = new Map<string | number, MetaSample[]>();
    
    for (const sample of samples) {
      if (!samplesByLabel.has(sample.label)) {
        samplesByLabel.set(sample.label, []);
      }
      samplesByLabel.get(sample.label)!.push(sample);
    }
    
    // Compute prototype for each label
    const prototypes: Prototype[] = [];
    
    for (const [label, labelSamples] of samplesByLabel.entries()) {
      // Average the embeddings to get the prototype
      const prototypeEmbedding = Array(this.config.embeddingDimension).fill(0);
      
      for (const sample of labelSamples) {
        for (let i = 0; i < this.config.embeddingDimension; i++) {
          prototypeEmbedding[i] += (sample.embedding?.[i] || 0) / labelSamples.length;
        }
      }
      
      // Compute standard deviation for uncertainty estimation
      const standardDeviation = Array(this.config.embeddingDimension).fill(0);
      
      for (const sample of labelSamples) {
        for (let i = 0; i < this.config.embeddingDimension; i++) {
          standardDeviation[i] += Math.pow((sample.embedding?.[i] || 0) - prototypeEmbedding[i], 2) / labelSamples.length;
        }
      }
      
      for (let i = 0; i < this.config.embeddingDimension; i++) {
        standardDeviation[i] = Math.sqrt(standardDeviation[i]);
      }
      
      prototypes.push({
        label,
        embedding: prototypeEmbedding,
        standardDeviation,
        sampleCount: labelSamples.length
      });
    }
    
    return prototypes;
  }
  
  /**
   * Update task similarity matrix
   */
  private async updateTaskSimilarities(newTaskId: string): Promise<void> {
    const newTask = this.tasks.get(newTaskId);
    if (!newTask) return;
    
    // Initialize similarity map for this task
    if (!this.taskSimilarityMatrix.has(newTaskId)) {
      this.taskSimilarityMatrix.set(newTaskId, new Map());
    }
    
    // Compare the new task with all existing tasks
    for (const [taskId, task] of this.tasks.entries()) {
      if (taskId === newTaskId) continue;
      
      // Compute task-level similarity
      const similarity = await this.computeTaskSimilarity(newTask, task);
      
      // Update the similarity matrix (it's symmetric)
      this.taskSimilarityMatrix.get(newTaskId)?.set(taskId, similarity);
      
      if (!this.taskSimilarityMatrix.has(taskId)) {
        this.taskSimilarityMatrix.set(taskId, new Map());
      }
      this.taskSimilarityMatrix.get(taskId)?.set(newTaskId, similarity);
    }
  }
  
  /**
   * Compute similarity between two tasks
   */
  private async computeTaskSimilarity(taskA: MetaTask, taskB: MetaTask): Promise<number> {
    // Combine multiple similarity measures
    
    // Domain similarity (same domain = higher similarity)
    const domainSimilarity = taskA.domain === taskB.domain ? 1.0 : 0.3;
    
    // Prototype-based similarity (compute distances between prototypes)
    const prototypesA = this.prototypes.get(taskA.id) || [];
    const prototypesB = this.prototypes.get(taskB.id) || [];
    
    if (prototypesA.length === 0 || prototypesB.length === 0) {
      return domainSimilarity;
    }
    
    // Compute average distance between prototypes
    let totalDistance = 0;
    let comparisonCount = 0;
    
    for (const protoA of prototypesA) {
      for (const protoB of prototypesB) {
        const distance = this.computeDistance(protoA.embedding, protoB.embedding);
        totalDistance += distance;
        comparisonCount++;
      }
    }
    
    const avgDistance = totalDistance / comparisonCount;
    
    // Convert distance to similarity (close distance = high similarity)
    const prototypeSimilarity = Math.exp(-avgDistance);
    
    // Combine similarities
    return 0.4 * domainSimilarity + 0.6 * prototypeSimilarity;
  }
  
  /**
   * Compute distance between two embeddings based on chosen metric
   */
  private computeDistance(embeddingA: number[], embeddingB: number[]): number {
    switch (this.config.metricType) {
      case 'euclidean':
        return this.euclideanDistance(embeddingA, embeddingB);
        
      case 'cosine':
        return 1 - this.cosineSimilarity(embeddingA, embeddingB);
        
      case 'mahalanobis':
        // Simplified Mahalanobis - would be properly implemented in a real system
        return this.euclideanDistance(embeddingA, embeddingB);
        
      case 'adaptive':
        // Would combine multiple metrics adaptively in a real implementation
        const euclidean = this.euclideanDistance(embeddingA, embeddingB);
        const cosine = 1 - this.cosineSimilarity(embeddingA, embeddingB);
        return 0.5 * euclidean + 0.5 * cosine;
    }
  }
  
  /**
   * Compute Euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    const minLength = Math.min(a.length, b.length);
    
    for (let i = 0; i < minLength; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }
  
  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    const minLength = Math.min(a.length, b.length);
    
    for (let i = 0; i < minLength; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    return normA > 0 && normB > 0 ? dotProduct / (normA * normB) : 0;
  }
  
  /**
   * Find the most similar tasks to a given task
   */
  public findSimilarTasks(
    taskId: string,
    minSimilarity: number = 0.5,
    maxResults: number = 5
  ): Array<{
    taskId: string;
    taskName: string;
    similarity: number;
  }> {
    const similarityMap = this.taskSimilarityMatrix.get(taskId);
    if (!similarityMap) return [];
    
    // Get all similarities meeting the threshold
    const similarities = Array.from(similarityMap.entries())
      .filter(([_, similarity]) => similarity >= minSimilarity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults);
    
    // Map to return format
    return similarities.map(([id, similarity]) => ({
      taskId: id,
      taskName: this.tasks.get(id)?.name || 'Unknown Task',
      similarity
    }));
  }
  
  /**
   * Adapt to a new task using meta-learning
   */
  public async adaptToTask(
    supportSamples: MetaSample[],
    options: {
      taskName?: string;
      domain?: string;
      adaptationSteps?: number;
      useSimilarTasks?: boolean;
    } = {}
  ): Promise<AdaptationResult> {
    const startTime = Date.now();
    
    // Process embeddings for support samples
    const processedSamples = await this.processSampleEmbeddings(supportSamples);
    
    // Create a temporary task ID
    const tempTaskId = `temp_${uuidv4()}`;
    
    // Create prototypes for the new task
    const prototypes = this.computePrototypes(processedSamples);
    
    let accuracy = 0;
    
    // If using similar tasks, incorporate knowledge from them
    if (options.useSimilarTasks !== false && options.domain) {
      // Find tasks in the same domain
      const domainTasks = Array.from(this.tasks.values())
        .filter(task => task.domain === options.domain);
      
      if (domainTasks.length > 0) {
        // Create a temporary task
        const tempTask: MetaTask = {
          id: tempTaskId,
          name: options.taskName || 'Temporary Task',
          description: 'Temporary task for adaptation',
          domain: options.domain,
          created: Date.now(),
          samples: { support: processedSamples }
        };
        
        // Compute similarities with domain tasks
        const similarities = await Promise.all(
          domainTasks.map(async task => ({
            taskId: task.id,
            similarity: await this.computeTaskSimilarity(tempTask, task)
          }))
        );
        
        // Filter for tasks above similarity threshold
        const similarTasks = similarities
          .filter(s => s.similarity >= this.config.taskSimilarityThreshold)
          .sort((a, b) => b.similarity - a.similarity)
          .map(s => this.tasks.get(s.taskId)!);
        
        // Adapt prototypes using similar tasks
        if (similarTasks.length > 0) {
          prototypes.forEach(prototype => {
            // Find matching prototypes from similar tasks
            for (const task of similarTasks) {
              const taskProtos = this.prototypes.get(task.id) || [];
              const matchingProtos = taskProtos.filter(p => p.label === prototype.label);
              
              if (matchingProtos.length > 0) {
                // Adapt prototype based on similar tasks
                for (let i = 0; i < prototype.embedding.length; i++) {
                  let weightedSum = prototype.embedding[i] * prototype.sampleCount;
                  let totalWeight = prototype.sampleCount;
                  
                  for (const match of matchingProtos) {
                    const weight = match.sampleCount * 0.1; // Reduced influence
                    weightedSum += match.embedding[i] * weight;
                    totalWeight += weight;
                  }
                  
                  if (totalWeight > 0) {
                    prototype.embedding[i] = weightedSum / totalWeight;
                  }
                }
              }
            }
          });
          
          console.log(`Meta-Learning: Adapted using ${similarTasks.length} similar tasks`);
        }
      }
    }
    
    // Perform adaptation steps (fine-tuning)
    const adaptationSteps = options.adaptationSteps || this.config.adaptationSteps;
    
    for (let step = 0; step < adaptationSteps; step++) {
      // In a real implementation, this would perform gradient updates
      // For this simplified version, we'll just refine the prototypes
      
      // Evaluate current prototypes
      const predictions = processedSamples.map(sample => 
        this.predictWithPrototypes(sample, prototypes)
      );
      
      // Count correct predictions
      let correct = 0;
      predictions.forEach((pred, idx) => {
        if (pred.label === processedSamples[idx].label) {
          correct++;
        }
      });
      
      accuracy = processedSamples.length > 0 ? correct / processedSamples.length : 0;
      
      // If perfect accuracy, no need to continue adaptation
      if (accuracy === 1.0) break;
      
      // Adjust prototypes based on errors (simplified adaptation)
      for (let i = 0; i < processedSamples.length; i++) {
        const sample = processedSamples[i];
        const prediction = predictions[i];
        
        if (prediction.label !== sample.label) {
          // Move prototype for correct class closer to the sample
          const correctProto = prototypes.find(p => p.label === sample.label);
          if (correctProto && sample.embedding) {
            for (let j = 0; j < correctProto.embedding.length; j++) {
              correctProto.embedding[j] += 
                this.config.innerLoopLearningRate * (sample.embedding[j] - correctProto.embedding[j]);
            }
          }
          
          // Move prototype for predicted class away from the sample
          const wrongProto = prototypes.find(p => p.label === prediction.label);
          if (wrongProto && sample.embedding) {
            for (let j = 0; j < wrongProto.embedding.length; j++) {
              wrongProto.embedding[j] -= 
                this.config.innerLoopLearningRate * 0.5 * (sample.embedding[j] - wrongProto.embedding[j]);
            }
          }
        }
      }
    }
    
    // Calculate confidence based on cluster separation
    let confidence = 0.5; // Default medium confidence
    
    // In a real implementation, this would compute confidence based on
    // prototype separation, classification margins, etc.
    if (prototypes.length >= 2) {
      // Compute average distance between prototypes
      let totalDistance = 0;
      let pairCount = 0;
      
      for (let i = 0; i < prototypes.length; i++) {
        for (let j = i + 1; j < prototypes.length; j++) {
          totalDistance += this.computeDistance(
            prototypes[i].embedding, 
            prototypes[j].embedding
          );
          pairCount++;
        }
      }
      
      const avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;
      
      // Higher separation = higher confidence (up to a point)
      confidence = Math.min(0.9, Math.max(0.3, 1 - Math.exp(-avgDistance * 2)));
    }
    
    // If this is a named task, store it
    if (options.taskName && options.domain) {
      this.registerTask(
        options.taskName,
        'Task created through adaptation',
        options.domain,
        processedSamples
      );
    }
    
    const result: AdaptationResult = {
      taskId: tempTaskId,
      accuracy,
      adaptationTime: Date.now() - startTime,
      prototypes,
      confidence
    };
    
    return result;
  }
  
  /**
   * Predict class for a sample using prototypes
   */
  private predictWithPrototypes(
    sample: MetaSample,
    prototypes: Prototype[]
  ): {
    label: string | number;
    distance: number;
    confidence: number;
  } {
    if (!sample.embedding || prototypes.length === 0) {
      return {
        label: 'unknown',
        distance: Infinity,
        confidence: 0
      };
    }
    
    // Find closest prototype
    let closestDistance = Infinity;
    let closestPrototype = prototypes[0];
    
    for (const prototype of prototypes) {
      const distance = this.computeDistance(sample.embedding, prototype.embedding);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPrototype = prototype;
      }
    }
    
    // Calculate confidence based on distance and prototype variance
    let confidence = Math.exp(-closestDistance * 2);
    
    // Adjust confidence based on prototype's standard deviation
    if (closestPrototype.standardDeviation) {
      const avgStdDev = closestPrototype.standardDeviation.reduce((a, b) => a + b, 0) / 
                        closestPrototype.standardDeviation.length;
      
      // Higher variance = lower confidence
      confidence *= Math.exp(-avgStdDev);
    }
    
    // Cap confidence
    confidence = Math.min(0.99, Math.max(0.01, confidence));
    
    return {
      label: closestPrototype.label,
      distance: closestDistance,
      confidence
    };
  }
  
  /**
   * Predict label for new samples using meta-learned prototypes
   */
  public async predict(
    samples: MetaSample[],
    taskId?: string
  ): Promise<Array<{
    sampleId: string;
    label: string | number;
    confidence: number;
    isNovel: boolean;
  }>> {
    // Process embeddings for samples
    const processedSamples = await this.processSampleEmbeddings(samples);
    
    // Get prototypes to use for prediction
    let prototypesToUse: Prototype[] = [];
    
    if (taskId && this.prototypes.has(taskId)) {
      // Use prototypes from the specified task
      prototypesToUse = this.prototypes.get(taskId)!;
    } else {
      // Find the most recently created task if none specified
      const tasks = Array.from(this.tasks.values())
        .sort((a, b) => b.created - a.created);
      
      if (tasks.length > 0) {
        prototypesToUse = this.prototypes.get(tasks[0].id) || [];
      }
    }
    
    if (prototypesToUse.length === 0) {
      throw new Error('No prototypes available for prediction');
    }
    
    // Make predictions
    const results = [];
    
    for (const sample of processedSamples) {
      const prediction = this.predictWithPrototypes(sample, prototypesToUse);
      
      // Determine if sample is novel (far from all prototypes)
      const isNovel = prediction.distance > 3.0; // Simplified threshold
      
      results.push({
        sampleId: sample.id,
        label: prediction.label,
        confidence: prediction.confidence,
        isNovel
      });
    }
    
    return results;
  }
  
  /**
   * Get the list of registered tasks
   */
  public getTasks(): Array<{
    id: string;
    name: string;
    domain: string;
    supportSampleCount: number;
    querySampleCount: number;
    created: number;
  }> {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      name: task.name,
      domain: task.domain,
      supportSampleCount: task.samples.support.length,
      querySampleCount: task.samples.query?.length || 0,
      created: task.created
    }));
  }
  
  /**
   * Get model configuration
   */
  public getConfig(): MetaLearningConfig {
    return { ...this.config };
  }
  
  /**
   * Update model configuration
   */
  public updateConfig(config: Partial<MetaLearningConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Export model to serializable format
   */
  public exportModel(): any {
    return {
      modelId: this.modelId,
      modelName: this.modelName,
      config: this.config,
      tasks: Array.from(this.tasks.entries()),
      prototypes: Array.from(this.prototypes.entries()),
      taskSimilarityMatrix: Array.from(this.taskSimilarityMatrix.entries())
        .map(([taskId, similarities]) => [
          taskId,
          Array.from(similarities.entries())
        ])
    };
  }
  
  /**
   * Import model from serialized format
   */
  public static importModel(serialized: any): MetaLearning {
    const model = new MetaLearning(serialized.modelName, serialized.config);
    
    model.modelId = serialized.modelId;
    model.tasks = new Map(serialized.tasks);
    model.prototypes = new Map(serialized.prototypes);
    
    model.taskSimilarityMatrix = new Map();
    for (const [taskId, similarities] of serialized.taskSimilarityMatrix) {
      model.taskSimilarityMatrix.set(taskId, new Map(similarities));
    }
    
    return model;
  }
}

// Singleton service for managing meta-learning models
class MetaLearningService {
  private static instance: MetaLearningService;
  private models: Map<string, MetaLearning> = new Map();
  
  private constructor() {}
  
  public static getInstance(): MetaLearningService {
    if (!MetaLearningService.instance) {
      MetaLearningService.instance = new MetaLearningService();
    }
    return MetaLearningService.instance;
  }
  
  public createModel(name: string, config?: Partial<MetaLearningConfig>): MetaLearning {
    const model = new MetaLearning(name, config);
    this.models.set(model.exportModel().modelId, model);
    return model;
  }
  
  public getModel(id: string): MetaLearning | undefined {
    return this.models.get(id);
  }
  
  public getModelByName(name: string): MetaLearning | undefined {
    return Array.from(this.models.values())
      .find(model => model.exportModel().modelName === name);
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

export const metaLearningService = MetaLearningService.getInstance();
