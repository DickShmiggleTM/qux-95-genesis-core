/**
 * NeuralMeshVisualizer.tsx
 * 
 * A visualization component for the neural mesh network.
 * Displays nodes and connections in a 3D force-directed graph.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ForceGraph3D } from 'react-force-graph';
import { NeuralNode, NeuralConnection, NodeType } from '../../core/modules/neural/NeuralMeshNetwork';
import { neuralCyberneticService } from '../../services/neuralCyberneticService';
import { Button } from '../ui/button';
import { Loader2, RefreshCcw, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NeuralMeshVisualizerProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  type: NodeType;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

const NODE_COLORS = {
  [NodeType.SENSORY]: '#00ffff',     // Cyan
  [NodeType.PROCESSING]: '#00ff00',  // Green
  [NodeType.OUTPUT]: '#ff00ff',      // Magenta
  [NodeType.REGULATORY]: '#ffff00'   // Yellow
};

const CONNECTION_COLORS = {
  'excitatory': '#00ff00',   // Green
  'inhibitory': '#ff0000',   // Red
  'modulatory': '#0000ff'    // Blue
};

const NeuralMeshVisualizer: React.FC<NeuralMeshVisualizerProps> = ({
  className,
  autoRefresh = false,
  refreshInterval = 5000
}) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState<boolean>(false);
  
  const graphRef = useRef<any>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load neural mesh topology
  const loadTopology = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const topology = await neuralCyberneticService.getNeuralMeshTopology();
      
      // Convert nodes to graph format
      const graphNodes = topology.nodes.map(node => ({
        id: node.id,
        name: `Node ${node.id.substring(0, 4)}`,
        val: 1 + node.activation * 2, // Size based on activation
        color: NODE_COLORS[node.type] || '#ffffff',
        type: node.type,
        x: node.position.x * 100,
        y: node.position.y * 100,
        z: node.position.z * 100
      }));
      
      // Convert connections to graph format
      const graphLinks = topology.connections.map(conn => ({
        source: conn.sourceId,
        target: conn.targetId,
        value: Math.abs(conn.weight) * 2,
        color: CONNECTION_COLORS[conn.type] || '#aaaaaa'
      }));
      
      setNodes(graphNodes);
      setLinks(graphLinks);
    } catch (error) {
      console.error('Error loading neural mesh topology:', error);
      setError('Failed to load neural mesh topology');
      toast.error('Failed to load neural mesh', {
        description: 'Could not retrieve the neural mesh topology'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Evolve the neural mesh
  const evolveNeuralMesh = async () => {
    try {
      setLoading(true);
      
      const evolved = await neuralCyberneticService.evolveNeuralMesh();
      
      if (evolved) {
        toast.success('Neural mesh evolved', {
          description: 'The neural mesh topology has been updated'
        });
        
        // Reload the topology
        await loadTopology();
      }
    } catch (error) {
      console.error('Error evolving neural mesh:', error);
      toast.error('Failed to evolve neural mesh', {
        description: 'Could not evolve the neural mesh topology'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle rotation
  const toggleRotation = () => {
    if (graphRef.current) {
      if (rotating) {
        graphRef.current.pauseAnimation();
      } else {
        graphRef.current.resumeAnimation();
      }
      setRotating(!rotating);
    }
  };
  
  // Zoom controls
  const zoomIn = () => {
    if (graphRef.current) {
      const distance = graphRef.current.cameraPosition().z;
      graphRef.current.cameraPosition({ z: distance * 0.8 }, 300);
    }
  };
  
  const zoomOut = () => {
    if (graphRef.current) {
      const distance = graphRef.current.cameraPosition().z;
      graphRef.current.cameraPosition({ z: distance * 1.2 }, 300);
    }
  };
  
  // Reset camera
  const resetCamera = () => {
    if (graphRef.current) {
      graphRef.current.cameraPosition({ x: 0, y: 0, z: 500 }, 500);
    }
  };
  
  // Set up auto-refresh
  useEffect(() => {
    // Initial load
    loadTopology();
    
    // Set up auto-refresh if enabled
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(loadTopology, refreshInterval);
    }
    
    return () => {
      // Clean up timer on unmount
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);
  
  return (
    <div className={cn("relative w-full h-full min-h-[400px] bg-cyberpunk-dark border border-cyberpunk-neon-green rounded-md overflow-hidden", className)}>
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyberpunk-dark bg-opacity-70 z-10">
          <Loader2 className="h-8 w-8 text-cyberpunk-neon-green animate-spin" />
          <span className="ml-2 text-cyberpunk-neon-green font-terminal">Loading Neural Mesh...</span>
        </div>
      )}
      
      {/* Error message */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyberpunk-dark bg-opacity-90 z-10">
          <div className="text-red-500 font-terminal mb-4">{error}</div>
          <Button onClick={loadTopology} variant="outline" className="border-cyberpunk-neon-green text-cyberpunk-neon-green">
            Retry
          </Button>
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
        <Button
          onClick={loadTopology}
          variant="outline"
          size="icon"
          className="bg-cyberpunk-dark border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue"
          disabled={loading}
          title="Refresh"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={evolveNeuralMesh}
          variant="outline"
          size="icon"
          className="bg-cyberpunk-dark border-cyberpunk-neon-purple text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
          disabled={loading}
          title="Evolve Neural Mesh"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            <path d="M12 6v6l4 4" />
          </svg>
        </Button>
        
        <Button
          onClick={toggleRotation}
          variant="outline"
          size="icon"
          className={cn(
            "bg-cyberpunk-dark border-cyberpunk-neon-blue text-cyberpunk-neon-blue hover:bg-cyberpunk-dark-blue",
            rotating && "bg-cyberpunk-dark-blue"
          )}
          title={rotating ? "Pause Rotation" : "Start Rotation"}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={zoomIn}
          variant="outline"
          size="icon"
          className="bg-cyberpunk-dark border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={zoomOut}
          variant="outline"
          size="icon"
          className="bg-cyberpunk-dark border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={resetCamera}
          variant="outline"
          size="icon"
          className="bg-cyberpunk-dark border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue"
          title="Reset View"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Button>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-cyberpunk-dark bg-opacity-80 p-2 rounded border border-cyberpunk-neon-green z-20">
        <div className="text-cyberpunk-neon-green font-terminal text-xs mb-1">Node Types:</div>
        <div className="flex flex-col gap-1">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
              <span className="text-white text-xs">{type}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Force Graph */}
      <ForceGraph3D
        ref={graphRef}
        graphData={{ nodes, links }}
        nodeLabel="name"
        nodeColor="color"
        nodeVal="val"
        linkColor="color"
        linkWidth="value"
        backgroundColor="#000000"
        showNavInfo={false}
        enableNodeDrag={true}
        enableNavigationControls={true}
        onNodeClick={(node) => {
          toast.info(`Node: ${node.id}`, {
            description: `Type: ${node.type}`
          });
        }}
      />
    </div>
  );
};

export default NeuralMeshVisualizer;
