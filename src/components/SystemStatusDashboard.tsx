import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Progress, Separator } from '@/components/ui';
import { Cpu, HardDrive, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { detectHardwareCapabilities } from '@/utils/browserCapabilities';
import { SystemStatus } from '@/components/ChatWindow/types';

interface SystemStatusDashboardProps {
  className?: string;
}

const SystemStatusDashboard: React.FC<SystemStatusDashboardProps> = ({ className }) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    cpu: { usage: 0, cores: 0 },
    memory: { used: 0, total: 0, percentage: 0 },
    activeProcesses: []
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load and update system metrics
  useEffect(() => {
    const loadInitialMetrics = async () => {
      try {
        // Get hardware capabilities
        const capabilities = await detectHardwareCapabilities();
        
        // Initialize with estimated values
        setSystemStatus({
          cpu: { 
            usage: Math.random() * 25 + 5, // 5-30% initial usage 
            cores: navigator.hardwareConcurrency || 4
          },
          memory: { 
            used: 2 * 1024, // 2GB used
            total: capabilities.memory * 1024, // Convert to MB
            percentage: 2 / capabilities.memory * 100
          },
          gpu: capabilities.webGPU ? {
            usage: Math.random() * 10,
            vram: {
              used: 512,
              total: 4096,
              percentage: 12.5
            }
          } : undefined,
          activeProcesses: [
            {
              id: 'system-1',
              name: 'System Monitoring',
              status: 'active' as const,
              startTime: new Date(),
              progress: 100
            }
          ]
        });
      } catch (error) {
        console.error('Failed to load hardware metrics:', error);
        toast.error('Failed to load system metrics');
      }
    };
    
    loadInitialMetrics();
    
    // Simulate metric changes
    const intervalId = setInterval(() => {
      setSystemStatus(prev => {
        // Simulate CPU fluctuations
        const newCpuUsage = Math.min(100, Math.max(0, 
          prev.cpu.usage + (Math.random() * 10 - 5)
        ));
        
        // Simulate memory changes
        const memoryChange = Math.random() > 0.7 ? (Math.random() * 200 - 100) : 0;
        const newMemoryUsed = Math.max(100, prev.memory.used + memoryChange);
        const newMemoryPercentage = (newMemoryUsed / prev.memory.total) * 100;
        
        // Simulate GPU changes if available
        const newGpu = prev.gpu ? {
          usage: Math.min(100, Math.max(0, 
            prev.gpu.usage + (Math.random() * 8 - 4)
          )),
          vram: {
            ...prev.gpu.vram,
            used: Math.max(128, prev.gpu.vram.used + (Math.random() > 0.7 ? (Math.random() * 100 - 50) : 0)),
          }
        } : undefined;
        
        if (newGpu) {
          newGpu.vram.percentage = (newGpu.vram.used / newGpu.vram.total) * 100;
        }
        
        // Simulate process changes
        let newProcesses = [...prev.activeProcesses];
        
        // Randomly update process progress or complete processes
        newProcesses = newProcesses.map(process => {
          if (process.status === 'active' && process.progress !== undefined && process.progress < 100) {
            const newProgress = Math.min(100, process.progress + Math.random() * 10);
            const newStatus = newProgress >= 100 ? 'completed' as const : 'active' as const;
            return { ...process, progress: newProgress, status: newStatus };
          }
          return process;
        });
        
        // Randomly add new processes (5% chance)
        if (Math.random() > 0.95 && newProcesses.length < 5) {
          const processes = [
            'Memory Analysis',
            'Parameter Optimization',
            'Context Retrieval',
            'Code Refactoring',
            'Performance Profiling'
          ];
          const randomProcess = processes[Math.floor(Math.random() * processes.length)];
          
          newProcesses.push({
            id: `process-${Date.now()}`,
            name: randomProcess,
            status: 'active' as const,
            startTime: new Date(),
            progress: 0
          });
          
          // Toast for new process
          toast.info(`New process started: ${randomProcess}`, {
            description: "Autonomous optimization in progress"
          });
        }
        
        // Cleanup completed processes older than 30 seconds
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        newProcesses = newProcesses.filter(process => 
          !(process.status === 'completed' && process.startTime < thirtySecondsAgo)
        );
        
        return {
          cpu: { ...prev.cpu, usage: newCpuUsage },
          memory: { 
            ...prev.memory, 
            used: newMemoryUsed,
            percentage: newMemoryPercentage
          },
          gpu: newGpu,
          activeProcesses: newProcesses
        };
      });
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, []);

  const formatSize = (size: number): string => {
    if (size < 1024) return `${size.toFixed(0)} MB`;
    return `${(size / 1024).toFixed(1)} GB`;
  };

  // Process status color
  const getProcessStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'completed': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-blue rounded-none",
      "pixel-corners pixel-borders transition-all",
      isCollapsed ? "h-12" : "h-auto",
      className
    )}>
      <div 
        className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-blue h-5 flex items-center px-2 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "Expand system status" : "Collapse system status"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
      >
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">SYSTEM STATUS</div>
        <div className="text-cyberpunk-dark text-xs ml-auto">
          {isCollapsed ? '[+]' : '[-]'}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-4 pt-6 overflow-hidden animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU Status */}
            <div className="bg-cyberpunk-dark-blue p-3 border border-cyberpunk-neon-blue">
              <div className="flex items-center mb-2">
                <Cpu className="h-4 w-4 mr-2 text-cyberpunk-neon-blue" />
                <span className="text-cyberpunk-neon-blue text-sm">CPU</span>
                <span className="ml-auto text-cyberpunk-neon-green text-sm">
                  {systemStatus.cpu.usage.toFixed(1)}% / {systemStatus.cpu.cores} Cores
                </span>
              </div>
              <Progress 
                value={systemStatus.cpu.usage} 
                className="h-2 bg-cyberpunk-dark" 
                aria-label="CPU Usage"
              />
            </div>
            
            {/* Memory Status */}
            <div className="bg-cyberpunk-dark-blue p-3 border border-cyberpunk-neon-blue">
              <div className="flex items-center mb-2">
                <HardDrive className="h-4 w-4 mr-2 text-cyberpunk-neon-blue" />
                <span className="text-cyberpunk-neon-blue text-sm">Memory</span>
                <span className="ml-auto text-cyberpunk-neon-green text-sm">
                  {formatSize(systemStatus.memory.used)} / {formatSize(systemStatus.memory.total)}
                </span>
              </div>
              <Progress 
                value={systemStatus.memory.percentage} 
                className="h-2 bg-cyberpunk-dark" 
                aria-label="Memory Usage"
              />
            </div>
            
            {/* GPU Status if available */}
            {systemStatus.gpu && (
              <div className="bg-cyberpunk-dark-blue p-3 border border-cyberpunk-neon-blue">
                <div className="flex items-center mb-2">
                  <HardDrive className="h-4 w-4 mr-2 text-cyberpunk-neon-blue" />
                  <span className="text-cyberpunk-neon-blue text-sm">GPU</span>
                  <span className="ml-auto text-cyberpunk-neon-green text-sm">
                    {systemStatus.gpu.usage.toFixed(1)}% / {formatSize(systemStatus.gpu.vram.used)} VRAM
                  </span>
                </div>
                <Progress 
                  value={systemStatus.gpu.vram.percentage} 
                  className="h-2 bg-cyberpunk-dark" 
                  aria-label="GPU Usage"
                />
              </div>
            )}
            
            {/* Active Processes */}
            <div className="bg-cyberpunk-dark-blue p-3 border border-cyberpunk-neon-blue md:col-span-2">
              <div className="flex items-center mb-2">
                <Activity className="h-4 w-4 mr-2 text-cyberpunk-neon-blue" />
                <span className="text-cyberpunk-neon-blue text-sm">Active Processes</span>
                <span className="ml-auto text-cyberpunk-neon-green text-sm">
                  {systemStatus.activeProcesses.length}
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto" role="list">
                {systemStatus.activeProcesses.length === 0 ? (
                  <div className="text-gray-400 text-xs">No active processes</div>
                ) : (
                  systemStatus.activeProcesses.map((process, index) => (
                    <div key={process.id} className="mb-2">
                      <div className="flex items-center">
                        <span className={`text-xs ${getProcessStatusColor(process.status)}`}>
                          {process.name}
                        </span>
                        <span className="ml-auto text-xs text-gray-400">
                          {new Date(process.startTime).toLocaleTimeString()}
                        </span>
                      </div>
                      {process.progress !== undefined && (
                        <Progress 
                          value={process.progress} 
                          className="h-1 mt-1 bg-cyberpunk-dark" 
                          aria-label={`${process.name} Progress`}
                        />
                      )}
                      {index < systemStatus.activeProcesses.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SystemStatusDashboard);
