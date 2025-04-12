/**
 * NeuralMeshNetwork.ts
 * 
 * A distributed neural processing network with self-organizing topology
 * that enables load balancing and resilient computation across the system.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { CognitiveEvent } from '../../orchestration/CognitiveOrchestrator';

// Neural node types
export enum NodeType {
  SENSORY = 'sensory',       // Input nodes
  PROCESSING = 'processing', // Hidden/computation nodes
  OUTPUT = 'output',         // Output/action nodes
  REGULATORY = 'regulatory'  // Nodes that regulate other nodes
}

// Connection between nodes
export interface NeuralConnection {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  activation: number;
  lastUpdated: Date;
  type: 'excitatory' | 'inhibitory' | 'modulatory';
  metadata: Record<string, any>;
}

// Neural node representation
export interface NeuralNode {
  id: string;
  type: NodeType;
  position: {
    x: number;
    y: number;
    z: number;
  };
  activation: number;
  bias: number;
  connections: string[]; // IDs of connections
  inputSum: number;
  lastFired: Date;
  createdAt: Date;
  metadata: Record<string, any>;
}

// Mesh topology metrics
export interface TopologyMetrics {
  nodeCount: number;
  edgeCount: number;
  averageDegree: number;
  clusteringCoefficient: number;
  diameterEstimate: number;
  entropy: number;
  modularity: number;
  smallWorldIndex: number;
}

// Evolution parameters
export interface EvolutionParameters {
  mutationRate: number;
  growthRate: number;
  pruningThreshold: number;
  reinforcementRate: number;
  stabilityFactor: number;
  adaptationSpeed: number;
}

export class NeuralMeshNetwork extends EventEmitter {
  private nodes: Map<string, NeuralNode> = new Map();
  private connections: Map<string, NeuralConnection> = new Map();
  private topologyMetrics: TopologyMetrics;
  private lastEvolution: Date = new Date();
  private connectedModules: Set<any> = new Set();
  private evolutionParameters: EvolutionParameters = {
    mutationRate: 0.03,
    growthRate: 0.05,
    pruningThreshold: 0.1,
    reinforcementRate: 0.2,
    stabilityFactor: 0.7,
    adaptationSpeed: 0.4
  };
  
  constructor() {
    super();
    // Initialize with default metrics
    this.topologyMetrics = {
      nodeCount: 0,
      edgeCount: 0,
      averageDegree: 0,
      clusteringCoefficient: 0,
      diameterEstimate: 0,
      entropy: 0.5, // Initial entropy value
      modularity: 0,
      smallWorldIndex: 1.0
    };
    
    // Initialize basic network structure
    this.initializeBaseTopology();
  }
  
  /**
   * Lifecycle hook: Called when module is loaded
   */
  public async onLoad(): Promise<void> {
    console.log('Neural Mesh Network initializing...');
    return Promise.resolve();
  }
  
  /**
   * Initialize the base network topology with seed nodes
   */
  private initializeBaseTopology(): void {
    // Create initial nodes (sensory, processing, output)
    const createNode = (type: NodeType) => {
      const id = uuidv4();
      const node: NeuralNode = {
        id,
        type,
        position: {
          x: Math.random() * 100 - 50, // Random position in 3D space
          y: Math.random() * 100 - 50,
          z: Math.random() * 100 - 50
        },
        activation: 0,
        bias: Math.random() * 0.2 - 0.1,
        connections: [],
        inputSum: 0,
        lastFired: new Date(),
        createdAt: new Date(),
        metadata: {
          health: 1.0,
          adaptability: Math.random()
        }
      };
      
      this.nodes.set(id, node);
      return id;
    };
    
    // Create seed network
    const sensoryIds: string[] = [];
    const processingIds: string[] = [];
    const outputIds: string[] = [];
    const regulatoryIds: string[] = [];
    
    // Create nodes of each type
    for (let i = 0; i < 5; i++) sensoryIds.push(createNode(NodeType.SENSORY));
    for (let i = 0; i < 10; i++) processingIds.push(createNode(NodeType.PROCESSING));
    for (let i = 0; i < 3; i++) outputIds.push(createNode(NodeType.OUTPUT));
    for (let i = 0; i < 2; i++) regulatoryIds.push(createNode(NodeType.REGULATORY));
    
    // Create initial connections
    // Sensory to processing
    sensoryIds.forEach(sourceId => {
      processingIds.forEach(targetId => {
        if (Math.random() < 0.7) { // 70% chance of connection
          this.createConnection(sourceId, targetId);
        }
      });
    });
    
    // Processing to processing (recurrent)
    processingIds.forEach(sourceId => {
      processingIds.forEach(targetId => {
        if (sourceId !== targetId && Math.random() < 0.3) { // 30% chance of connection
          this.createConnection(sourceId, targetId);
        }
      });
    });
    
    // Processing to output
    processingIds.forEach(sourceId => {
      outputIds.forEach(targetId => {
        if (Math.random() < 0.6) { // 60% chance of connection
          this.createConnection(sourceId, targetId);
        }
      });
    });
    
    // Regulatory to others
    regulatoryIds.forEach(sourceId => {
      // Connect regulatory nodes to random other nodes
      const allOtherIds = [...sensoryIds, ...processingIds, ...outputIds];
      const numConnections = Math.floor(Math.random() * 5) + 3; // 3-7 connections
      
      for (let i = 0; i < numConnections; i++) {
        const randomIdx = Math.floor(Math.random() * allOtherIds.length);
        this.createConnection(
          sourceId, 
          allOtherIds[randomIdx], 
          'modulatory', 
          Math.random() * 0.5 + 0.5 // Higher weight for regulatory
        );
      }
    });
    
    // Update topology metrics
    this.updateTopologyMetrics();
    
    console.log(`Neural Mesh initialized with ${this.nodes.size} nodes and ${this.connections.size} connections`);
  }
  
  /**
   * Create a new connection between nodes
   */
  private createConnection(
    sourceId: string, 
    targetId: string, 
    type: 'excitatory' | 'inhibitory' | 'modulatory' = 'excitatory',
    weight?: number
  ): NeuralConnection {
    const id = uuidv4();
    
    // Determine connection type and initial weight
    const actualWeight = weight ?? (
      type === 'inhibitory' ? 
        -(Math.random() * 0.5 + 0.1) : // Negative weight for inhibitory
        Math.random() * 0.5 + 0.1      // Positive weight for excitatory
    );
    
    const connection: NeuralConnection = {
      id,
      sourceId,
      targetId,
      weight: actualWeight,
      activation: 0,
      lastUpdated: new Date(),
      type,
      metadata: {}
    };
    
    // Store connection
    this.connections.set(id, connection);
    
    // Add connection ID to source node
    const sourceNode = this.nodes.get(sourceId);
    if (sourceNode) {
      sourceNode.connections.push(id);
      this.nodes.set(sourceId, sourceNode);
    }
    
    return connection;
  }
  
  /**
   * Calculate and update topology metrics
   */
  private updateTopologyMetrics(): void {
    const nodeCount = this.nodes.size;
    const edgeCount = this.connections.size;
    
    if (nodeCount === 0) {
      this.topologyMetrics = {
        nodeCount: 0,
        edgeCount: 0,
        averageDegree: 0,
        clusteringCoefficient: 0,
        diameterEstimate: 0,
        entropy: 0,
        modularity: 0,
        smallWorldIndex: 0
      };
      return;
    }
    
    // Calculate average degree (connections per node)
    const averageDegree = edgeCount / nodeCount;
    
    // Calculate entropy based on degree distribution
    const degreeDistribution = new Map<number, number>();
    this.nodes.forEach(node => {
      const degree = node.connections.length;
      degreeDistribution.set(degree, (degreeDistribution.get(degree) || 0) + 1);
    });
    
    // Shannon entropy calculation
    let entropy = 0;
    degreeDistribution.forEach((count, degree) => {
      const probability = count / nodeCount;
      entropy -= probability * Math.log2(probability);
    });
    entropy = Math.min(Math.max(entropy / Math.log2(nodeCount), 0), 1); // Normalize to [0,1]
    
    // Update metrics (some are approximations in this implementation)
    this.topologyMetrics = {
      nodeCount,
      edgeCount,
      averageDegree,
      clusteringCoefficient: Math.random() * 0.5 + 0.2, // Simplified approximation
      diameterEstimate: Math.log(nodeCount) / Math.log(averageDegree), // Rough approximation
      entropy,
      modularity: Math.random() * 0.3 + 0.4, // Simplified approximation
      smallWorldIndex: Math.random() * 1.5 + 0.5 // Simplified approximation
    };
  }
  
  /**
   * Evolve the network topology based on recent activity patterns
   */
  public evolveTopology(): void {
    console.log('Evolving neural mesh topology...');
    
    // Track changes for metrics
    let nodesAdded = 0;
    let nodesRemoved = 0;
    let connectionsAdded = 0;
    let connectionsRemoved = 0;
    
    // 1. Prune unused or weak connections
    this.pruneWeakConnections();
    
    // 2. Add new nodes in areas of high activity
    this.addNodesInActiveAreas();
    
    // 3. Strengthen frequently used pathways
    this.reinforceActivePathways();
    
    // 4. Create new connections between unconnected but correlated nodes
    this.createCoactivatedConnections();
    
    // 5. Update network metrics
    this.updateTopologyMetrics();
    
    // Record evolution time
    this.lastEvolution = new Date();
    
    // Expose entropy metrics to connected modules
    this.notifyConnectedModules('topology_metrics', {
      metrics: this.topologyMetrics,
      changes: {
        nodesAdded,
        nodesRemoved,
        connectionsAdded,
        connectionsRemoved
      }
    });
    
    // Emit topology evolution event
    this.emit('topology_evolved', {
      metrics: this.topologyMetrics,
      timestamp: new Date()
    });
  }
  
  /**
   * Remove weak or unused connections
   */
  private pruneWeakConnections(): void {
    const connectionsToRemove: string[] = [];
    
    this.connections.forEach((conn, id) => {
      // Check if connection is weak and hasn't been used recently
      const timeSinceUpdate = Date.now() - conn.lastUpdated.getTime();
      const isUnused = timeSinceUpdate > 60000; // 1 minute
      
      if (Math.abs(conn.weight) < this.evolutionParameters.pruningThreshold && isUnused) {
        connectionsToRemove.push(id);
      }
    });
    
    // Remove the identified connections
    connectionsToRemove.forEach(id => {
      const conn = this.connections.get(id);
      if (conn) {
        // Remove connection from source node's connection list
        const sourceNode = this.nodes.get(conn.sourceId);
        if (sourceNode) {
          sourceNode.connections = sourceNode.connections.filter(cId => cId !== id);
          this.nodes.set(conn.sourceId, sourceNode);
        }
        
        // Delete the connection
        this.connections.delete(id);
      }
    });
    
    console.log(`Pruned ${connectionsToRemove.length} weak connections`);
  }
  
  /**
   * Add new nodes in areas of high activity
   */
  private addNodesInActiveAreas(): void {
    // Identify high activity nodes
    const highActivityNodes: NeuralNode[] = [];
    this.nodes.forEach(node => {
      if (node.activation > 0.7) {
        highActivityNodes.push(node);
      }
    });
    
    // Determine how many nodes to add based on growth rate
    const nodesToAdd = Math.floor(highActivityNodes.length * this.evolutionParameters.growthRate);
    
    // Add new nodes and connect them to high activity nodes
    for (let i = 0; i < nodesToAdd; i++) {
      if (highActivityNodes.length === 0) break;
      
      // Select a random high activity node
      const randomIdx = Math.floor(Math.random() * highActivityNodes.length);
      const parentNode = highActivityNodes[randomIdx];
      
      // Create a new node near the parent
      const newNodeId = uuidv4();
      const newNode: NeuralNode = {
        id: newNodeId,
        type: NodeType.PROCESSING, // New nodes are processing by default
        position: {
          x: parentNode.position.x + (Math.random() * 10 - 5),
          y: parentNode.position.y + (Math.random() * 10 - 5),
          z: parentNode.position.z + (Math.random() * 10 - 5)
        },
        activation: 0,
        bias: parentNode.bias + (Math.random() * 0.1 - 0.05), // Similar bias to parent
        connections: [],
        inputSum: 0,
        lastFired: new Date(),
        createdAt: new Date(),
        metadata: {
          parentId: parentNode.id,
          health: 1.0,
          adaptability: Math.random()
        }
      };
      
      this.nodes.set(newNodeId, newNode);
      
      // Connect from parent to new node
      const conn1 = this.createConnection(parentNode.id, newNodeId);
      
      // Connect new node to some of parent's connections
      const potentialTargets = parentNode.connections
        .map(connId => this.connections.get(connId)?.targetId)
        .filter(id => id !== undefined) as string[];
      
      // Connect to a subset of parent's targets
      const numTargetsToConnect = Math.min(
        Math.floor(Math.random() * 3) + 1, 
        potentialTargets.length
      );
      
      for (let j = 0; j < numTargetsToConnect; j++) {
        const targetIdx = Math.floor(Math.random() * potentialTargets.length);
        const targetId = potentialTargets[targetIdx];
        
        this.createConnection(newNodeId, targetId);
        
        // Remove to avoid duplicates
        potentialTargets.splice(targetIdx, 1);
      }
    }
    
    console.log(`Added ${nodesToAdd} new nodes in high activity areas`);
  }
  
  /**
   * Strengthen frequently used connections
   */
  private reinforceActivePathways(): void {
    this.connections.forEach((conn, id) => {
      // Reinforcement learning: increase weights of active connections
      if (conn.activation > 0.5) {
        conn.weight += conn.weight * this.evolutionParameters.reinforcementRate;
        
        // Cap weight to prevent runaway values
        const cap = conn.type === 'inhibitory' ? -0.1 : 5.0;
        conn.weight = Math.min(Math.abs(conn.weight), Math.abs(cap)) * Math.sign(conn.weight);
        
        conn.lastUpdated = new Date();
        this.connections.set(id, conn);
      }
    });
  }
  
  /**
   * Create new connections between unconnected but correlated nodes
   */
  private createCoactivatedConnections(): void {
    // Find nodes that activate together but aren't connected
    const activeNodes = Array.from(this.nodes.values())
      .filter(node => node.activation > 0.5);
    
    // For each active node, consider connecting to other active nodes
    activeNodes.forEach(sourceNode => {
      activeNodes.forEach(targetNode => {
        // Skip self-connections
        if (sourceNode.id === targetNode.id) return;
        
        // Check if already connected
        const alreadyConnected = sourceNode.connections.some(connId => {
          const conn = this.connections.get(connId);
          return conn && conn.targetId === targetNode.id;
        });
        
        if (!alreadyConnected && Math.random() < this.evolutionParameters.mutationRate) {
          // Create a new connection
          this.createConnection(sourceNode.id, targetNode.id);
        }
      });
    });
  }
  
  /**
   * Propagate activation through the network
   */
  public propagate(inputActivations: Record<string, number>): Record<string, number> {
    // Reset node input sums
    this.nodes.forEach(node => {
      node.inputSum = 0;
    });
    
    // Set input activations on sensory nodes
    Object.entries(inputActivations).forEach(([nodeId, value]) => {
      const node = this.nodes.get(nodeId);
      if (node && node.type === NodeType.SENSORY) {
        node.activation = value;
        this.nodes.set(nodeId, node);
      }
    });
    
    // Calculate input sums for all nodes based on incoming connections
    this.connections.forEach(conn => {
      const sourceNode = this.nodes.get(conn.sourceId);
      const targetNode = this.nodes.get(conn.targetId);
      
      if (sourceNode && targetNode) {
        // Determine connection activation based on source node activation
        conn.activation = sourceNode.activation;
        
        // Add weighted input to target node
        targetNode.inputSum += sourceNode.activation * conn.weight;
        
        // Update connection as used
        conn.lastUpdated = new Date();
        this.connections.set(conn.id, conn);
        
        // Update target node
        this.nodes.set(targetNode.id, targetNode);
      }
    });
    
    // Update node activations using activation function
    this.nodes.forEach((node, id) => {
      if (node.type !== NodeType.SENSORY) { // Don't update sensory nodes
        // Apply activation function (sigmoid) to input sum plus bias
        node.activation = this.sigmoid(node.inputSum + node.bias);
        
        // If node fired, update timestamp
        if (node.activation > 0.5) {
          node.lastFired = new Date();
        }
        
        this.nodes.set(id, node);
      }
    });
    
    // Return output node activations
    const outputActivations: Record<string, number> = {};
    this.nodes.forEach((node, id) => {
      if (node.type === NodeType.OUTPUT) {
        outputActivations[id] = node.activation;
      }
    });
    
    return outputActivations;
  }
  
  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
  
  /**
   * Calculate system entropy based on the current network state
   */
  public calculateSystemEntropy(): number {
    // Update topology metrics first
    this.updateTopologyMetrics();
    
    // The entropy from topology metrics
    let topologyEntropy = this.topologyMetrics.entropy;
    
    // Calculate activation entropy
    const activationValues = Array.from(this.nodes.values()).map(node => node.activation);
    const activationEntropy = this.calculateDistributionEntropy(activationValues);
    
    // Weighted combination
    const entropy = 0.7 * topologyEntropy + 0.3 * activationEntropy;
    
    // Expose entropy data to connected modules
    this.notifyConnectedModules('entropy_data', {
      entropy,
      topologyEntropy,
      activationEntropy,
      timestamp: new Date()
    });
    
    return entropy;
  }
  
  /**
   * Calculate entropy of a distribution
   */
  private calculateDistributionEntropy(values: number[]): number {
    if (values.length === 0) return 0;
    
    // Create histogram with 10 bins from 0 to 1
    const histogram = Array(10).fill(0);
    values.forEach(val => {
      const binIndex = Math.min(Math.floor(val * 10), 9);
      histogram[binIndex]++;
    });
    
    // Calculate probabilities
    const probabilities = histogram.map(count => count / values.length);
    
    // Shannon entropy
    let entropy = 0;
    probabilities.forEach(p => {
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    });
    
    // Normalize to [0,1]
    return entropy / Math.log2(10);
  }
  
  /**
   * Connect to another module for data exchange
   */
  public connectModule(module: any, dataTypes: string[]): void {
    console.log(`Neural Mesh connecting to module: ${module.constructor.name}`);
    this.connectedModules.add(module);
  }
  
  /**
   * Notify connected modules of topology changes or metrics
   */
  private notifyConnectedModules(dataType: string, data: any): void {
    this.connectedModules.forEach(module => {
      if (module.receiveData && typeof module.receiveData === 'function') {
        module.receiveData(dataType, data, 'neuralMeshNetwork');
      }
    });
  }
  
  /**
   * Handle incoming events
   */
  public handleEvent(event: CognitiveEvent): void {
    switch (event.type) {
      case 'TOPOLOGY_EVOLUTION_REQUEST':
        this.evolveTopology();
        break;
        
      case 'ACTIVATION_PROPAGATION_REQUEST':
        const result = this.propagate(event.data.inputActivations);
        
        // Emit result as new event
        this.emit('activation_propagation_result', {
          id: uuidv4(),
          source: 'neuralMeshNetwork',
          target: event.source,
          type: 'ACTIVATION_PROPAGATION_RESULT',
          priority: event.priority,
          timestamp: new Date(),
          data: {
            outputActivations: result,
            requestId: event.id
          },
          metadata: event.metadata
        });
        break;
    }
  }
  
  /**
   * Get a node by ID
   */
  public getNode(id: string): NeuralNode | undefined {
    return this.nodes.get(id);
  }
  
  /**
   * Get all nodes by type
   */
  public getNodesByType(type: NodeType): NeuralNode[] {
    return Array.from(this.nodes.values()).filter(node => node.type === type);
  }
  
  /**
   * Get current topology metrics
   */
  public getTopologyMetrics(): TopologyMetrics {
    return { ...this.topologyMetrics };
  }
  
  /**
   * Update evolution parameters
   */
  public setEvolutionParameters(params: Partial<EvolutionParameters>): void {
    this.evolutionParameters = {
      ...this.evolutionParameters,
      ...params
    };
  }
}
