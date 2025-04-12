
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Cpu, HardDrive, Network, AlertTriangle, Server, Zap } from 'lucide-react';
import { ollamaService } from '@/services/ollamaService';
import { useTheme } from '@/contexts/ThemeContext';
import AlertsPanel from './AlertsPanel';

interface StatusBarProps {
  className?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusIndicators, setStatusIndicators] = useState({
    cpu: getRandomInt(10, 60),
    memory: getRandomInt(20, 80),
    network: 'ONLINE',
    alerts: 0,
    modelStatus: 'OPTIMAL',
    ollamaStatus: 'DISCONNECTED' // Initial status for Ollama connection
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
      // Check real Ollama connection status
      ollamaService.checkConnection().then(connected => {
        const ollamaStatus = connected ? 'CONNECTED' : 'DISCONNECTED';

        setStatusIndicators(prev => ({
          ...prev,
          cpu: getRandomInt(10, 60),
          memory: getRandomInt(20, 80),
          network: Math.random() > 0.02 ? 'ONLINE' : 'DEGRADED',
          alerts: Math.random() > 0.95 ? getRandomInt(1, 3) : prev.alerts,
          modelStatus: Math.random() > 0.05 ? 'OPTIMAL' : 'LEARNING',
          ollamaStatus
        }));
      });
    }, 5000);

    // Check Ollama connection on component mount
    ollamaService.checkConnection().then(connected => {
      setStatusIndicators(prev => ({
        ...prev,
        ollamaStatus: connected ? 'CONNECTED' : 'DISCONNECTED'
      }));
    });

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

  // Apply theme-specific colors
  const getThemeColor = () => {
    switch (theme) {
      case 'cyberpunk':
        return 'border-cyberpunk-neon-green shadow-[0_0_8px_rgba(0,255,65,0.3)]';
      case 'terminal':
        return 'border-[#33ff33] shadow-[0_0_8px_rgba(51,255,51,0.3)]';
      case 'hacker':
        return 'border-[#0f0] shadow-[0_0_8px_rgba(0,255,0,0.3)]';
      default:
        return 'border-cyberpunk-neon-green shadow-[0_0_8px_rgba(0,255,65,0.3)]';
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-1 bg-cyberpunk-dark border-t",
      "text-xs font-terminal",
      getThemeColor(),
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
        <AlertsPanel />

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
