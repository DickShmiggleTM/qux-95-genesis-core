/**
 * OptimizationTypes.ts
 * Type definitions for the optimization system in the QUX-95 Neural-Cybernetic Framework.
 */

/**
 * Configuration for an optimization process
 */
export interface OptimizationConfig {
  // Primary optimization method
  primaryMethod: string;
  
  // Secondary methods for hybrid approaches
  secondaryMethods?: string[];
  
  // Is this a hybrid optimization strategy
  isHybrid?: boolean;
  
  // Configuration for hybrid optimization
  hybridConfig?: any;
  
  // Objective function type ('minimize' or 'maximize')
  objectiveType: 'minimize' | 'maximize';
  
  // Function to compute the objective value and gradients
  objectiveFunction: (params: number[]) => { value: number; gradients: number[] };
  
  // Initial parameter values
  initialParameters: number[];
  
  // Maximum number of iterations
  maxIterations: number;
  
  // Convergence tolerance
  tolerance: number;
  
  // Initial learning rate
  initialLearningRate?: number;
  
  // Initial momentum value
  initialMomentum?: number;
  
  // Adam/RMSProp hyperparameters
  beta1?: number;
  beta2?: number;
  epsilon?: number;
  
  // Weight decay (L2 regularization coefficient)
  weightDecay?: number;
  
  // Learning rate scheduler
  learningRateScheduler?: string;
  
  // Learning rate scheduler configuration
  learningRateSchedulerConfig?: any;
  
  // Regularization method
  regularization?: string;
  
  // Regularization configuration
  regularizationConfig?: any;
  
  // Constraints on parameters
  constraints?: {
    type: 'box' | 'linear' | 'nonlinear';
    config: any;
  };
  
  // Additional method-specific options
  methodOptions?: Record<string, any>;
}

/**
 * Current parameters for an optimization process
 */
export interface OptimizationParams {
  // Current learning rate
  learningRate: number;
  
  // Current momentum
  momentum: number;
  
  // Adam/RMSProp parameters
  beta1: number;
  beta2: number;
  epsilon: number;
  
  // Weight decay
  weightDecay: number;
  
  // Current iteration count
  iteration: number;
  
  // Additional method-specific parameters
  [key: string]: any;
}

/**
 * Optimization step information
 */
export interface OptimizationStep {
  // Timestamp of the step
  timestamp: number;
  
  // Step data (method-specific)
  data: any;
}

/**
 * Result of an optimization process
 */
export interface OptimizationResult {
  // Best parameters found
  parameters: number[];
  
  // Final objective value
  finalValue: number;
  
  // Final loss value (may be different from objective value)
  finalLoss: number;
  
  // Number of iterations performed
  iterations: number;
  
  // Whether optimization converged
  converged: boolean;
  
  // Reason for termination
  terminationReason: string;
  
  // Time taken for optimization (milliseconds)
  timeTaken: number;
  
  // Additional result data (method-specific)
  additionalData?: any;
}

/**
 * Optimization context containing all information about an optimization process
 */
export interface OptimizationContext {
  // Unique ID for the optimization context
  id: string;
  
  // Configuration for the optimization
  config: OptimizationConfig;
  
  // Start time (timestamp)
  startTime: number;
  
  // End time (timestamp), null if still running
  endTime: number | null;
  
  // Current status
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Current optimization parameters
  currentParams: OptimizationParams;
  
  // History of optimization steps
  steps: OptimizationStep[];
  
  // Final result, null if not completed
  result: OptimizationResult | null;
}

/**
 * Interface for optimizer implementations
 */
export interface Optimizer {
  // Initialize the optimizer
  initialize(): Promise<void>;
  
  // Run optimization
  optimize(contextId: string, config: OptimizationConfig, params: OptimizationParams): Promise<OptimizationResult>;
  
  // Cancel ongoing optimization
  cancelOptimization(contextId: string): boolean;
}
