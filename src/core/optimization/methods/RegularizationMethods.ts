/**
 * RegularizationMethods.ts
 * Implementation of regularization methods for the QUX-95 Neural-Cybernetic Framework.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../utils/Logger';

export class RegularizationMethods extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;
  private activeRegularizers: Map<string, RegularizerState> = new Map();
  
  constructor() {
    super();
    this.logger = new Logger('RegularizationMethods');
  }
  
  /**
   * Initialize the regularization methods
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.logger.info('Initializing regularization methods');
    this.isInitialized = true;
  }
  
  /**
   * Apply regularization to an optimization context
   */
  public applyRegularization(
    contextId: string,
    regularizationType: string,
    config: any = {}
  ): void {
    if (!this.isInitialized) {
      throw new Error('RegularizationMethods not initialized');
    }
    
    const state: RegularizerState = {
      type: regularizationType,
      config,
      strength: config.strength || 0.01,
      active: true
    };
    
    this.activeRegularizers.set(contextId, state);
    this.logger.debug(`Applied ${regularizationType} regularization to context ${contextId}`);
    
    // Emit regularization applied event
    this.emit('regularizationApplied', contextId, {
      type: regularizationType,
      strength: state.strength,
      config
    });
  }
  
  /**
   * Compute regularization penalty and gradient contribution
   */
  public computeRegularization(
    contextId: string,
    parameters: number[]
  ): RegularizationResult {
    if (!this.activeRegularizers.has(contextId)) {
      // No regularization active, return zero penalty and gradients
      return {
        penalty: 0,
        gradients: new Array(parameters.length).fill(0)
      };
    }
    
    const state = this.activeRegularizers.get(contextId);
    
    // Apply the appropriate regularizer
    switch (state.type) {
      case 'l1':
        return this.applyL1Regularization(parameters, state);
        
      case 'l2':
        return this.applyL2Regularization(parameters, state);
        
      case 'elastic_net':
        return this.applyElasticNetRegularization(parameters, state);
        
      case 'group_lasso':
        return this.applyGroupLassoRegularization(parameters, state);
        
      case 'smoothed_l1':
        return this.applySmoothedL1Regularization(parameters, state);
        
      case 'orthogonal':
        return this.applyOrthogonalRegularization(parameters, state);
        
      case 'nuclear_norm':
        return this.applyNuclearNormRegularization(parameters, state);
        
      case 'custom':
        if (typeof state.config.customRegularizer === 'function') {
          return state.config.customRegularizer(parameters, state);
        }
        break;
        
      default:
        this.logger.warn(`Unknown regularizer type: ${state.type}, using no regularization`);
        return {
          penalty: 0,
          gradients: new Array(parameters.length).fill(0)
        };
    }
  }
  
  /**
   * Apply L1 regularization (Lasso)
   */
  private applyL1Regularization(
    parameters: number[],
    state: RegularizerState
  ): RegularizationResult {
    const strength = state.strength;
    
    // Compute L1 penalty: strength * sum(|params|)
    const penalty = strength * parameters.reduce((sum, param) => sum + Math.abs(param), 0);
    
    // Compute gradients: strength * sign(params)
    const gradients = parameters.map(param => strength * Math.sign(param));
    
    return { penalty, gradients };
  }
  
  /**
   * Apply L2 regularization (Ridge/Weight Decay)
   */
  private applyL2Regularization(
    parameters: number[],
    state: RegularizerState
  ): RegularizationResult {
    const strength = state.strength;
    
    // Compute L2 penalty: (strength/2) * sum(params^2)
    const penalty = (strength / 2) * parameters.reduce((sum, param) => sum + param * param, 0);
    
    // Compute gradients: strength * params
    const gradients = parameters.map(param => strength * param);
    
    return { penalty, gradients };
  }
  
  /**
   * Apply Elastic Net regularization (combination of L1 and L2)
   */
  private applyElasticNetRegularization(
    parameters: number[],
    state: RegularizerState
  ): RegularizationResult {
    const strength = state.strength;
    const l1Ratio = state.config.l1Ratio || 0.5; // Mix between L1 and L2 (default: 50%)
    
    // Compute L1 component
    const l1Strength = strength * l1Ratio;
    const l1Penalty = l1Strength * parameters.reduce((sum, param) => sum + Math.abs(param), 0);
    const l1Gradients = parameters.map(param => l1Strength * Math.sign(param));
    
    // Compute L2 component
    const l2Strength = strength * (1 - l1Ratio);
    const l2Penalty = (l2Strength / 2) * parameters.reduce((sum, param) => sum + param * param, 0);
    const l2Gradients = parameters.map(param => l2Strength * param);
    
    // Combine penalties and gradients
    const penalty = l1Penalty + l2Penalty;
    const gradients = l1Gradients.map((l1Grad, i) => l1Grad + l2Gradients[i]);
    
    return { penalty, gradients };
  }
  
  /**
   * Apply Group Lasso regularization
   */
  private applyGroupLassoRegularization(
    parameters: number[],
    state: RegularizerState
  ): RegularizationResult {
    const strength = state.strength;
    const groups = state.config.groups || []; // Array of parameter indices for each group
    
    if (groups.length === 0) {
      // No groups defined, treat as regular L2
      return this.applyL2Regularization(parameters, state);
    }
    
    let penalty = 0;
    const gradients = new Array(parameters.length).fill(0);
    
    // Apply group lasso to each group
    for (const group of groups) {
      // Extract parameters for this group
      const groupParams = group.map(idx => parameters[idx]);
      
      // Compute group norm
      const groupNorm = Math.sqrt(groupParams.reduce((sum, param) => sum + param * param, 0));
      
      // Add to penalty
      penalty += strength * groupNorm;
      
      // Compute gradients for this group
      if (groupNorm > 1e-10) {
        for (let i = 0; i < group.length; i++) {
          const idx = group[i];
          gradients[idx] = strength * parameters[idx] / groupNorm;
        }
      }
    }
    
    return { penalty, gradients };
  }
  
  /**
   * Apply Smoothed L1 regularization (Huber-like)
   */
  private applySmoothedL1Regularization(
    parameters: number[],
    state: RegularizerState
  ): RegularizationResult {
    const strength = state.strength;
    const delta = state.config.delta || 1.0; // Smoothing parameter
    
    let penalty = 0;
    const gradients = new Array(parameters.length).fill(0);
    
    // Apply smoothed L1 to each parameter
    for (let i = 0; i < parameters.length; i++) {
      const absParam = Math.abs(parameters[i]);
      
      if (absParam <= delta) {
        // Quadratic region
        penalty += strength * (0.5 * absParam * absParam / delta);
        gradients[i] = strength * parameters[i] / delta;
      } else {
        // Linear region
        penalty += strength * (absParam - 0.5 * delta);
        gradients[i] = strength * Math.sign(parameters[i]);
      }
    }
    
    return { penalty, gradients };
  }
  
  /**
   * Apply Orthogonal regularization (encourages orthogonal weights)
   */
  private applyOrthogonalRegularization(
    parameters: number[],
    state: RegularizerState
  ): RegularizationResult {
    const strength = state.strength;
    const shapes = state.config.shapes || []; // Array of [rows, cols] for weight matrices
    
    if (shapes.length === 0) {
      // No shapes defined, return zero penalty
      return {
        penalty: 0,
        gradients: new Array(parameters.length).fill(0)
      };
    }
    
    let penalty = 0;
    const gradients = new Array(parameters.length).fill(0);
    let paramIdx = 0;
    
    // Process each weight matrix
    for (const [rows, cols] of shapes) {
      // Extract matrix parameters
      const matrix = [];
      for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
          row.push(parameters[paramIdx++]);
        }
        matrix.push(row);
      }
      
      // Compute W^T * W
      const WTW = [];
      for (let i = 0; i < cols; i++) {
        WTW[i] = [];
        for (let j = 0; j < cols; j++) {
          let sum = 0;
          for (let k = 0; k < rows; k++) {
            sum += matrix[k][i] * matrix[k][j];
          }
          WTW[i][j] = sum;
        }
      }
      
      // Compute ||W^T * W - I||_F^2
      let orthPenalty = 0;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < cols; j++) {
          const target = i === j ? 1 : 0;
          orthPenalty += Math.pow(WTW[i][j] - target, 2);
        }
      }
      
      penalty += strength * orthPenalty;
      
      // Compute gradients (simplified version)
      paramIdx -= rows * cols; // Reset parameter index
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          let grad = 0;
          for (let k = 0; k < cols; k++) {
            const target = j === k ? 1 : 0;
            grad += 4 * strength * (WTW[j][k] - target) * matrix[i][k];
          }
          gradients[paramIdx++] = grad;
        }
      }
    }
    
    return { penalty, gradients };
  }
  
  /**
   * Apply Nuclear Norm regularization (sum of singular values)
   */
  private applyNuclearNormRegularization(
    parameters: number[],
    state: RegularizerState
  ): RegularizationResult {
    const strength = state.strength;
    const shapes = state.config.shapes || []; // Array of [rows, cols] for weight matrices
    
    if (shapes.length === 0) {
      // No shapes defined, return zero penalty
      return {
        penalty: 0,
        gradients: new Array(parameters.length).fill(0)
      };
    }
    
    // Note: Actual implementation would compute SVD and derivatives
    // For simplicity, we'll use a Frobenius norm approximation
    
    let penalty = 0;
    const gradients = new Array(parameters.length).fill(0);
    let paramIdx = 0;
    
    // Process each weight matrix
    for (const [rows, cols] of shapes) {
      // Extract matrix parameters
      const matrix = [];
      for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
          row.push(parameters[paramIdx++]);
        }
        matrix.push(row);
      }
      
      // Compute Frobenius norm as approximation
      let frobNorm = 0;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          frobNorm += matrix[i][j] * matrix[i][j];
        }
      }
      frobNorm = Math.sqrt(frobNorm);
      
      penalty += strength * frobNorm;
      
      // Compute gradients
      paramIdx -= rows * cols; // Reset parameter index
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          gradients[paramIdx] = strength * matrix[i][j] / (frobNorm + 1e-10);
          paramIdx++;
        }
      }
    }
    
    return { penalty, gradients };
  }
  
  /**
   * Get the current state of a regularizer
   */
  public getRegularizerState(contextId: string): RegularizerState {
    if (!this.activeRegularizers.has(contextId)) {
      throw new Error(`No regularizer attached to context ${contextId}`);
    }
    
    return this.activeRegularizers.get(contextId);
  }
  
  /**
   * Adjust regularization strength
   */
  public adjustRegularizationStrength(contextId: string, newStrength: number): boolean {
    if (!this.activeRegularizers.has(contextId)) {
      return false;
    }
    
    const state = this.activeRegularizers.get(contextId);
    state.strength = newStrength;
    
    // Emit regularization updated event
    this.emit('regularizationUpdated', contextId, {
      type: state.type,
      strength: state.strength
    });
    
    return true;
  }
  
  /**
   * Remove regularization from an optimization context
   */
  public removeRegularization(contextId: string): boolean {
    if (!this.activeRegularizers.has(contextId)) {
      return false;
    }
    
    this.activeRegularizers.delete(contextId);
    return true;
  }
}

/**
 * Internal state for regularizers
 */
interface RegularizerState {
  type: string;
  config: any;
  strength: number;
  active: boolean;
}

/**
 * Result of applying regularization
 */
export interface RegularizationResult {
  penalty: number;
  gradients: number[];
}
