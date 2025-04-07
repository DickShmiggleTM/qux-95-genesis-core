import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SelfModificationProps {
  className?: string;
  active?: boolean;
  onComplete?: () => void;
}

const SelfModification: React.FC<SelfModificationProps> = ({
  className,
  active = false,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Animation frame reference
  const animationRef = useRef<number | null>(null);
  
  // Sizes and parameters for visualization
  const nodes = useRef<Array<{x: number, y: number, connections: number[]}>>([]);
  const nodeConnections = useRef<Array<{from: number, to: number, strength: number}>>([]);
  const pulses = useRef<Array<{fromNode: number, toNode: number, progress: number, color: string}>>([]);
  
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
        } else if (currentProgress === 90) {
          setStatus('FINALIZING');
          addLog('FINALIZING MODIFICATIONS');
        } else if (currentProgress === 100) {
          setStatus('COMPLETE');
          addLog('SELF-MODIFICATION COMPLETE');
          addLog('COGNITIVE EFFICIENCY INCREASED BY 17.3%');
          
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

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-green rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-green h-5 flex items-center px-2 z-10">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">SELF-MODIFICATION</div>
        <div className="ml-auto text-xs text-cyberpunk-dark">
          STATUS: {status}
        </div>
      </div>
      
      <div className="grid grid-cols-2 h-full">
        {/* Visualization */}
        <div className="p-4 pt-6 h-full">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full bg-cyberpunk-dark-blue"
          ></canvas>
        </div>
        
        {/* Log and status */}
        <div className="p-4 pt-6 h-full flex flex-col">
          <div className="flex-1 overflow-y-auto terminal-text-output text-sm">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
          
          <div className="mt-2">
            <div className="text-xs mb-1">PROGRESS: {progress}%</div>
            <div className="w-full h-2 bg-cyberpunk-dark">
              <div 
                className="h-full bg-cyberpunk-neon-green transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfModification;
