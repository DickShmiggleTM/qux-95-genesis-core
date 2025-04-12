/**
 * SecondOrderMethods.ts
 * Implementation of second-order optimization methods for the QUX-95 Neural-Cybernetic Framework.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../utils/Logger';
import { OptimizationConfig, OptimizationParams, OptimizationResult, Optimizer } from '../types/OptimizationTypes';

/**
 * Second-order optimization methods including:
 * - Newton's Method
 * - Quasi-Newton Methods (BFGS)
 * - Limited-memory BFGS (L-BFGS)
 * - Conjugate Gradient (CG)
 * - Gauss-Newton Method
 */
export class SecondOrderMethods extends EventEmitter implements Optimizer {
  private logger: Logger;
  private isInitialized: boolean = false;
  private activeOptimizations: Map<string, boolean> = new Map();
  
  // Method-specific state
  private hessianApproximations: Map<string, number[][]> = new Map();
  private bfgsHistory: Map<string, {s: number[], y: number[]}[]> = new Map();
  private cgDirections: Map<string, number[]> = new Map();
  
  constructor() {
    super();
    this.logger = new Logger('SecondOrderMethods');
  }
  
  /**
   * Initialize the second-order methods
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.logger.info('Initializing second-order optimization methods');
    this.isInitialized = true;
  }
  
  /**
   * Run optimization using the specified second-order method
   */
  public async optimize(
    contextId: string,
    config: OptimizationConfig,
    params: OptimizationParams
  ): Promise<OptimizationResult> {
    if (!this.isInitialized) {
      throw new Error('SecondOrderMethods not initialized');
    }
    
    // Set active flag for this optimization
    this.activeOptimizations.set(contextId, true);
    
    // Initialize method-specific state
    this.initializeMethodState(contextId, config);
    
    // Create local variables for optimization
    const startTime = Date.now();
    let currentParameters = [...config.initialParameters];
    let previousParameters: number[] = null;
    let previousGradients: number[] = null;
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
        
        // Store previous parameters and gradients for BFGS update
        if (iteration > 0) {
          previousParameters = [...currentParameters];
          previousGradients = gradients;
        }
        
        // Apply the selected optimization method
        switch (config.primaryMethod) {
          case 'newton':
            currentParameters = this.applyNewton(contextId, currentParameters, gradients, config, params);
            break;
            
          case 'bfgs':
            currentParameters = this.applyBFGS(contextId, currentParameters, gradients, previousParameters, previousGradients, params);
            break;
            
          case 'lbfgs':
            currentParameters = this.applyLBFGS(contextId, currentParameters, gradients, params, config.methodOptions?.historySize || 10);
            break;
            
          case 'cg':
            currentParameters = this.applyCG(contextId, currentParameters, gradients, iteration, params);
            break;
            
          default:
            // Default to BFGS
            currentParameters = this.applyBFGS(contextId, currentParameters, gradients, previousParameters, previousGradients, params);
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
      
      // Clean up method-specific state
      this.cleanupMethodState(contextId);
      this.activeOptimizations.delete(contextId);
      
      return result;
    } catch (error) {
      this.logger.error(`Optimization error for context ${contextId}: ${error}`);
      this.cleanupMethodState(contextId);
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
   * Initialize method-specific state for a new optimization
   */
  private initializeMethodState(contextId: string, config: OptimizationConfig): void {
    const paramSize = config.initialParameters.length;
    
    // Initialize Hessian approximation for Newton's method or BFGS
    if (['newton', 'bfgs'].includes(config.primaryMethod)) {
      // Create identity matrix as initial Hessian approximation for BFGS
      if (config.primaryMethod === 'bfgs') {
        const identity = Array(paramSize).fill(0).map((_, i) => 
          Array(paramSize).fill(0).map((_, j) => i === j ? 1 : 0)
        );
        this.hessianApproximations.set(contextId, identity);
      }
    }
    
    // Initialize BFGS history for L-BFGS
    if (config.primaryMethod === 'lbfgs') {
      this.bfgsHistory.set(contextId, []);
    }
    
    // Initialize CG direction
    if (config.primaryMethod === 'cg') {
      this.cgDirections.set(contextId, Array(paramSize).fill(0));
    }
  }
  
  /**
   * Clean up method-specific state after optimization
   */
  private cleanupMethodState(contextId: string): void {
    this.hessianApproximations.delete(contextId);
    this.bfgsHistory.delete(contextId);
    this.cgDirections.delete(contextId);
  }
  
  /**
   * Apply Newton's Method update
   * Uses the inverse Hessian to determine the update direction
   */
  private applyNewton(
    contextId: string,
    parameters: number[],
    gradients: number[],
    config: OptimizationConfig,
    params: OptimizationParams
  ): number[] {
    // For Newton's method, we need the Hessian matrix
    // This would normally be provided by the objective function
    // Here we'll use a numerical approximation or the provided Hessian
    
    // In a real implementation, we'd compute or approximate the Hessian
    // For simplicity, we'll use a simple approximation here
    const hessian = this.approximateHessian(parameters, gradients, config);
    
    // Compute the inverse Hessian (or use a more efficient solver in practice)
    const invHessian = this.invertMatrix(hessian);
    
    // Compute the Newton direction: -H^(-1) * g
    const direction = this.matrixVectorMultiply(invHessian, gradients).map(x => -x);
    
    // Perform line search to determine step size
    const stepSize = 1.0; // In a real implementation, use line search
    
    // Update parameters
    return parameters.map((param, i) => param + stepSize * direction[i]);
  }
  
  /**
   * Apply BFGS (Broyden-Fletcher-Goldfarb-Shanno) update
   * Builds an approximation to the inverse Hessian matrix
   */
  private applyBFGS(
    contextId: string,
    parameters: number[],
    gradients: number[],
    previousParameters: number[],
    previousGradients: number[],
    params: OptimizationParams
  ): number[] {
    const hessianApprox = this.hessianApproximations.get(contextId);
    
    // In the first iteration, use steepest descent direction
    if (!previousParameters || !previousGradients) {
      const direction = gradients.map(g => -g);
      const stepSize = params.learningRate;
      return parameters.map((param, i) => param + stepSize * direction[i]);
    }
    
    // Compute parameter and gradient differences
    const s = parameters.map((p, i) => p - previousParameters[i]); // Parameter difference
    const y = gradients.map((g, i) => g - previousGradients[i]);   // Gradient difference
    
    // Compute dot products needed for BFGS update
    const sDotY = this.dotProduct(s, y);
    
    // Skip update if curvature condition is not satisfied
    if (sDotY <= 0) {
      const direction = this.matrixVectorMultiply(hessianApprox, gradients).map(x => -x);
      const stepSize = params.learningRate;
      return parameters.map((param, i) => param + stepSize * direction[i]);
    }
    
    // Compute intermediate terms for BFGS update
    const rho = 1.0 / sDotY;
    
    // Update Hessian approximation using BFGS formula
    const n = parameters.length;
    const updatedHessian = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // BFGS update formula (simplified version, real implementation would be more efficient)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const term1 = (i === j ? 1 : 0) - rho * s[i] * y[j];
        const term2 = (i === j ? 1 : 0) - rho * y[i] * s[j];
        const term3 = rho * s[i] * s[j];
        
        let sum = 0;
        for (let k = 0; k < n; k++) {
          for (let l = 0; l < n; l++) {
            sum += term1 * hessianApprox[k][l] * term2;
          }
        }
        
        updatedHessian[i][j] = sum + term3;
      }
    }
    
    // Save updated Hessian approximation
    this.hessianApproximations.set(contextId, updatedHessian);
    
    // Compute search direction using inverse Hessian approximation
    const direction = this.matrixVectorMultiply(updatedHessian, gradients).map(x => -x);
    
    // Perform line search to determine step size
    const stepSize = 1.0; // In a real implementation, use line search
    
    // Update parameters
    return parameters.map((param, i) => param + stepSize * direction[i]);
  }
  
