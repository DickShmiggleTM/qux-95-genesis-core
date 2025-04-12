/**
 * OptimizationSystem.ts
 * Core system for managing and combining various optimization algorithms
 * in the QUX-95 Neural-Cybernetic Framework.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Logger } from '../../utils/Logger';

// Optimization method categories
import { FirstOrderMethods } from './methods/FirstOrderMethods';
import { SecondOrderMethods } from './methods/SecondOrderMethods';
import { StochasticMethods } from './methods/StochasticMethods';
import { MetaheuristicMethods } from './methods/MetaheuristicMethods';
import { PopulationMethods } from './methods/PopulationMethods';
import { LearningRateSchedulers } from './methods/LearningRateSchedulers';
import { RegularizationMethods } from './methods/RegularizationMethods';
import { ConstrainedMethods } from './methods/ConstrainedMethods';

// Types
import { OptimizationContext, OptimizationResult, OptimizationConfig, OptimizationParams } from './types/OptimizationTypes';
import { MetricTracker } from '../../utils/MetricTracker';

/**
 * Main optimization system that integrates various optimization methods
 * and provides a unified interface for the QUX-95 framework.
 */
export class OptimizationSystem extends EventEmitter {
  private static instance: OptimizationSystem;
  private logger: Logger;
  private isInitialized: boolean = false;
  private metrics: MetricTracker;
  
  // Method instances
  private firstOrderMethods: FirstOrderMethods;
  private secondOrderMethods: SecondOrderMethods;
  private stochasticMethods: StochasticMethods;
  private metaheuristicMethods: MetaheuristicMethods;
  private populationMethods: PopulationMethods;
  private learningRateSchedulers: LearningRateSchedulers;
  private regularizationMethods: RegularizationMethods;
  private constrainedMethods: ConstrainedMethods;
  
  // Active optimization contexts
  private activeContexts: Map<string, OptimizationContext> = new Map();
  
  private constructor() {
    super();
    this.logger = new Logger('OptimizationSystem');
    this.metrics = new MetricTracker('optimization');
    
    // Initialize all method categories
    this.firstOrderMethods = new FirstOrderMethods();
    this.secondOrderMethods = new SecondOrderMethods();
    this.stochasticMethods = new StochasticMethods();
    this.metaheuristicMethods = new MetaheuristicMethods();
    this.populationMethods = new PopulationMethods();
    this.learningRateSchedulers = new LearningRateSchedulers();
    this.regularizationMethods = new RegularizationMethods();
    this.constrainedMethods = new ConstrainedMethods();
  }
  
  /**
   * Get the singleton instance of the OptimizationSystem
   */
  public static getInstance(): OptimizationSystem {
    if (!OptimizationSystem.instance) {
      OptimizationSystem.instance = new OptimizationSystem();
    }
    return OptimizationSystem.instance;
  }
  
  /**
   * Initialize the optimization system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('OptimizationSystem already initialized');
      return;
    }
    
    try {
      this.logger.info('Initializing OptimizationSystem...');
      
      // Initialize all method categories
      await this.firstOrderMethods.initialize();
      await this.secondOrderMethods.initialize();
      await this.stochasticMethods.initialize();
      await this.metaheuristicMethods.initialize();
      await this.populationMethods.initialize();
      await this.learningRateSchedulers.initialize();
      await this.regularizationMethods.initialize();
      await this.constrainedMethods.initialize();
      
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.logger.info('OptimizationSystem initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize OptimizationSystem: ${error}`);
      throw error;
    }
  }
  
  /**
   * Set up event listeners between optimization components
   */
  private setupEventListeners(): void {
    // Listen for optimization events from different method categories
    this.firstOrderMethods.on('optimizationStep', this.handleOptimizationStep.bind(this));
    this.secondOrderMethods.on('optimizationStep', this.handleOptimizationStep.bind(this));
    this.stochasticMethods.on('optimizationStep', this.handleOptimizationStep.bind(this));
    this.metaheuristicMethods.on('optimizationStep', this.handleOptimizationStep.bind(this));
    this.populationMethods.on('optimizationStep', this.handleOptimizationStep.bind(this));
    
    // Listen for cross-method interactions
    this.learningRateSchedulers.on('learningRateChanged', this.handleLearningRateChange.bind(this));
    this.regularizationMethods.on('regularizationApplied', this.handleRegularizationApplied.bind(this));
  }
  
  /**
   * Handle optimization step events from method categories
   */
  private handleOptimizationStep(contextId: string, stepData: any): void {
    if (this.activeContexts.has(contextId)) {
      const context = this.activeContexts.get(contextId);
      context.steps.push({
        timestamp: Date.now(),
        data: stepData
      });
      
      // Track metrics for this step
      this.metrics.trackEvent('optimizationStep', {
        contextId,
        methodType: stepData.methodType,
        loss: stepData.loss,
        gradientNorm: stepData.gradientNorm,
        iteration: stepData.iteration
      });
      
      // Emit progress event
      this.emit('optimizationProgress', contextId, {
        progress: stepData.iteration / context.config.maxIterations,
        currentLoss: stepData.loss,
        gradientNorm: stepData.gradientNorm
      });
    }
  }
  
