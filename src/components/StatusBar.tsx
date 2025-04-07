
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Cpu, HardDrive, Network, AlertTriangle, Server, Zap } from 'lucide-react';

interface StatusBarProps {
  className?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusIndicators, setStatusIndicators] = useState({
    cpu: getRandomInt(10, 60),
    memory: getRandomInt(20, 80),
    network: 'ONLINE',
    alerts: 0,
    modelStatus: 'OPTIMAL',
    ollamaStatus: 'DISCONNECTED' // New status for Ollama connection
  });

  function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  useEffect(() => {
    // Update clock
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Simulate changing system stats
    const statsInterval = setInterval(() => {
      setStatusIndicators(prev => ({
        ...prev,
        cpu: getRandomInt(10, 60),
        memory: getRandomInt(20, 80),
        network: Math.random() > 0.02 ? 'ONLINE' : 'DEGRADED',
        alerts: Math.random() > 0.95 ? getRandomInt(1, 3) : prev.alerts,
        modelStatus: Math.random() > 0.05 ? 'OPTIMAL' : 'LEARNING',
        ollamaStatus: Math.random() > 0.1 ? 'CONNECTED' : 'ATTEMPTING'
      }));
    }, 5000);
    
    // Simulate Ollama connection attempt on component mount
    setTimeout(() => {
      setStatusIndicators(prev => ({
        ...prev,
        ollamaStatus: 'CONNECTED'
      }));
    }, 2000);
    
    return () => {
      clearInterval(clockInterval);
      clearInterval(statsInterval);
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit', 
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
      case 'CONNECTED':
      case 'OPTIMAL':
        return 'text-cyberpunk-neon-green';
      case 'DEGRADED':
      case 'ATTEMPTING':
      case 'LEARNING':
        return 'text-yellow-400';
      default:
        return 'text-cyberpunk-neon-pink';
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-1 bg-cyberpunk-dark border-t border-cyberpunk-neon-green",
      "text-xs font-terminal text-cyberpunk-neon-green shadow-[0_0_8px_rgba(0,255,65,0.3)]",
      className
    )}>
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <Cpu className="h-3 w-3 mr-1" />
          <span>CPU: {statusIndicators.cpu}%</span>
        </div>
        <div className="flex items-center">
          <HardDrive className="h-3 w-3 mr-1" />
          <span>MEM: {statusIndicators.memory}%</span>
        </div>
        <div className="flex items-center">
          <Network className="h-3 w-3 mr-1" />
          <span className={getStatusColor(statusIndicators.network)}>
            NET: {statusIndicators.network}
          </span>
        </div>
        <div className="flex items-center">
          <Zap className="h-3 w-3 mr-1" />
          <span className={getStatusColor(statusIndicators.ollamaStatus)}>
            OLLAMA: {statusIndicators.ollamaStatus}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {statusIndicators.alerts > 0 && (
          <div className="flex items-center text-cyberpunk-neon-pink animate-pulse">
            <AlertTriangle className="h-3 w-3 mr-1" />
            <span>ALERTS: {statusIndicators.alerts}</span>
          </div>
        )}
        
        <div className="flex items-center">
          <Server className="h-3 w-3 mr-1" />
          <span className={getStatusColor(statusIndicators.modelStatus)}>
            MODEL: {statusIndicators.modelStatus}
          </span>
        </div>
        
        <div className="text-right">
          <div>{formatTime(currentTime)}</div>
          <div className="text-cyberpunk-neon-green text-opacity-70">{formatDate(currentTime)}</div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