  /**
   * Apply L-BFGS (Limited-memory BFGS) update
   * Memory-efficient variant that stores only a limited history of updates
   */
  private applyLBFGS(
    contextId: string,
    parameters: number[],
    gradients: number[],
    params: OptimizationParams,
    historySize: number
  ): number[] {
    const history = this.bfgsHistory.get(contextId);
    const n = parameters.length;
    
    // In the first iteration, use steepest descent direction
    if (params.iteration === 0) {
      const direction = gradients.map(g => -g);
      const stepSize = params.learningRate;
      return parameters.map((param, i) => param + stepSize * direction[i]);
    }
    
    // Get previous parameters and gradients from history
    const prevParams = params['prevParams'] || parameters;
    const prevGradients = params['prevGradients'] || gradients;
    
    // Compute parameter and gradient differences
    const s = parameters.map((p, i) => p - prevParams[i]); // Parameter difference
    const y = gradients.map((g, i) => g - prevGradients[i]); // Gradient difference
    
    // Compute dot product for curvature condition
    const sDotY = this.dotProduct(s, y);
    
    // Skip update if curvature condition is not satisfied
    if (sDotY <= 0) {
      const direction = gradients.map(g => -g);
      const stepSize = params.learningRate;
      return parameters.map((param, i) => param + stepSize * direction[i]);
    }
    
    // Update history
    history.push({ s, y });
    
    // Keep only the most recent pairs
    while (history.length > historySize) {
      history.shift();
    }
    
    // Two-loop recursion to compute L-BFGS direction
    let q = [...gradients];
    const alphas = [];
    
    // First loop
    for (let i = history.length - 1; i >= 0; i--) {
      const { s, y } = history[i];
      const rho = 1.0 / this.dotProduct(s, y);
      const alpha = rho * this.dotProduct(s, q);
      alphas.unshift(alpha);
      
      q = q.map((qVal, j) => qVal - alpha * y[j]);
    }
    
    // Initial Hessian approximation (scaled identity)
    const gamma = sDotY / this.dotProduct(y, y);
    let z = q.map(qVal => qVal * gamma);
    
    // Second loop
    for (let i = 0; i < history.length; i++) {
      const { s, y } = history[i];
      const rho = 1.0 / this.dotProduct(s, y);
      const beta = rho * this.dotProduct(y, z);
      const alpha = alphas[i];
      
      z = z.map((zVal, j) => zVal + (alpha - beta) * s[j]);
    }
    
    // L-BFGS direction is -z
    const direction = z.map(zVal => -zVal);
    
    // Save current parameters and gradients for next iteration
    params['prevParams'] = [...parameters];
    params['prevGradients'] = [...gradients];
    
    // Perform line search to determine step size
    const stepSize = 1.0; // In a real implementation, use line search
    
    // Update parameters
    return parameters.map((param, i) => param + stepSize * direction[i]);
  }
  
