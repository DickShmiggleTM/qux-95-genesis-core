/**
 * Quantum Reasoning Service
 * 
 * Provides an interface for interacting with the quantum reasoning capabilities
 * of the QUX-95 system, including enhanced reasoning and quantum analysis.
 */

import { apiClient } from '../utils/moduleAPIClient';
import { toast } from 'sonner';
import { reasoningSystem } from './reasoningSystem';

// API response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Quantum reasoning interfaces
export interface QuantumEnhancedReasoningRequest {
  problem: string;
  options?: {
    objectives?: string[];
    constraints?: string[];
    actions?: string[];
    numPathways?: number;
  };
}

export interface QuantumAnalysisRequest {
  text: string;
  options?: {
    numPathways?: number;
    includeDetails?: boolean;
  };
}

export interface QuantumReasoningResult {
  problem: string;
  pathway: any;
  outcomes: string[];
  overall_result: 'success' | 'partial_success' | 'failure';
  confidence: number;
  quantum_states: any[];
  reasoning_enhanced: boolean;
}

class QuantumReasoningService {
  private apiBasePath: string = '/api/quantum-reasoning';
  private isInitialized: boolean = false;
  
  constructor() {
    this.initialize();
  }
  
  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Set the base URL for API requests
      const baseUrl = process.env.API_URL || 'http://localhost:5000';
      apiClient.setBaseUrl(baseUrl);
      
      this.isInitialized = true;
      console.log('Quantum Reasoning Service initialized');
    } catch (error) {
      console.error('Failed to initialize Quantum Reasoning Service:', error);
      toast.error('Quantum Reasoning Service initialization failed', {
        description: 'Could not connect to the quantum reasoning API'
      });
    }
  }
  
  /**
   * Enhance reasoning with quantum decision-making
   */
  public async enhanceReasoning(
    request: QuantumEnhancedReasoningRequest
  ): Promise<QuantumReasoningResult> {
    try {
      const response = await apiClient.post<ApiResponse<QuantumReasoningResult>>(
        `${this.apiBasePath}/enhance`,
        request
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to enhance reasoning');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error enhancing reasoning:', error);
      throw error;
    }
  }
  
  /**
   * Analyze text using quantum-enhanced reasoning
   */
  public async analyzeText(
    request: QuantumAnalysisRequest
  ): Promise<QuantumReasoningResult> {
    try {
      const response = await apiClient.post<ApiResponse<QuantumReasoningResult>>(
        `${this.apiBasePath}/analyze`,
        request
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to analyze text');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error analyzing text:', error);
      throw error;
    }
  }
  
  /**
   * Solve a problem with quantum-enhanced reasoning
   * This method integrates with the existing reasoning system
   */
  public async solveProblem(
    problem: string,
    options: {
      objectives?: string[];
      constraints?: string[];
      actions?: string[];
      numPathways?: number;
      temperature?: number;
    } = {}
  ): Promise<any> {
    try {
      // First, use the standard reasoning system
      const standardResult = await reasoningSystem.solve(problem, {
        temperature: options.temperature || 0.3
      });
      
      // Then, enhance with quantum reasoning
      const quantumResult = await this.enhanceReasoning({
        problem,
        options: {
          objectives: options.objectives,
          constraints: options.constraints,
          actions: options.actions,
          numPathways: options.numPathways || 5
        }
      });
      
      // Combine the results
      return {
        problem,
        answer: standardResult.answer,
        reasoning: standardResult.reasoning,
        quantum_enhancement: {
          outcomes: quantumResult.outcomes,
          overall_result: quantumResult.overall_result,
          confidence: quantumResult.confidence
        },
        confidence: (standardResult.confidence + quantumResult.confidence) / 2,
        timeToSolve: standardResult.timeToSolve,
        modelUsed: standardResult.modelUsed
      };
    } catch (error) {
      console.error('Error solving problem with quantum enhancement:', error);
      
      // Fall back to standard reasoning
      toast.error('Quantum reasoning failed', {
        description: 'Falling back to standard reasoning'
      });
      
      return reasoningSystem.solve(problem, {
        temperature: options.temperature || 0.3
      });
    }
  }
}

// Export singleton instance
export const quantumReasoningService = new QuantumReasoningService();
export default QuantumReasoningService;
