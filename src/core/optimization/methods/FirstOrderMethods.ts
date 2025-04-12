/**
 * FirstOrderMethods.ts
 * Implementation of first-order optimization methods for the QUX-95 Neural-Cybernetic Framework.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../../utils/Logger';
import { OptimizationConfig, OptimizationParams, OptimizationResult, Optimizer } from '../types/OptimizationTypes';

/**
 * First-order optimization methods including:
 * - Gradient Descent (GD)
 * - Stochastic Gradient Descent (SGD)
 * - Mini-batch Gradient Descent
 * - Momentum
 * - Nesterov Accelerated Gradient (NAG)
 * - AdaGrad
 * - RMSProp
 * - Adam (Adaptive Moment Estimation)
 * - AdamW
 */
export class FirstOrderMethods extends EventEmitter implements Optimizer {
  private logger: Logger;
  private isInitialized: boolean = false;
  private activeOptimizations: Map<string, boolean> = new Map();
  
  // Method-specific state (used during optimization)
  private momentumCache: Map<string, number[]> = new Map();
  private adaGradCache: Map<string, number[]> = new Map();
  private rmsPropCache: Map<string, number[]> = new Map();
  private adamFirstMoment: Map<string, number[]> = new Map();
  private adamSecondMoment: Map<string, number[]> = new Map();
  private nesterovLookahead: Map<string, number[]> = new Map();
  
  constructor() {
    super();
    this.logger = new Logger('FirstOrderMethods');
  }
  
  /**
   * Initialize the first-order methods
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.logger.info('Initializing first-order optimization methods');
    this.isInitialized = true;
  }
  
  /**
   * Run optimization using the specified first-order method
   */
  public async optimize(
    contextId: string,
    config: OptimizationConfig,
    params: OptimizationParams
  ): Promise<OptimizationResult> {
    if (!this.isInitialized) {
      throw new Error('FirstOrderMethods not initialized');
    }
    
    // Set active flag for this optimization
    this.activeOptimizations.set(contextId, true);
    
    // Initialize method-specific caches
    this.initializeMethodCaches(contextId, config);
    
    // Create local variables for optimization
    const startTime = Date.now();
    let currentParameters = [...config.initialParameters];
    let iteration = 0;
    let currentValue = 0;
    let currentLoss = 0;
    let converged = false;
    let terminationReason = 'max_iterations_reached';
    
    try {
      // Main optimization loop
      while (iteration < config.maxIterations && this.activeOptimizations.get(contextId)) {
        // Compute objective and gradients
        const objectiveResult = config.objectiveFunction(currentParameters);
        currentValue = objectiveResult.value;
        let gradients = objectiveResult.gradients;
        
        // Convert to loss if objective is maximization
        currentLoss = config.objectiveType === 'maximize' ? -currentValue : currentValue;
        
        // Check for convergence (gradient norm below tolerance)
        const gradientNorm = this.calculateNorm(gradients);
        if (gradientNorm < config.tolerance) {
          converged = true;
          terminationReason = 'gradient_norm_below_tolerance';
          break;
        }
        
        // Apply the selected optimization method
        switch (config.primaryMethod) {
          case 'sgd':
            currentParameters = this.applySGD(contextId, currentParameters, gradients, params);
            break;
            
          case 'momentum':
            currentParameters = this.applyMomentum(contextId, currentParameters, gradients, params);
            break;
            
          case 'nag':
            currentParameters = this.applyNAG(contextId, currentParameters, gradients, params);
            break;
            
          case 'adagrad':
            currentParameters = this.applyAdaGrad(contextId, currentParameters, gradients, params);
            break;
            
          case 'rmsprop':
            currentParameters = this.applyRMSProp(contextId, currentParameters, gradients, params);
            break;
            
          case 'adam':
            currentParameters = this.applyAdam(contextId, currentParameters, gradients, params);
            break;
            
          case 'adamw':
            currentParameters = this.applyAdamW(contextId, currentParameters, gradients, params);
            break;
            
          default:
            // Default to SGD
            currentParameters = this.applySGD(contextId, currentParameters, gradients, params);
        }
        
        // Update iteration counter
        iteration++;
        params.iteration = iteration;
        
        // Emit optimization step event
        this.emit('optimizationStep', contextId, {
          methodType: config.primaryMethod,
          iteration,
          parameters: currentParameters,
          value: currentValue,
          loss: currentLoss,
          gradientNorm
        });
      }
      
      // Prepare result
      const endTime = Date.now();
      const result: OptimizationResult = {
        parameters: currentParameters,
        finalValue: currentValue,
        finalLoss: currentLoss,
        iterations: iteration,
        converged,
        terminationReason,
        timeTaken: endTime - startTime
      };
      
      // Clean up method-specific caches
      this.cleanupMethodCaches(contextId);
      this.activeOptimizations.delete(contextId);
      
      return result;
    } catch (error) {
      this.logger.error(`Optimization error for context ${contextId}: ${error}`);
      this.cleanupMethodCaches(contextId);
      this.activeOptimizations.delete(contextId);
      throw error;
    }
  }
  