  /**
   * Apply Conjugate Gradient (CG) update
   * Generates search directions that are conjugate with respect to the Hessian
   */
  private applyCG(
    contextId: string,
    parameters: number[],
    gradients: number[],
    iteration: number,
    params: OptimizationParams
  ): number[] {
    let direction = this.cgDirections.get(contextId);
    
    // In the first iteration or every n iterations (restart), use steepest descent
    if (iteration === 0 || iteration % parameters.length === 0) {
      direction = gradients.map(g => -g);
    } else {
      // Get previous gradients
      const prevGradients = params['prevGradients'] || gradients;
      
      // Compute beta (Fletcher-Reeves formula)
      const beta = this.dotProduct(gradients, gradients) / this.dotProduct(prevGradients, prevGradients);
      
      // Update direction
      direction = gradients.map((g, i) => -g + beta * direction[i]);
    }
    
    // Save direction for next iteration
    this.cgDirections.set(contextId, direction);
    
    // Save current gradients for next iteration
    params['prevGradients'] = [...gradients];
    
    // Perform line search to determine step size
    const stepSize = params.learningRate; // In a real implementation, use line search
    
    // Update parameters
    return parameters.map((param, i) => param + stepSize * direction[i]);
  }
  
  // Helper functions
  
  /**
   * Calculate the L2 norm of a vector
   */
  private calculateNorm(vector: number[]): number {
    return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  }
  
