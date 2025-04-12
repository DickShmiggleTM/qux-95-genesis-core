/**
 * LearningRateSchedulers.ts
 * Implementation of learning rate schedulers for the QUX-95 Neural-Cybernetic Framework.
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../utils/Logger';

export class LearningRateSchedulers extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;
  private activeSchedulers: Map<string, SchedulerState> = new Map();
  
  constructor() {
    super();
    this.logger = new Logger('LearningRateSchedulers');
  }
  
  /**
   * Initialize the learning rate schedulers
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.logger.info('Initializing learning rate schedulers');
    this.isInitialized = true;
  }
  
  /**
   * Attach a scheduler to an optimization context
   */
  public attachScheduler(
    contextId: string,
    schedulerType: string,
    config: any = {}
  ): void {
    if (!this.isInitialized) {
      throw new Error('LearningRateSchedulers not initialized');
    }
    
    const state: SchedulerState = {
      type: schedulerType,
      config,
      iteration: 0,
      epoch: 0,
      initialLearningRate: config.initialLearningRate || 0.01,
      currentLearningRate: config.initialLearningRate || 0.01,
      history: [],
      bestLoss: Infinity,
      bestIteration: 0,
      patience: config.patience || 10,
      patienceCounter: 0
    };
    
    this.activeSchedulers.set(contextId, state);
    this.logger.debug(`Attached ${schedulerType} scheduler to context ${contextId}`);
  }
  
  /**
   * Update learning rate based on current state
   */
  public updateLearningRate(
    contextId: string,
    iteration: number,
    epoch?: number,
    metrics?: any
  ): number {
    if (!this.activeSchedulers.has(contextId)) {
      throw new Error(`No scheduler attached to context ${contextId}`);
    }
    
    const state = this.activeSchedulers.get(contextId);
    state.iteration = iteration;
    if (epoch !== undefined) state.epoch = epoch;
    
    // Store loss in history if provided
    if (metrics && metrics.loss !== undefined) {
      state.history.push({
        iteration,
        loss: metrics.loss
      });
      
      // Update best loss if current loss is better
      if (metrics.loss < state.bestLoss) {
        state.bestLoss = metrics.loss;
        state.bestIteration = iteration;
        state.patienceCounter = 0;
      } else {
        state.patienceCounter += 1;
      }
    }
    
    // Apply the appropriate scheduler
    let newLearningRate = state.currentLearningRate;
    
    switch (state.type) {
      case 'step':
        newLearningRate = this.applyStepDecay(state);
        break;
        
      case 'exponential':
        newLearningRate = this.applyExponentialDecay(state);
        break;
        
      case 'cosine':
        newLearningRate = this.applyCosineAnnealing(state);
        break;
        
      case 'reduce_on_plateau':
        newLearningRate = this.applyReduceOnPlateau(state);
        break;
        
      case 'one_cycle':
        newLearningRate = this.applyOneCyclePolicy(state);
        break;
        
      case 'custom':
        if (typeof state.config.customScheduler === 'function') {
          newLearningRate = state.config.customScheduler(state);
        }
        break;
        
      default:
        this.logger.warn(`Unknown scheduler type: ${state.type}, using current learning rate`);
    }
    
    // Update current learning rate
    state.currentLearningRate = newLearningRate;
    
    // Emit learning rate changed event
    this.emit('learningRateChanged', contextId, newLearningRate);
    
    return newLearningRate;
  }
  
  /**
   * Apply step decay learning rate schedule
   */
  private applyStepDecay(state: SchedulerState): number {
    const stepSize = state.config.stepSize || 10;
    const gamma = state.config.gamma || 0.1;
    
    const stepCount = Math.floor(state.iteration / stepSize);
    return state.initialLearningRate * Math.pow(gamma, stepCount);
  }
  
  /**
   * Apply exponential decay learning rate schedule
   */
  private applyExponentialDecay(state: SchedulerState): number {
    const gamma = state.config.gamma || 0.95;
    return state.initialLearningRate * Math.pow(gamma, state.iteration);
  }
  
  /**
   * Apply cosine annealing learning rate schedule
   */
  private applyCosineAnnealing(state: SchedulerState): number {
    const T_max = state.config.T_max || 50;
    const eta_min = state.config.eta_min || 0;
    
    // Handle restart if configured
    let currentIteration = state.iteration;
    if (state.config.withRestarts) {
      currentIteration = currentIteration % T_max;
    }
    
    const cosine = 0.5 * (1 + Math.cos(Math.PI * currentIteration / T_max));
    return eta_min + (state.initialLearningRate - eta_min) * cosine;
  }
  
  /**
   * Apply reduce on plateau learning rate schedule
   */
  private applyReduceOnPlateau(state: SchedulerState): number {
    const factor = state.config.factor || 0.1;
    const patience = state.config.patience || 10;
    const minLR = state.config.minLR || 1e-6;
    
    // Only reduce learning rate if patience is exceeded
    if (state.patienceCounter > patience) {
      state.patienceCounter = 0;
      const reducedLR = state.currentLearningRate * factor;
      return Math.max(reducedLR, minLR);
    }
    
    return state.currentLearningRate;
  }
  
  /**
   * Apply one cycle policy learning rate schedule
   */
  private applyOneCyclePolicy(state: SchedulerState): number {
    const cycleLength = state.config.cycleLength || 100;
    const maxLR = state.config.maxLR || 10 * state.initialLearningRate;
    const finalDivFactor = state.config.finalDivFactor || 1000;
    const iteration = state.iteration;
    
    // First half of cycle: increase linearly
    if (iteration < cycleLength / 2) {
      const t = iteration / (cycleLength / 2);
      return state.initialLearningRate + t * (maxLR - state.initialLearningRate);
    }
    // Second half of cycle: decrease linearly to initial LR
    else if (iteration < cycleLength) {
      const t = (iteration - cycleLength / 2) / (cycleLength / 2);
      return maxLR - t * (maxLR - state.initialLearningRate);
    }
    // After cycle: decrease further to final LR
    else {
      const remainingIterations = state.config.totalIterations - cycleLength;
      const t = Math.min(1, (iteration - cycleLength) / remainingIterations);
      const finalLR = state.initialLearningRate / finalDivFactor;
      return state.initialLearningRate - t * (state.initialLearningRate - finalLR);
    }
  }
  
  /**
   * Get the current state of a scheduler
   */
  public getSchedulerState(contextId: string): SchedulerState {
    if (!this.activeSchedulers.has(contextId)) {
      throw new Error(`No scheduler attached to context ${contextId}`);
    }
    
    return this.activeSchedulers.get(contextId);
  }
  
  /**
   * Remove a scheduler from an optimization context
   */
  public removeScheduler(contextId: string): boolean {
    if (!this.activeSchedulers.has(contextId)) {
      return false;
    }
    
    this.activeSchedulers.delete(contextId);
    return true;
  }
}

/**
 * Internal state for learning rate schedulers
 */
interface SchedulerState {
  type: string;
  config: any;
  iteration: number;
  epoch: number;
  initialLearningRate: number;
  currentLearningRate: number;
  history: { iteration: number; loss: number }[];
  bestLoss: number;
  bestIteration: number;
  patience: number;
  patienceCounter: number;
}