  /**
   * Handle learning rate change events
   */
  private handleLearningRateChange(contextId: string, newLearningRate: number): void {
    if (this.activeContexts.has(contextId)) {
      const context = this.activeContexts.get(contextId);
      context.currentParams.learningRate = newLearningRate;
      
      this.logger.debug(`Learning rate updated for context ${contextId}: ${newLearningRate}`);
      this.emit('learningRateChanged', contextId, newLearningRate);
    }
  }
  
  /**
   * Handle regularization applied events
   */
  private handleRegularizationApplied(contextId: string, regularizationInfo: any): void {
    if (this.activeContexts.has(contextId)) {
      this.logger.debug(`Regularization applied for context ${contextId}: ${JSON.stringify(regularizationInfo)}`);
      this.emit('regularizationApplied', contextId, regularizationInfo);
    }
  }
  
  /**
   * Create a new optimization context
   */
  public createOptimizationContext(config: OptimizationConfig): string {
    const contextId = uuidv4();
    
    const context: OptimizationContext = {
      id: contextId,
      config,
      startTime: Date.now(),
      endTime: null,
      status: 'created',
      currentParams: this.initializeDefaultParams(config),
      steps: [],
      result: null
    };
    
    this.activeContexts.set(contextId, context);
    this.logger.info(`Created optimization context: ${contextId}`);
    
    return contextId;
  }
  
  /**
   * Initialize default parameters based on configuration
   */
  private initializeDefaultParams(config: OptimizationConfig): OptimizationParams {
    return {
      learningRate: config.initialLearningRate || 0.01,
      momentum: config.initialMomentum || 0.0,
      beta1: config.beta1 || 0.9,
      beta2: config.beta2 || 0.999,
      epsilon: config.epsilon || 1e-8,
      weightDecay: config.weightDecay || 0.0,
      iteration: 0
    };
  }
  
  /**
   * Start optimization for a given context
   */
  public async startOptimization(contextId: string): Promise<OptimizationResult> {
    if (!this.activeContexts.has(contextId)) {
      throw new Error(`Optimization context not found: ${contextId}`);
    }
    
    const context = this.activeContexts.get(contextId);
    if (context.status !== 'created') {
      throw new Error(`Cannot start optimization: context is in ${context.status} state`);
    }
    
    context.status = 'running';
    this.logger.info(`Starting optimization for context: ${contextId}`);
    
    try {
      // Determine primary and secondary optimization methods based on config
      const primaryMethod = this.getPrimaryMethod(context.config);
      const result = await this.runOptimization(context, primaryMethod);
      
      // Update context with result
      context.status = 'completed';
      context.endTime = Date.now();
      context.result = result;
      
      this.logger.info(`Optimization completed for context: ${contextId}`);
      this.emit('optimizationCompleted', contextId, result);
      
      return result;
    } catch (error) {
      context.status = 'failed';
      context.endTime = Date.now();
      
      this.logger.error(`Optimization failed for context ${contextId}: ${error}`);
      this.emit('optimizationFailed', contextId, error);
      
      throw error;
    }
  }
  
  /**
   * Get the primary optimization method based on configuration
   */
  private getPrimaryMethod(config: OptimizationConfig): any {
    switch (config.primaryMethod) {
      case 'sgd':
      case 'adam':
      case 'rmsprop':
      case 'adagrad':
      case 'adadelta':
      case 'adamw':
      case 'nadam':
        return this.firstOrderMethods;
        
      case 'newton':
      case 'bfgs':
      case 'lbfgs':
        return this.secondOrderMethods;
        
      case 'sag':
      case 'saga':
      case 'svrg':
        return this.stochasticMethods;
        
      case 'genetic':
      case 'pso':
      case 'differential_evolution':
        return this.metaheuristicMethods;
        
      case 'cmaes':
      case 'bayesian':
      case 'evolution_strategies':
        return this.populationMethods;
        
      default:
        return this.firstOrderMethods; // Default to first-order methods
    }
  }
  
  /**
   * Run the optimization process using selected methods
   */
  private async runOptimization(context: OptimizationContext, primaryMethod: any): Promise<OptimizationResult> {
    // Apply learning rate scheduler if configured
    if (context.config.learningRateScheduler) {
      this.learningRateSchedulers.attachScheduler(
        context.id,
        context.config.learningRateScheduler,
        context.config.learningRateSchedulerConfig
      );
    }
    
    // Apply regularization if configured
    if (context.config.regularization) {
      this.regularizationMethods.applyRegularization(
        context.id,
        context.config.regularization,
        context.config.regularizationConfig
      );
    }
    
    // Run the primary optimization method
    const result = await primaryMethod.optimize(
      context.id,
      context.config,
      context.currentParams
    );
    
    return result;
  }
  