  /**
   * Compute dot product of two vectors
   */
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
  
  /**
   * Multiply matrix by vector
   */
  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => this.dotProduct(row, vector));
  }
  
  /**
   * Approximate Hessian matrix using finite differences
   * This is a simple approximation for demonstration
   */
  private approximateHessian(
    parameters: number[],
    gradients: number[],
    config: OptimizationConfig
  ): number[][] {
    const n = parameters.length;
    const hessian = Array(n).fill(0).map(() => Array(n).fill(0));
    const epsilon = 1e-6;
    
    // Simple finite difference approximation
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        // Compute Hessian element using finite differences
        if (i === j) {
          // Diagonal element - use centered difference on gradient
          const paramsPlus = [...parameters];
          paramsPlus[i] += epsilon;
          const gradPlus = config.objectiveFunction(paramsPlus).gradients;
          
          const paramsMinus = [...parameters];
          paramsMinus[i] -= epsilon;
          const gradMinus = config.objectiveFunction(paramsMinus).gradients;
          
          hessian[i][j] = (gradPlus[i] - gradMinus[i]) / (2 * epsilon);
        } else {
          // Off-diagonal element - use mixed partial derivative
          const paramsPlus = [...parameters];
          paramsPlus[i] += epsilon;
          paramsPlus[j] += epsilon;
          const gradPlusPlus = config.objectiveFunction(paramsPlus).gradients;
          
          const paramsIMinus = [...parameters];
          paramsIMinus[i] -= epsilon;
          paramsIMinus[j] += epsilon;
          const gradIMinusJPlus = config.objectiveFunction(paramsIMinus).gradients;
          
          const paramsJMinus = [...parameters];
          paramsJMinus[i] += epsilon;
          paramsJMinus[j] -= epsilon;
          const gradIPlusJMinus = config.objectiveFunction(paramsJMinus).gradients;
          
          const paramsMinus = [...parameters];
          paramsMinus[i] -= epsilon;
          paramsMinus[j] -= epsilon;
          const gradMinus = config.objectiveFunction(paramsMinus).gradients;
          
          // Mixed partial derivative
          hessian[i][j] = (gradPlusPlus[i] - gradIMinusJPlus[i] - gradIPlusJMinus[i] + gradMinus[i]) / (4 * epsilon * epsilon);
          hessian[j][i] = hessian[i][j]; // Symmetric
        }
      }
    }
    
    return hessian;
  }
  
  /**
   * Invert a matrix (simple implementation for demonstration)
   * In a real implementation, use a more efficient method
   */
  private invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    
    // Simple matrix inversion using Gaussian elimination with pivoting
    // This is not the most efficient or numerically stable method
    // In practice, use a specialized library or more robust algorithm
    
    // Create augmented matrix [A|I]
    const augmented = matrix.map((row, i) => [
      ...row,
      ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    ]);
    
    // Gaussian elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      let maxVal = Math.abs(augmented[i][i]);
      
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(augmented[j][i]);
        if (absVal > maxVal) {
          maxRow = j;
          maxVal = absVal;
        }
      }
      
      // Swap rows if needed
      if (maxRow !== i) {
        [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      }
      
      // Scale pivot row
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) {
        // Matrix is singular or nearly singular
        throw new Error('Matrix is singular or ill-conditioned');
      }
      
      for (let j = i; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      // Eliminate other rows
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          const factor = augmented[j][i];
          for (let k = i; k < 2 * n; k++) {
            augmented[j][k] -= factor * augmented[i][k];
          }
        }
      }
    }
    
    // Extract the inverse from the right half of the augmented matrix
    return augmented.map(row => row.slice(n));
  }
}
