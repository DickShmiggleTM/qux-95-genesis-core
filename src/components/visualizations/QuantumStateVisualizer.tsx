/**
 * QuantumStateVisualizer.tsx
 * 
 * A visualization component for quantum states and decision pathways.
 * Displays quantum states as probability distributions and pathways as graphs.
 */

import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { neuralCyberneticService } from '../../services/neuralCyberneticService';
import { QuantumState, QuantumPathway } from '../../core/modules/quantum/QuantumDecisionEngine';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Loader2, RefreshCcw, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface QuantumStateVisualizerProps {
  className?: string;
  stateIds?: string[];
  pathwayId?: string;
  showControls?: boolean;
}

const QuantumStateVisualizer: React.FC<QuantumStateVisualizerProps> = ({
  className,
  stateIds,
  pathwayId,
  showControls = true
}) => {
  const [states, setStates] = useState<QuantumState[]>([]);
  const [pathway, setPathway] = useState<QuantumPathway | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('states');
  
  // Load quantum states
  const loadStates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let loadedStates: QuantumState[] = [];
      
      if (stateIds && stateIds.length > 0) {
        // Load specific states
        loadedStates = await neuralCyberneticService.getQuantumStates({
          stateIds
        });
      } else {
        // Load recent states
        loadedStates = await neuralCyberneticService.getQuantumStates({
          includeCollapsed: false,
          limit: 5
        });
      }
      
      setStates(loadedStates);
    } catch (error) {
      console.error('Error loading quantum states:', error);
      setError('Failed to load quantum states');
      toast.error('Failed to load quantum states', {
        description: 'Could not retrieve quantum states'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Collapse a quantum state
  const collapseState = async (stateId: string) => {
    try {
      setLoading(true);
      
      const collapsedState = await neuralCyberneticService.collapseQuantumState(stateId);
      
      // Update the state in the list
      setStates(prevStates => 
        prevStates.map(state => 
          state.id === stateId ? collapsedState : state
        )
      );
      
      toast.success('Quantum state collapsed', {
        description: 'The quantum state has been collapsed to a definite value'
      });
    } catch (error) {
      console.error('Error collapsing quantum state:', error);
      toast.error('Failed to collapse quantum state', {
        description: 'Could not collapse the quantum state'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate probabilities from amplitudes
  const calculateProbabilities = (state: QuantumState) => {
    const probabilities: Record<string, number> = {};
    
    // Convert amplitudes to probabilities
    for (const [outcome, amplitude] of Object.entries(state.amplitudes)) {
      const real = amplitude.real || 0;
      const imag = amplitude.imag || 0;
      probabilities[outcome] = real * real + imag * imag;
    }
    
    return probabilities;
  };
  
  // Create chart data for a quantum state
  const createStateChartData = (state: QuantumState) => {
    const probabilities = calculateProbabilities(state);
    
    return {
      labels: Object.keys(probabilities),
      datasets: [
        {
          label: 'Probability',
          data: Object.values(probabilities),
          backgroundColor: [
            'rgba(0, 255, 255, 0.7)',  // Cyan
            'rgba(255, 0, 255, 0.7)',  // Magenta
            'rgba(255, 255, 0, 0.7)',  // Yellow
            'rgba(0, 255, 0, 0.7)',    // Green
            'rgba(255, 0, 0, 0.7)'     // Red
          ],
          borderColor: [
            'rgb(0, 255, 255)',
            'rgb(255, 0, 255)',
            'rgb(255, 255, 0)',
            'rgb(0, 255, 0)',
            'rgb(255, 0, 0)'
          ],
          borderWidth: 1
        }
      ]
    };
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(0, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 1)',
        borderColor: 'rgba(0, 255, 255, 0.5)',
        borderWidth: 1
      }
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadStates();
  }, [stateIds]);
  
  return (
    <div className={cn("w-full h-full bg-cyberpunk-dark border border-cyberpunk-neon-green rounded-md overflow-hidden", className)}>
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyberpunk-dark bg-opacity-70 z-10">
          <Loader2 className="h-8 w-8 text-cyberpunk-neon-green animate-spin" />
          <span className="ml-2 text-cyberpunk-neon-green font-terminal">Loading Quantum States...</span>
        </div>
      )}
      
      {/* Error message */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyberpunk-dark bg-opacity-90 z-10">
          <div className="text-red-500 font-terminal mb-4">{error}</div>
          <Button onClick={loadStates} variant="outline" className="border-cyberpunk-neon-green text-cyberpunk-neon-green">
            Retry
          </Button>
        </div>
      )}
      
      <Tabs defaultValue="states" value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <div className="flex justify-between items-center p-2 border-b border-cyberpunk-neon-green">
          <TabsList className="bg-cyberpunk-dark-blue">
            <TabsTrigger value="states" className="data-[state=active]:bg-cyberpunk-neon-green data-[state=active]:text-black">
              Quantum States
            </TabsTrigger>
            <TabsTrigger value="pathways" className="data-[state=active]:bg-cyberpunk-neon-green data-[state=active]:text-black">
              Decision Pathways
            </TabsTrigger>
          </TabsList>
          
          {showControls && (
            <Button
              onClick={loadStates}
              variant="outline"
              size="sm"
              className="bg-cyberpunk-dark border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue"
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
        
        <TabsContent value="states" className="p-4 h-[calc(100%-48px)] overflow-auto">
          {states.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-cyberpunk-neon-green font-terminal mb-4">No quantum states available</div>
              <Button onClick={loadStates} variant="outline" className="border-cyberpunk-neon-green text-cyberpunk-neon-green">
                Load States
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {states.map(state => (
                <Card key={state.id} className="bg-cyberpunk-dark border-cyberpunk-neon-blue overflow-hidden">
                  <CardHeader className="bg-cyberpunk-dark-blue p-4">
                    <CardTitle className="text-cyberpunk-neon-blue font-terminal text-sm flex justify-between items-center">
                      <span>Quantum State {state.id.substring(0, 8)}</span>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs",
                        state.collapsed 
                          ? "bg-cyberpunk-neon-green text-black" 
                          : "bg-cyberpunk-neon-purple text-white"
                      )}>
                        {state.collapsed ? 'Collapsed' : 'Superposition'}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-xs">
                      Created: {new Date(state.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-4">
                    <div className="h-40">
                      <Bar 
                        data={createStateChartData(state)} 
                        options={chartOptions} 
                      />
                    </div>
                    
                    <div className="mt-4">
                      <div className="text-cyberpunk-neon-green font-terminal text-xs mb-2">Tags:</div>
                      <div className="flex flex-wrap gap-1">
                        {state.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="bg-cyberpunk-dark-blue text-cyberpunk-neon-blue px-2 py-1 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="bg-cyberpunk-dark-blue p-4 flex justify-end">
                    {!state.collapsed && (
                      <Button
                        onClick={() => collapseState(state.id)}
                        variant="outline"
                        size="sm"
                        className="bg-cyberpunk-dark border-cyberpunk-neon-purple text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
                        disabled={loading}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Collapse
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pathways" className="p-4 h-[calc(100%-48px)] overflow-auto">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-cyberpunk-neon-green font-terminal mb-4">Decision Pathway Visualization</div>
            <div className="text-gray-400 text-sm">
              Select a decision context to visualize pathways
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuantumStateVisualizer;
