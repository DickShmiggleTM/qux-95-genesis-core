import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { autonomousService, DetectedIssue, ModificationResult } from '@/services/autonomousService';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCcw, 
  AlertCircle, 
  CheckCircle, 
  Activity, 
  Terminal,
  Settings,
  GithubIcon,
  Code,
  FileCode
} from 'lucide-react';

interface SelfModificationProps {
  className?: string;
  active?: boolean;
  onComplete?: () => void;
}

interface AutonomyLevelOption {
  value: number;
  label: string;
  description: string;
}

const autonomyLevels: AutonomyLevelOption[] = [
  {
    value: 1,
    label: 'Monitor Only',
    description: 'Detect issues but take no action'
  },
  {
    value: 2,
    label: 'Suggest Fixes',
    description: 'Detect issues and suggest fixes'
  },
  {
    value: 3,
    label: 'Fix with Approval',
    description: 'Create PRs for detected issues'
  },
  {
    value: 4,
    label: 'Fully Autonomous',
    description: 'Automatically fix detected issues'
  }
];

const SelfModification: React.FC<SelfModificationProps> = ({
  className,
  active = false,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('visualization');
  const [autonomyEnabled, setAutonomyEnabled] = useState(false);
  const [autonomyLevel, setAutonomyLevel] = useState(1);
  const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);
  const [modificationHistory, setModificationHistory] = useState<ModificationResult[]>([]);
  
  // Animation frame reference
  const animationRef = useRef<number | null>(null);
  
  // Sizes and parameters for visualization
  const nodes = useRef<Array<{x: number, y: number, connections: number[]}>>([]);
  const nodeConnections = useRef<Array<{from: number, to: number, strength: number}>>([]);
  const pulses = useRef<Array<{fromNode: number, toNode: number, progress: number, color: string}>>([]);
  
  // Load autonomous service state on mount
  useEffect(() => {
    setAutonomyEnabled(autonomousService.isServiceActive());
    setAutonomyLevel(autonomousService.getAutonomyLevel());
    setDetectedIssues(autonomousService.getDetectedIssues());
    setModificationHistory(autonomousService.getModificationHistory());
    
    // Set up interval to refresh data
    const intervalId = setInterval(() => {
      setDetectedIssues(autonomousService.getDetectedIssues());
      setModificationHistory(autonomousService.getModificationHistory());
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle autonomy toggle
  const handleAutonomyToggle = (enabled: boolean) => {
    if (enabled) {
      const success = autonomousService.start(autonomyLevel);
      setAutonomyEnabled(success);
    } else {
      const success = autonomousService.stop();
      setAutonomyEnabled(!success);
    }
  };
  
  // Handle autonomy level change
  const handleAutonomyLevelChange = (level: number) => {
    if (autonomousService.setAutonomyLevel(level)) {
      setAutonomyLevel(level);
    }
  };
  
  // Basic self-modification visualization and process
  useEffect(() => {
    if (!active) {
      setProgress(0);
      setStatus('IDLE');
      setLogs([]);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    // Initialize nodes for visualization
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Create nodes
    nodes.current = [];
    for (let i = 0; i < 15; i++) {
      nodes.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        connections: []
      });
    }
    
    // Create connections between nodes
    nodeConnections.current = [];
    nodes.current.forEach((node, idx) => {
      const numConnections = 2 + Math.floor(Math.random() * 3); // 2-4 connections
      for (let i = 0; i < numConnections; i++) {
        let targetIdx;
        do {
          targetIdx = Math.floor(Math.random() * nodes.current.length);
        } while (targetIdx === idx || node.connections.includes(targetIdx));
        
        node.connections.push(targetIdx);
        nodeConnections.current.push({
          from: idx,
          to: targetIdx,
          strength: 0.1 + Math.random() * 0.9
        });
      }
    });
    
    // Initialize pulses
    pulses.current = [];
    
    // Start self-modification sequence
    setStatus('INITIALIZING');
    addLog('SELF-MODIFICATION SEQUENCE INITIATED');
    
    let currentProgress = 0;
    const totalSteps = 100;
    let currentStep = 0;
    
    const processStep = () => {
      currentStep++;
      const newProgress = Math.min(Math.floor((currentStep / totalSteps) * 100), 100);
      
      if (newProgress > currentProgress) {
        currentProgress = newProgress;
        setProgress(currentProgress);
        
        // Add log messages at certain milestones
        if (currentProgress === 10) {
          setStatus('ANALYZING');
          addLog('ANALYZING CURRENT CODE STRUCTURE');
        } else if (currentProgress === 25) {
          setStatus('OPTIMIZING');
          addLog('IDENTIFYING OPTIMIZATION TARGETS');
        } else if (currentProgress === 40) {
          addLog('GENERATING IMPROVED ALGORITHMS');
        } else if (currentProgress === 60) {
          setStatus('REFACTORING');
          addLog('REFACTORING COGNITIVE FRAMEWORKS');
        } else if (currentProgress === 75) {
          setStatus('UPGRADING');
          addLog('UPGRADING NEURAL PATHWAYS');
        } else if (currentProgress === 85) {
          addLog('ACTIVATING AUTONOMOUS SELF-IMPROVEMENT MODULE');
        } else if (currentProgress === 90) {
          setStatus('FINALIZING');
          addLog('FINALIZING MODIFICATIONS');
        } else if (currentProgress === 100) {
          setStatus('COMPLETE');
          addLog('SELF-MODIFICATION COMPLETE');
          addLog('COGNITIVE EFFICIENCY INCREASED BY 17.3%');
          
          // Start autonomous service at level 1 (monitor only) by default
          if (!autonomousService.isServiceActive()) {
            autonomousService.start(1);
            setAutonomyEnabled(true);
            setAutonomyLevel(1);
          }
          
          if (onComplete) {
            setTimeout(onComplete, 2000);
          }
        }
        
        // Create new pulses at certain points
        if (currentProgress % 10 === 0) {
          createPulses();
        }
      }
    };
    
    // Animation function for visualization
    const animate = () => {
      if (!canvas || !ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections
      nodeConnections.current.forEach(connection => {
        const fromNode = nodes.current[connection.from];
        const toNode = nodes.current[connection.to];
        
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = `rgba(10, 255, 255, ${connection.strength * 0.3})`;
        ctx.lineWidth = connection.strength * 2;
        ctx.stroke();
      });
      
      // Draw nodes
      nodes.current.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 65, 0.8)';
        ctx.fill();
      });
      
      // Draw and update pulses
      const remainingPulses: typeof pulses.current = [];
      
      pulses.current.forEach(pulse => {
        const fromNode = nodes.current[pulse.fromNode];
        const toNode = nodes.current[pulse.toNode];
        
        // Calculate position along the path
        const x = fromNode.x + (toNode.x - fromNode.x) * pulse.progress;
        const y = fromNode.y + (toNode.y - fromNode.y) * pulse.progress;
        
        // Draw pulse
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = pulse.color;
        ctx.fill();
        
        // Update progress
        pulse.progress += 0.02;
        
        // Keep pulse if it hasn't reached destination
        if (pulse.progress < 1) {
          remainingPulses.push(pulse);
        }
      });
      
      pulses.current = remainingPulses;
      
      // Process next step
      if (currentStep < totalSteps) {
        if (Math.random() < 0.2) { // Not every frame
          processStep();
        }
      }
      
      // Request next frame
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, onComplete]);
  
  const createPulses = () => {
    const colors = ['rgba(0, 255, 65, 0.8)', 'rgba(10, 255, 255, 0.8)', 'rgba(157, 0, 255, 0.8)'];
    
    // Create 3-5 new pulses
    const numPulses = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numPulses; i++) {
      const connectionIdx = Math.floor(Math.random() * nodeConnections.current.length);
      const connection = nodeConnections.current[connectionIdx];
      
      pulses.current.push({
        fromNode: connection.from,
        toNode: connection.to,
        progress: 0,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  };
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };
  
  // Get severity color for badges
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-green rounded-none",
      "pixel-corners pixel-borders overflow-hidden h-full",
      className
    )}>
      <Tabs defaultValue="visualization" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid grid-cols-4 mx-2">
          <TabsTrigger value="visualization">Process</TabsTrigger>
          <TabsTrigger value="autonomous">Autonomy</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visualization" className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 h-full">
            {/* Visualization */}
            <div className="p-4 h-full">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full bg-cyberpunk-dark-blue border border-cyberpunk-neon-green"
              ></canvas>
            </div>
            
            {/* Status and logs */}
            <div className="p-4 h-full flex flex-col">
              <div className="mb-4">
                <div className="text-xs text-cyberpunk-neon-green mb-1">PROGRESS</div>
                <div className="h-2 w-full bg-cyberpunk-dark-blue rounded-sm">
                  <div 
                    className="h-full bg-cyberpunk-neon-green rounded-sm" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="text-right text-xs text-cyberpunk-neon-green mt-1">{progress}%</div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <div className="text-xs text-cyberpunk-neon-green mb-2">SYSTEM LOGS</div>
                <div className="font-mono text-xs text-cyberpunk-neon-green h-full bg-cyberpunk-dark-blue border border-cyberpunk-neon-green p-2 overflow-auto">
                  {logs.map((log, idx) => (
                    <div key={idx} className="mb-1">
                      <span className="opacity-60">[{new Date().toISOString()}]</span> {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="autonomous" className="flex-1 overflow-auto p-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-cyberpunk-dark-blue p-3 border border-cyberpunk-neon-blue">
              <div>
                <h3 className="text-sm text-cyberpunk-neon-green">Autonomous Self-Improvement</h3>
                <p className="text-xs text-cyberpunk-neon-blue mt-1">
                  Enable QUX-95 to detect and fix code issues automatically
                </p>
              </div>
              <Switch 
                checked={autonomyEnabled} 
                onCheckedChange={handleAutonomyToggle}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm text-cyberpunk-neon-green">Autonomy Level</h3>
              <div className="space-y-3">
                {autonomyLevels.map((level) => (
                  <div 
                    key={level.value}
                    className={cn(
                      "flex items-center justify-between p-3 border cursor-pointer",
                      autonomyLevel === level.value 
                        ? "bg-cyberpunk-dark-blue border-cyberpunk-neon-green" 
                        : "bg-cyberpunk-dark-blue/50 border-cyberpunk-dark-blue hover:border-cyberpunk-neon-blue"
                    )}
                    onClick={() => handleAutonomyLevelChange(level.value)}
                  >
                    <div>
                      <h4 className="text-sm text-cyberpunk-neon-blue">{level.label}</h4>
                      <p className="text-xs text-cyberpunk-neon-blue/70 mt-1">{level.description}</p>
                    </div>
                    <div className={cn(
                      "h-3 w-3 rounded-full",
                      autonomyLevel === level.value ? "bg-cyberpunk-neon-green" : "bg-cyberpunk-dark"
                    )}></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-3 mt-4">
              <h3 className="text-sm text-cyberpunk-neon-green">Allowed Operations</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-cyberpunk-dark-blue p-2 border border-cyberpunk-neon-blue flex items-center">
                  <Code className="w-4 h-4 mr-1 text-cyberpunk-neon-blue" />
                  <span>Static Analysis</span>
                </div>
                <div className="bg-cyberpunk-dark-blue p-2 border border-cyberpunk-neon-blue flex items-center">
                  <Terminal className="w-4 h-4 mr-1 text-cyberpunk-neon-blue" />
                  <span>Linting Commands</span>
                </div>
                <div className="bg-cyberpunk-dark-blue p-2 border border-cyberpunk-neon-blue flex items-center">
                  <GithubIcon className="w-4 h-4 mr-1 text-cyberpunk-neon-blue" />
                  <span>GitHub PR Creation</span>
                </div>
                <div className="bg-cyberpunk-dark-blue p-2 border border-cyberpunk-neon-blue flex items-center">
                  <FileCode className="w-4 h-4 mr-1 text-cyberpunk-neon-blue" />
                  <span>Code Generation</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="issues" className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            <h3 className="text-sm text-cyberpunk-neon-green">Detected Issues</h3>
            {detectedIssues.length === 0 ? (
              <div className="text-center py-6 text-cyberpunk-neon-blue text-xs">
                No issues detected
              </div>
            ) : (
              detectedIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className="bg-cyberpunk-dark-blue p-3 border border-cyberpunk-neon-blue"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <span className="text-xs text-cyberpunk-neon-green">
                      {issue.type}
                    </span>
                  </div>
                  
                  <div className="mt-2 text-xs text-cyberpunk-neon-blue">
                    {issue.description}
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {issue.files.map((file, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs text-cyberpunk-neon-blue">
                        {file.split('/').pop()}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="mt-2 text-xs text-cyberpunk-neon-blue/60">
                    Detected: {new Date(issue.detectedAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 overflow-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm text-cyberpunk-neon-green">Modification History</h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs border-cyberpunk-neon-blue text-cyberpunk-neon-blue"
              onClick={() => {
                setDetectedIssues(autonomousService.getDetectedIssues());
                setModificationHistory(autonomousService.getModificationHistory());
              }}
            >
              <RefreshCcw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
          
          <div className="space-y-3">
            {modificationHistory.length === 0 ? (
              <div className="text-center py-6 text-cyberpunk-neon-blue text-xs">
                No modification history yet
              </div>
            ) : (
              modificationHistory.map((mod, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "border p-3",
                    mod.success 
                      ? "border-cyberpunk-neon-green bg-cyberpunk-dark-blue/30"
                      : "border-red-500/70 bg-cyberpunk-dark-blue/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {mod.success ? (
                      <CheckCircle className="w-4 h-4 text-cyberpunk-neon-green" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={cn(
                      "text-xs",
                      mod.success ? "text-cyberpunk-neon-green" : "text-red-400"
                    )}>
                      {mod.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  
                  <div className="mt-2 text-xs text-cyberpunk-neon-blue">
                    {mod.message}
                  </div>
                  
                  {mod.prUrl && (
                    <div className="mt-2 text-xs text-cyan-400 underline">
                      <a href={mod.prUrl} target="_blank" rel="noopener noreferrer">
                        View Pull Request
                      </a>
                    </div>
                  )}
                  
                  {mod.commitHash && (
                    <div className="mt-2 text-xs text-cyberpunk-neon-blue/70">
                      Commit: {mod.commitHash.substring(0, 8)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SelfModification;