  /**
   * Cancel an ongoing optimization
   */
  public cancelOptimization(contextId: string): boolean {
    if (!this.activeOptimizations.has(contextId)) {
      return false;
    }
    
    this.activeOptimizations.set(contextId, false);
    return true;
  }
  
  /**
   * Initialize method-specific caches for a new optimization
   */
  private initializeMethodCaches(contextId: string, config: OptimizationConfig): void {
    const paramSize = config.initialParameters.length;
    
    // Initialize momentum cache if needed
    if (['momentum', 'nag'].includes(config.primaryMethod)) {
      this.momentumCache.set(contextId, new Array(paramSize).fill(0));
      
      if (config.primaryMethod === 'nag') {
        this.nesterovLookahead.set(contextId, [...config.initialParameters]);
      }
    }
    
    // Initialize AdaGrad cache if needed
    if (config.primaryMethod === 'adagrad') {
      this.adaGradCache.set(contextId, new Array(paramSize).fill(0));
    }
    
    // Initialize RMSProp cache if needed
    if (config.primaryMethod === 'rmsprop') {
      this.rmsPropCache.set(contextId, new Array(paramSize).fill(0));
    }
    
    // Initialize Adam caches if needed
    if (['adam', 'adamw'].includes(config.primaryMethod)) {
      this.adamFirstMoment.set(contextId, new Array(paramSize).fill(0));
      this.adamSecondMoment.set(contextId, new Array(paramSize).fill(0));
    }
  }
  
  /**
   * Clean up method-specific caches after optimization
   */
  private cleanupMethodCaches(contextId: string): void {
    this.momentumCache.delete(contextId);
    this.nesterovLookahead.delete(contextId);
    this.adaGradCache.delete(contextId);
    this.rmsPropCache.delete(contextId);
    this.adamFirstMoment.delete(contextId);
    this.adamSecondMoment.delete(contextId);
  }
  
  /**
   * Apply Stochastic Gradient Descent (SGD) update
   */
  private applySGD(
    contextId: string,
    parameters: number[],
    gradients: number[],
    params: OptimizationParams
  ): number[] {
    const updatedParameters = parameters.map((param, i) => {
      return param - params.learningRate * gradients[i];
    });
    
    return updatedParameters;
  }
  
  /**
   * Apply Momentum update
   */
  private applyMomentum(
    contextId: string,
    parameters: number[],
    gradients: number[],
    params: OptimizationParams
  ): number[] {
    const momentumVector = this.momentumCache.get(contextId);
    const updatedParameters = parameters.map((param, i) => {
      // Update momentum vector
      momentumVector[i] = params.momentum * momentumVector[i] - params.learningRate * gradients[i];
      
      // Update parameter
      return param + momentumVector[i];
    });
    
    // Save updated momentum vector
    this.momentumCache.set(contextId, momentumVector);
    
    return updatedParameters;
  }
  
  /**
   * Apply Nesterov Accelerated Gradient (NAG) update
   */
  private applyNAG(
    contextId: string,
    parameters: number[],
    gradients: number[],
    params: OptimizationParams
  ): number[] {
    const momentumVector = this.momentumCache.get(contextId);
    const lookaheadParams = this.nesterovLookahead.get(contextId);
    
    // Update momentum vector
    const newMomentumVector = momentumVector.map((momentum, i) => {
      return params.momentum * momentum - params.learningRate * gradients[i];
    });
    
    // Update parameters with Nesterov correction
    const updatedParameters = parameters.map((param, i) => {
      return param + newMomentumVector[i] + params.momentum * (newMomentumVector[i] - momentumVector[i]);
    });
    
    // Save updated momentum vector
    this.momentumCache.set(contextId, newMomentumVector);
    
    // Update lookahead parameters for next iteration
    this.nesterovLookahead.set(contextId, updatedParameters);
    
    return updatedParameters;
  }
  
