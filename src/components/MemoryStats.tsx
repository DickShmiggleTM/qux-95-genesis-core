/**
 * Memory Statistics Component
 * 
 * Displays memory usage and statistics, and provides controls for memory operations
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import DraggableWindow from './DraggableWindow';
import { enhancedMemoryManager } from '@/services/memory/EnhancedMemoryManager';
import { MemoryStats as MemoryStatsType, MemoryItem } from '@/services/memory/MemoryTypes';
import { 
  Brain,
  Database,
  BarChart,
  Maximize,
  Minimize,
  RefreshCcw,
  Trash2,
  Save,
  Search,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MemoryStatsProps {
  className?: string;
  onClear?: () => void;
  compact?: boolean;
}

const MemoryStats: React.FC<MemoryStatsProps> = ({
  className,
  onClear,
  compact = false
}) => {
  const [stats, setStats] = useState<MemoryStatsType | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [memoryCapacity, setMemoryCapacity] = useState({ short: 50, long: 1000 });
  const [recentMemories, setRecentMemories] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAsWindow, setShowAsWindow] = useState(false);
  const [windowPosition, setWindowPosition] = useState({ x: window.innerWidth - 400, y: 100 });
  
  // Load stats initially and on refresh
  useEffect(() => {
    loadStats();
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      loadStats(false);
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Load memory manager stats
  const loadStats = async (showToast: boolean = true) => {
    setIsLoading(true);
    try {
      const memoryStats = await enhancedMemoryManager.getStats();
      setStats(memoryStats);
      
      const options = enhancedMemoryManager.getOptions();
      setMemoryCapacity({
        short: options.shortTermCapacity,
        long: options.longTermCapacity
      });
      
      // Get recent memories
      const shortTerm = enhancedMemoryManager.getShortTermMemory();
      setRecentMemories(shortTerm.slice(0, 5));
      
      if (showToast) {
        toast.success('Memory stats loaded', {
          description: `Total: ${memoryStats.totalItems} items, Short-term: ${memoryStats.shortTermSize} items`
        });
      }
    } catch (error) {
      console.error('Failed to load memory stats:', error);
      if (showToast) {
        toast.error('Failed to load memory stats', {
          description: 'Could not retrieve memory information'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle memory operations
  const handleClearMemory = async () => {
    if (window.confirm('Are you sure you want to clear all memories? This cannot be undone.')) {
      try {
        await enhancedMemoryManager.clearMemory();
        loadStats();
        
        if (onClear) {
          onClear();
        }
      } catch (error) {
        console.error('Failed to clear memory:', error);
        toast.error('Failed to clear memory', {
          description: 'Some memory items may remain'
        });
      }
    }
  };
  
  const handleBackupMemory = async () => {
    try {
      const success = await enhancedMemoryManager.backupMemory('memory_backup.json');
      if (success) {
        toast.success('Memory backup created', {
          description: 'Your memory data has been backed up'
        });
      } else {
        toast.error('Memory backup failed', {
          description: 'Could not create memory backup'
        });
      }
    } catch (error) {
      console.error('Failed to backup memory:', error);
      toast.error('Memory backup failed', {
        description: 'An error occurred during backup'
      });
    }
  };
  
  // Render memory type badge with appropriate color
  const renderTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      chat: 'bg-blue-500',
      system: 'bg-green-500',
      code: 'bg-yellow-500',
      error: 'bg-red-500',
      action: 'bg-purple-500',
      memory: 'bg-cyan-500',
      file: 'bg-orange-500'
    };
    
    return (
      <Badge className={cn('rounded-sm', colors[type] || 'bg-gray-500')}>
        {type}
      </Badge>
    );
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Toggle between inline and draggable window modes
  const toggleWindowMode = () => {
    setShowAsWindow(!showAsWindow);
    setExpanded(true); // Always expand when showing as window
  };
  
  if (!stats && isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center p-4 bg-black border border-gray-700 rounded",
        className
      )}>
        <RefreshCcw className="w-5 h-5 animate-spin text-purple-500 mr-2" />
        <span className="text-purple-300">Loading memory stats...</span>
      </div>
    );
  }
  
  // Compact view (just the key stats)
  if (!expanded && !showAsWindow) {
    return (
      <div className={cn(
        "relative bg-gray-900 border border-purple-800 rounded p-3 text-sm",
        className
      )}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Brain className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-purple-300">
              Memory: {stats?.shortTermSize || 0}/{memoryCapacity.short} items
            </span>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadStats()}
              className="h-6 w-6 text-gray-400 hover:text-purple-400"
            >
              <RefreshCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(true)}
              className="h-6 w-6 text-gray-400 hover:text-purple-400"
            >
              <Maximize className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleWindowMode}
              className="h-6 w-6 text-gray-400 hover:text-purple-400"
            >
              <Maximize className="h-3 w-3 rotate-45" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Content of the memory stats for both expanded and window views
  const renderContent = () => (
    <>
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-gray-950 border-b border-gray-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="recent" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">
            Recent
          </TabsTrigger>
          <TabsTrigger value="tools" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">
            Tools
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-800 p-3 rounded flex flex-col">
                <div className="text-xs text-gray-400 mb-1">Short-Term Memory</div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-300 text-lg">{stats?.shortTermSize || 0}</span>
                  <span className="text-xs text-gray-400">of {memoryCapacity.short} items</span>
                </div>
                <Progress 
                  value={(stats?.shortTermSize || 0) / memoryCapacity.short * 100} 
                  className="h-1.5" 
                />
              </div>
              
              <div className="bg-gray-800 p-3 rounded flex flex-col">
                <div className="text-xs text-gray-400 mb-1">Long-Term Memory</div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-300 text-lg">{stats?.longTermSize || 0}</span>
                  <span className="text-xs text-gray-400">of {memoryCapacity.long} items</span>
                </div>
                <Progress 
                  value={(stats?.longTermSize || 0) / memoryCapacity.long * 100} 
                  className="h-1.5" 
                />
              </div>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-xs text-gray-400 mb-2">Memory Status</div>
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-mono",
                      stats?.indexStatus === 'ready' ? 'text-green-400 border-green-400' :
                      stats?.indexStatus === 'building' ? 'text-yellow-400 border-yellow-400' :
                      'text-red-400 border-red-400'
                    )}
                  >
                    {stats?.indexStatus?.toUpperCase() || 'ERROR'}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    Last accessed: {stats?.lastAccess ? formatDate(stats.lastAccess) : 'Never'}
                  </span>
                </div>
                <div>
                  <Badge 
                    variant="outline" 
                    className="font-mono text-blue-400 border-blue-400">
                    {stats?.totalItems || 0} TOTAL ITEMS
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="recent" className="p-0 max-h-64 overflow-y-auto">
          {recentMemories.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {recentMemories.map(memory => (
                <div key={memory.id} className="p-3 hover:bg-gray-800">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {renderTypeBadge(memory.type)}
                      <span className="text-xs text-gray-400">
                        {formatDate(memory.timestamp)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-purple-300 border-purple-500 text-xs">
                      {memory.importance.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-300 line-clamp-2">
                    {memory.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400">
              No memory items found
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="tools" className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClearMemory()}
                className="border-red-500 text-red-400 hover:bg-red-950 hover:text-red-300 flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Memory
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBackupMemory()}
                className="border-green-500 text-green-400 hover:bg-green-950 hover:text-green-300 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Backup
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  enhancedMemoryManager.applyMemoryDecay();
                  toast.success('Memory decay applied', {
                    description: 'Older memories have been decayed'
                  });
                  loadStats();
                }}
                className="border-yellow-500 text-yellow-400 hover:bg-yellow-950 hover:text-yellow-300 flex items-center"
              >
                <Clock className="h-4 w-4 mr-2" />
                Apply Decay
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Trigger memory summarization by creating a fake memory array
                  const dummyItems: MemoryItem[] = Array(20).fill(null).map((_, i) => ({
                    id: `dummy-${i}`,
                    content: `Test memory item ${i}`,
                    type: 'memory',
                    timestamp: Date.now() - i * 1000,
                    importance: 0.5,
                  }));
                  
                  // @ts-ignore - accessing private method for demo
                  enhancedMemoryManager.generateSummary?.(dummyItems);
                  
                  toast.success('Memory summarization triggered', {
                    description: 'Test summary has been generated'
                  });
                }}
                className="border-blue-500 text-blue-400 hover:bg-blue-950 hover:text-blue-300 flex items-center"
              >
                <BarChart className="h-4 w-4 mr-2" />
                Test Summary
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              Warning: Some memory operations are destructive and cannot be undone.
              Use with caution.
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );

  // If showing as a detached window
  if (showAsWindow) {
    return (
      <DraggableWindow
        title="MEMORY STATISTICS"
        defaultPosition={windowPosition}
        defaultWidth={450}
        defaultHeight={500}
        onClose={() => setShowAsWindow(false)}
        className="z-40"
      >
        <div className="h-full overflow-auto">
          {renderContent()}
        </div>
      </DraggableWindow>
    );
  }
  
  // Expanded inline view
  return (
    <div className={cn(
      "relative bg-gray-900 border border-purple-800 rounded overflow-hidden",
      className
    )}>
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => loadStats()}
          className="h-6 w-6 text-gray-400 hover:text-purple-400"
        >
          <RefreshCcw className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleWindowMode}
          className="h-6 w-6 text-gray-400 hover:text-purple-400"
        >
          <Maximize className="h-3 w-3 rotate-45" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(false)}
          className="h-6 w-6 text-gray-400 hover:text-purple-400"
        >
          <Minimize className="h-3 w-3" />
        </Button>
      </div>
      
      {renderContent()}
    </div>
  );
};

export default MemoryStats; 