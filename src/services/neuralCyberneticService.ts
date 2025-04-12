/**
 * Neural Cybernetic Service
 * 
 * Provides an interface for interacting with the neural-cybernetic capabilities
 * of the QUX-95 system, including the neural mesh network, quantum decision engine,
 * and biomimetic repair network.
 */

import { apiClient } from '../utils/moduleAPIClient';
import { toast } from 'sonner';
import { NeuralNode, NeuralConnection, TopologyMetrics } from '../core/modules/neural/NeuralMeshNetwork';
import { QuantumState, QuantumPathway, DecisionContext } from '../core/modules/quantum/QuantumDecisionEngine';
import { CodeAnomaly, RepairStrategy } from '../core/modules/biomimetic/BiomimeticRepairNetwork';

// API response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Neural mesh network interfaces
export interface NeuralMeshTopologyResponse {
  nodes: NeuralNode[];
  connections: NeuralConnection[];
  metrics: TopologyMetrics;
}

export interface NeuralMeshActivationRequest {
  inputActivations: Record<string, number>;
}

export interface NeuralMeshActivationResponse {
  outputActivations: Record<string, number>;
  activationPath?: NeuralConnection[];
}

// Quantum decision engine interfaces
export interface QuantumDecisionRequest {
  context: DecisionContext;
  options?: {
    numPathways?: number;
    evaluationDepth?: number;
    includeEntanglement?: boolean;
  };
}

export interface QuantumDecisionResponse {
  recommendedPathway: QuantumPathway;
  alternativePathways: QuantumPathway[];
  quantumStates: QuantumState[];
  confidence: number;
}

export interface QuantumStateRequest {
  stateIds?: string[];
  includeCollapsed?: boolean;
  limit?: number;
}

// Biomimetic repair interfaces
export interface AnomalyDetectionRequest {
  codeSnippet: string;
  filePath?: string;
  options?: {
    sensitivity?: number;
    includeWarnings?: boolean;
    includeSmells?: boolean;
  };
}

export interface AnomalyDetectionResponse {
  anomalies: CodeAnomaly[];
  suggestedFixes: RepairStrategy[];
}

export interface RepairRequest {
  anomalyId: string;
  options?: {
    autoApprove?: boolean;
    repairStrategy?: string;
  };
}

export interface RepairResponse {
  success: boolean;
  appliedFix?: string;
  modifiedFile?: string;
}

class NeuralCyberneticService {
  private apiBasePath: string = '/api/neural-cybernetic';
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
      console.log('Neural Cybernetic Service initialized');
    } catch (error) {
      console.error('Failed to initialize Neural Cybernetic Service:', error);
      toast.error('Neural Cybernetic Service initialization failed', {
        description: 'Could not connect to the neural-cybernetic API'
      });
    }
  }
  
  /**
   * Get the current neural mesh network topology
   */
  public async getNeuralMeshTopology(): Promise<NeuralMeshTopologyResponse> {
    try {
      const response = await apiClient.get<ApiResponse<NeuralMeshTopologyResponse>>(
        `${this.apiBasePath}/neural-mesh/topology`
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get neural mesh topology');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error getting neural mesh topology:', error);
      throw error;
    }
  }
  
  /**
   * Activate the neural mesh network with input values
   */
  public async activateNeuralMesh(
    inputActivations: Record<string, number>
  ): Promise<NeuralMeshActivationResponse> {
    try {
      const response = await apiClient.post<ApiResponse<NeuralMeshActivationResponse>>(
        `${this.apiBasePath}/neural-mesh/activate`,
        { inputActivations }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to activate neural mesh');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error activating neural mesh:', error);
      throw error;
    }
  }
  
  /**
   * Trigger evolution of the neural mesh network
   */
  public async evolveNeuralMesh(): Promise<boolean> {
    try {
      const response = await apiClient.post<ApiResponse<{ evolved: boolean }>>(
        `${this.apiBasePath}/neural-mesh/evolve`,
        {}
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to evolve neural mesh');
      }
      
      return response.data.evolved;
    } catch (error) {
      console.error('Error evolving neural mesh:', error);
      throw error;
    }
  }
  
  /**
   * Make a decision using the quantum decision engine
   */
  public async makeQuantumDecision(
    request: QuantumDecisionRequest
  ): Promise<QuantumDecisionResponse> {
    try {
      const response = await apiClient.post<ApiResponse<QuantumDecisionResponse>>(
        `${this.apiBasePath}/quantum/decide`,
        request
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to make quantum decision');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error making quantum decision:', error);
      throw error;
    }
  }
  
  /**
   * Get quantum states from the quantum decision engine
   */
  public async getQuantumStates(
    request: QuantumStateRequest = {}
  ): Promise<QuantumState[]> {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (request.stateIds && request.stateIds.length > 0) {
        params.append('stateIds', request.stateIds.join(','));
      }
      
      if (request.includeCollapsed !== undefined) {
        params.append('includeCollapsed', request.includeCollapsed.toString());
      }
      
      if (request.limit !== undefined) {
        params.append('limit', request.limit.toString());
      }
      
      const queryString = params.toString();
      const url = `${this.apiBasePath}/quantum/states${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<ApiResponse<{ states: QuantumState[] }>>(url);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get quantum states');
      }
      
      return response.data.states;
    } catch (error) {
      console.error('Error getting quantum states:', error);
      throw error;
    }
  }
  
  /**
   * Collapse a quantum state to a definite value
   */
  public async collapseQuantumState(stateId: string): Promise<QuantumState> {
    try {
      const response = await apiClient.post<ApiResponse<{ collapsedState: QuantumState }>>(
        `${this.apiBasePath}/quantum/collapse`,
        { stateId }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to collapse quantum state');
      }
      
      return response.data.collapsedState;
    } catch (error) {
      console.error('Error collapsing quantum state:', error);
      throw error;
    }
  }
  
  /**
   * Detect code anomalies using the biomimetic repair network
   */
  public async detectAnomalies(
    request: AnomalyDetectionRequest
  ): Promise<AnomalyDetectionResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AnomalyDetectionResponse>>(
        `${this.apiBasePath}/repair/detect`,
        request
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to detect anomalies');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw error;
    }
  }
  
  /**
   * Repair a code anomaly
   */
  public async repairAnomaly(
    request: RepairRequest
  ): Promise<RepairResponse> {
    try {
      const response = await apiClient.post<ApiResponse<RepairResponse>>(
        `${this.apiBasePath}/repair/fix`,
        request
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to repair anomaly');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error repairing anomaly:', error);
      throw error;
    }
  }
  
  /**
   * Get available repair strategies
   */
  public async getRepairStrategies(): Promise<RepairStrategy[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ strategies: RepairStrategy[] }>>(
        `${this.apiBasePath}/repair/strategies`
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get repair strategies');
      }
      
      return response.data.strategies;
    } catch (error) {
      console.error('Error getting repair strategies:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const neuralCyberneticService = new NeuralCyberneticService();
export default NeuralCyberneticService;