  /**
   * Apply AdaGrad update
   */
  private applyAdaGrad(
    contextId: string,
    parameters: number[],
    gradients: number[],
    params: OptimizationParams
  ): number[] {
    const adaGradCache = this.adaGradCache.get(contextId);
    const updatedParameters = parameters.map((param, i) => {
      // Update accumulated squared gradients
      adaGradCache[i] += gradients[i] * gradients[i];
      
      // Compute adaptive learning rate
      const adaptiveLR = params.learningRate / (Math.sqrt(adaGradCache[i]) + params.epsilon);
      
      // Update parameter
      return param - adaptiveLR * gradients[i];
    });
    
    // Save updated AdaGrad cache
    this.adaGradCache.set(contextId, adaGradCache);
    
    return updatedParameters;
  }
  
  /**
   * Apply RMSProp update
   */
  private applyRMSProp(
    contextId: string,
    parameters: number[],
    gradients: number[],
    params: OptimizationParams
  ): number[] {
    const rmsPropCache = this.rmsPropCache.get(contextId);
    const updatedParameters = parameters.map((param, i) => {
      // Update accumulated squared gradients with decay
      rmsPropCache[i] = params.beta2 * rmsPropCache[i] + (1 - params.beta2) * gradients[i] * gradients[i];
      
      // Compute adaptive learning rate
      const adaptiveLR = params.learningRate / (Math.sqrt(rmsPropCache[i]) + params.epsilon);
      
      // Update parameter
      return param - adaptiveLR * gradients[i];
    });
    
    // Save updated RMSProp cache
    this.rmsPropCache.set(contextId, rmsPropCache);
    
    return updatedParameters;
  }
  
  /**
   * Apply Adam (Adaptive Moment Estimation) update
   */
  private applyAdam(
    contextId: string,
    parameters: number[],
    gradients: number[],
    params: OptimizationParams
  ): number[] {
    const firstMoments = this.adamFirstMoment.get(contextId);
    const secondMoments = this.adamSecondMoment.get(contextId);
    const t = params.iteration + 1;
    
    const updatedParameters = parameters.map((param, i) => {
      // Update biased first moment estimate (momentum)
      firstMoments[i] = params.beta1 * firstMoments[i] + (1 - params.beta1) * gradients[i];
      
      // Update biased second moment estimate (RMSProp)
      secondMoments[i] = params.beta2 * secondMoments[i] + (1 - params.beta2) * gradients[i] * gradients[i];
      
      // Correct bias in first moment
      const firstMomentCorrected = firstMoments[i] / (1 - Math.pow(params.beta1, t));
      
      // Correct bias in second moment
      const secondMomentCorrected = secondMoments[i] / (1 - Math.pow(params.beta2, t));
      
      // Compute adaptive learning rate
      const adaptiveLR = params.learningRate / (Math.sqrt(secondMomentCorrected) + params.epsilon);
      
      // Update parameter
      return param - adaptiveLR * firstMomentCorrected;
    });
    
    // Save updated Adam moments
    this.adamFirstMoment.set(contextId, firstMoments);
    this.adamSecondMoment.set(contextId, secondMoments);
    
    return updatedParameters;
  }
  
  /**
   * Apply AdamW (Adam with decoupled weight decay) update
   */
  private applyAdamW(
    contextId: string,
    parameters: number[],
    gradients: number[],
    params: OptimizationParams
  ): number[] {
    const firstMoments = this.adamFirstMoment.get(contextId);
    const secondMoments = this.adamSecondMoment.get(contextId);
    const t = params.iteration + 1;
    
    const updatedParameters = parameters.map((param, i) => {
      // Update biased first moment estimate (momentum)
      firstMoments[i] = params.beta1 * firstMoments[i] + (1 - params.beta1) * gradients[i];
      
      // Update biased second moment estimate (RMSProp)
      secondMoments[i] = params.beta2 * secondMoments[i] + (1 - params.beta2) * gradients[i] * gradients[i];
      
      // Correct bias in first moment
      const firstMomentCorrected = firstMoments[i] / (1 - Math.pow(params.beta1, t));
      
      // Correct bias in second moment
      const secondMomentCorrected = secondMoments[i] / (1 - Math.pow(params.beta2, t));
      
      // Compute adaptive learning rate
      const adaptiveLR = params.learningRate / (Math.sqrt(secondMomentCorrected) + params.epsilon);
      
      // Apply decoupled weight decay
      const weightDecay = param * params.weightDecay;
      
      // Update parameter with decoupled weight decay
      return param - (adaptiveLR * firstMomentCorrected + params.learningRate * weightDecay);
    });
    
    // Save updated Adam moments
    this.adamFirstMoment.set(contextId, firstMoments);
    this.adamSecondMoment.set(contextId, secondMoments);
    
    return updatedParameters;
  }
  
  /**
   * Calculate the L2 norm of a vector
   */
  private calculateNorm(vector: number[]): number {
    return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  }
}