  /**
   * Cancel an ongoing optimization
   */
  public cancelOptimization(contextId: string): boolean {
    if (!this.activeContexts.has(contextId)) {
      return false;
    }
    
    const context = this.activeContexts.get(contextId);
    if (context.status !== 'running') {
      return false;
    }
    
    // Signal cancellation to the appropriate method category
    switch (context.config.primaryMethod) {
      case 'sgd':
      case 'adam':
      case 'rmsprop':
      case 'adagrad':
      case 'adadelta':
      case 'adamw':
      case 'nadam':
        this.firstOrderMethods.cancelOptimization(contextId);
        break;
        
      case 'newton':
      case 'bfgs':
      case 'lbfgs':
        this.secondOrderMethods.cancelOptimization(contextId);
        break;
        
      case 'sag':
      case 'saga':
      case 'svrg':
        this.stochasticMethods.cancelOptimization(contextId);
        break;
        
      case 'genetic':
      case 'pso':
      case 'differential_evolution':
        this.metaheuristicMethods.cancelOptimization(contextId);
        break;
        
      case 'cmaes':
      case 'bayesian':
      case 'evolution_strategies':
        this.populationMethods.cancelOptimization(contextId);
        break;
    }
    
    context.status = 'cancelled';
    context.endTime = Date.now();
    
    this.logger.info(`Optimization cancelled for context: ${contextId}`);
    this.emit('optimizationCancelled', contextId);
    
    return true;
  }
  
  /**
   * Get optimization context information
   */
  public getOptimizationContext(contextId: string): OptimizationContext {
    if (!this.activeContexts.has(contextId)) {
      throw new Error(`Optimization context not found: ${contextId}`);
    }
    
    return this.activeContexts.get(contextId);
  }
  
  /**
   * Get all active optimization contexts
   */
  public getAllOptimizationContexts(): OptimizationContext[] {
    return Array.from(this.activeContexts.values());
  }
  
  /**
   * Create a hybrid optimization strategy that combines multiple methods
   */
  public createHybridStrategy(
    contextId: string,
    primaryMethod: string,
    secondaryMethods: string[],
    hybridConfig: any
  ): boolean {
    if (!this.activeContexts.has(contextId)) {
      throw new Error(`Optimization context not found: ${contextId}`);
    }
    
    const context = this.activeContexts.get(contextId);
    if (context.status !== 'created') {
      throw new Error(`Cannot create hybrid strategy: context is in ${context.status} state`);
    }
    
    // Update the context config with hybrid strategy information
    context.config.isHybrid = true;
    context.config.primaryMethod = primaryMethod;
    context.config.secondaryMethods = secondaryMethods;
    context.config.hybridConfig = hybridConfig;
    
    this.logger.info(`Created hybrid optimization strategy for context: ${contextId}`);
    this.emit('hybridStrategyCreated', contextId, {
      primaryMethod,
      secondaryMethods,
      hybridConfig
    });
    
    return true;
  }
  
  /**
   * Get performance metrics for an optimization context
   */
  public getOptimizationMetrics(contextId: string): any {
    if (!this.activeContexts.has(contextId)) {
      throw new Error(`Optimization context not found: ${contextId}`);
    }
    
    const context = this.activeContexts.get(contextId);
    const metrics = {
      iterations: context.steps.length,
      timeElapsed: context.endTime ? (context.endTime - context.startTime) : (Date.now() - context.startTime),
      finalLoss: context.result?.finalLoss,
      finalParameters: context.result?.parameters,
      convergenceRate: this.calculateConvergenceRate(context),
      convergenceSteadiness: this.calculateConvergenceSteadiness(context)
    };
    
    return metrics;
  }
  
  /**
   * Calculate convergence rate for an optimization context
   */
  private calculateConvergenceRate(context: OptimizationContext): number {
    if (context.steps.length < 2) {
      return 0;
    }
    
    const initialLoss = context.steps[0].data.loss;
    const finalLoss = context.steps[context.steps.length - 1].data.loss;
    const iterations = context.steps.length;
    
    // Average loss reduction per iteration
    return (initialLoss - finalLoss) / iterations;
  }
  
  /**
   * Calculate convergence steadiness (lower is more steady)
   */
  private calculateConvergenceSteadiness(context: OptimizationContext): number {
    if (context.steps.length < 3) {
      return 0;
    }
    
    // Calculate variance in loss differences between iterations
    const lossDiffs = [];
    for (let i = 1; i < context.steps.length; i++) {
      lossDiffs.push(context.steps[i-1].data.loss - context.steps[i].data.loss);
    }
    
    const mean = lossDiffs.reduce((a, b) => a + b, 0) / lossDiffs.length;
    const variance = lossDiffs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lossDiffs.length;
    
    return Math.sqrt(variance); // Standard deviation of loss differences
  }
}

// Export singleton instance
export const optimizationSystem = OptimizationSystem.getInstance();
