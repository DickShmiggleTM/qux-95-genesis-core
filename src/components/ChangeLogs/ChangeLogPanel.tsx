import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { selfImprovingAgent, CodeChange } from '@/services/ai/SelfImprovingAgent';
import { dependencyManager, DependencyChangeRequest } from '@/services/ai/DependencyManager';
import { Scrollbar } from '@/components/ui/scrollbar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronUp, ChevronDown, Code, Package, FileCode, Settings, Calendar } from 'lucide-react';

interface ChangeLogPanelProps {
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const ChangeLogPanel: React.FC<ChangeLogPanelProps> = ({ 
  className,
  isOpen = false,
  onToggle 
}) => {
  const [open, setOpen] = useState(isOpen);
  const [codeChanges, setCodeChanges] = useState<CodeChange[]>([]);
  const [dependencyChanges, setDependencyChanges] = useState<DependencyChangeRequest[]>([]);
  const [activeTab, setActiveTab] = useState('code');

  // Initialize and listen for changes
  useEffect(() => {
    // Initial load
    setCodeChanges(selfImprovingAgent.getCodeChanges());
    setDependencyChanges(dependencyManager.getAllDependencyChangeRequests());

    // Listen for new code changes
    const codeChangeListener = (change: CodeChange) => {
      setCodeChanges(prevChanges => [change, ...prevChanges]);
    };

    // Listen for new dependency changes
    const depChangeListener = (change: DependencyChangeRequest) => {
      setDependencyChanges(prevChanges => {
        const existingIndex = prevChanges.findIndex(c => c.id === change.id);
        if (existingIndex >= 0) {
          // Update existing change
          const newChanges = [...prevChanges];
          newChanges[existingIndex] = change;
          return newChanges;
        } else {
          // Add new change
          return [change, ...prevChanges];
        }
      });
    };

    // Register listeners
    selfImprovingAgent.onCodeChange(codeChangeListener);
    dependencyManager.onDependencyChange(depChangeListener);

    // Cleanup listeners
    return () => {
      // In a real implementation, would need to remove listeners
    };
  }, []);

  // Toggle panel visibility
  const handleToggle = () => {
    setOpen(!open);
    if (onToggle) {
      onToggle();
    }
  };

  return (
    <div className={cn(
      "change-log-panel fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50",
      "w-2/3 bg-cyberpunk-dark border border-cyberpunk-neon-green",
      "transition-all duration-300 ease-in-out",
      open ? "h-80" : "h-10",
      className
    )}>
      {/* Header */}
      <div 
        className="h-10 bg-cyberpunk-neon-green flex items-center justify-between px-4 cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-center space-x-2">
          <FileCode size={16} className="text-cyberpunk-dark" />
          <span className="text-cyberpunk-dark font-bold">SYSTEM CHANGE LOGS</span>
          <Badge variant="outline" className="bg-cyberpunk-dark text-cyberpunk-neon-green border-cyberpunk-neon-blue">
            {codeChanges.length + dependencyChanges.length} Changes
          </Badge>
        </div>
        <div className="flex items-center">
          {open ? (
            <ChevronDown size={20} className="text-cyberpunk-dark" />
          ) : (
            <ChevronUp size={20} className="text-cyberpunk-dark" />
          )}
        </div>
      </div>

      {/* Panel Content */}
      {open && (
        <div className="h-[calc(100%-40px)] bg-cyberpunk-dark p-4 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 bg-cyberpunk-dark-blue">
              <TabsTrigger 
                value="code" 
                className={activeTab === 'code' ? 'bg-cyberpunk-neon-green text-cyberpunk-dark' : 'text-cyberpunk-neon-green'}
              >
                <Code size={16} className="mr-2" />
                Code Changes ({codeChanges.length})
              </TabsTrigger>
              <TabsTrigger 
                value="dependencies" 
                className={activeTab === 'dependencies' ? 'bg-cyberpunk-neon-green text-cyberpunk-dark' : 'text-cyberpunk-neon-green'}
              >
                <Package size={16} className="mr-2" />
                Dependencies ({dependencyChanges.length})
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className={activeTab === 'settings' ? 'bg-cyberpunk-neon-green text-cyberpunk-dark' : 'text-cyberpunk-neon-green'}
              >
                <Settings size={16} className="mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Code Changes Tab */}
            <TabsContent value="code" className="flex-1 overflow-hidden">
              <Scrollbar className="h-full pr-4">
                <div className="space-y-4">
                  {codeChanges.length === 0 ? (
                    <div className="text-center text-cyberpunk-neon-blue py-8">
                      No code changes recorded yet
                    </div>
                  ) : (
                    codeChanges.map(change => (
                      <CodeChangeItem key={change.id} change={change} />
                    ))
                  )}
                </div>
              </Scrollbar>
            </TabsContent>

            {/* Dependencies Tab */}
            <TabsContent value="dependencies" className="flex-1 overflow-hidden">
              <Scrollbar className="h-full pr-4">
                <div className="space-y-4">
                  {dependencyChanges.length === 0 ? (
                    <div className="text-center text-cyberpunk-neon-blue py-8">
                      No dependency changes recorded yet
                    </div>
                  ) : (
                    dependencyChanges.map(change => (
                      <DependencyChangeItem key={change.id} change={change} />
                    ))
                  )}
                </div>
              </Scrollbar>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="flex-1 overflow-hidden">
              <Scrollbar className="h-full pr-4">
                <div className="space-y-4">
                  <div className="bg-cyberpunk-dark-blue p-4 rounded border border-cyberpunk-neon-blue">
                    <h3 className="text-cyberpunk-neon-blue font-bold mb-2">AI Agent Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-cyberpunk-neon-green mb-1">Autonomous Mode</label>
                        <select 
                          className="w-full bg-cyberpunk-dark border border-cyberpunk-neon-blue text-cyberpunk-neon-blue p-2 rounded"
                        >
                          <option value="off">Disabled</option>
                          <option value="semi">Semi-Autonomous</option>
                          <option value="full">Fully Autonomous</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-cyberpunk-neon-green mb-1">Review Frequency</label>
                        <select 
                          className="w-full bg-cyberpunk-dark border border-cyberpunk-neon-blue text-cyberpunk-neon-blue p-2 rounded"
                        >
                          <option value="300000">5 Minutes</option>
                          <option value="900000">15 Minutes</option>
                          <option value="3600000">1 Hour</option>
                          <option value="86400000">24 Hours</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-cyberpunk-neon-green mb-1">Approval Required</label>
                        <select 
                          className="w-full bg-cyberpunk-dark border border-cyberpunk-neon-blue text-cyberpunk-neon-blue p-2 rounded"
                        >
                          <option value="all">All Changes</option>
                          <option value="major">Major Changes Only</option>
                          <option value="none">No Approval Needed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-cyberpunk-neon-green mb-1">Log Retention</label>
                        <select 
                          className="w-full bg-cyberpunk-dark border border-cyberpunk-neon-blue text-cyberpunk-neon-blue p-2 rounded"
                        >
                          <option value="7">7 Days</option>
                          <option value="30">30 Days</option>
                          <option value="90">90 Days</option>
                          <option value="0">Indefinite</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button className="bg-cyberpunk-neon-blue text-cyberpunk-dark py-2 px-4 rounded">
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              </Scrollbar>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

// Component for individual code change items
const CodeChangeItem: React.FC<{ change: CodeChange }> = ({ change }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: CodeChange['status']) => {
    switch (status) {
      case 'applied': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'reverted': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getChangeTypeIcon = (type: CodeChange['changeType']) => {
    switch (type) {
      case 'add': return '＋';
      case 'remove': return '－';
      case 'modify': return '✎';
      case 'refactor': return '⟲';
      case 'optimize': return '⚡';
      default: return '⦿';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div 
      className={cn(
        "bg-cyberpunk-dark-blue p-3 rounded border",
        expanded ? "border-cyberpunk-neon-green" : "border-cyberpunk-neon-blue",
        "hover:border-cyberpunk-neon-green transition-colors duration-200"
      )}
    >
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${getStatusColor(change.status)}`}>
            {getChangeTypeIcon(change.changeType)}
          </div>
          <div>
            <div className="text-cyberpunk-neon-green font-medium">
              {change.changeType.charAt(0).toUpperCase() + change.changeType.slice(1)}: {change.fileModified}
            </div>
            <div className="text-cyberpunk-neon-blue text-sm truncate max-w-lg">
              {change.description}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-cyberpunk-neon-purple text-xs flex items-center">
            <Calendar size={12} className="mr-1" />
            {formatTimestamp(change.timestamp)}
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 border-t border-cyberpunk-neon-blue pt-3">
          <div className="mb-2">
            <span className="text-cyberpunk-neon-purple text-xs">Status: </span>
            <span className="text-cyberpunk-neon-green">
              {change.status.charAt(0).toUpperCase() + change.status.slice(1)}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-cyberpunk-neon-purple text-xs">Author: </span>
            <span className="text-cyberpunk-neon-green">
              {change.author === 'ai-agent' ? 'QUX-95 AI Agent' : 'User'}
            </span>
          </div>
          {(change.codeBeforeChange || change.codeAfterChange) && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {change.codeBeforeChange && (
                <div className="bg-[#1a1a2e] p-2 rounded text-xs font-mono">
                  <div className="text-cyberpunk-neon-purple mb-1">Before:</div>
                  <pre className="text-gray-300 whitespace-pre-wrap">
                    {change.codeBeforeChange}
                  </pre>
                </div>
              )}
              {change.codeAfterChange && (
                <div className="bg-[#1a1a2e] p-2 rounded text-xs font-mono">
                  <div className="text-cyberpunk-neon-green mb-1">After:</div>
                  <pre className="text-gray-300 whitespace-pre-wrap">
                    {change.codeAfterChange}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Component for individual dependency change items
const DependencyChangeItem: React.FC<{ change: DependencyChangeRequest }> = ({ change }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: DependencyChangeRequest['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-blue-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getChangeTypeIcon = (type: DependencyChangeRequest['requestType']) => {
    switch (type) {
      case 'install': return '＋';
      case 'remove': return '－';
      case 'update': return '⟲';
      default: return '⦿';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div 
      className={cn(
        "bg-cyberpunk-dark-blue p-3 rounded border",
        expanded ? "border-cyberpunk-neon-green" : "border-cyberpunk-neon-blue",
        "hover:border-cyberpunk-neon-green transition-colors duration-200"
      )}
    >
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${getStatusColor(change.status)}`}>
            {getChangeTypeIcon(change.requestType)}
          </div>
          <div>
            <div className="text-cyberpunk-neon-green font-medium">
              {change.requestType.charAt(0).toUpperCase() + change.requestType.slice(1)} Dependency
            </div>
            <div className="text-cyberpunk-neon-blue text-sm truncate max-w-lg">
              {change.reason}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-cyberpunk-neon-purple text-xs flex items-center">
            <Calendar size={12} className="mr-1" />
            {formatTimestamp(change.created)}
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 border-t border-cyberpunk-neon-blue pt-3">
          <div className="mb-2">
            <span className="text-cyberpunk-neon-purple text-xs">Status: </span>
            <span className="text-cyberpunk-neon-green">
              {change.status.charAt(0).toUpperCase() + change.status.slice(1)}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-cyberpunk-neon-purple text-xs">Dependency ID: </span>
            <span className="text-cyberpunk-neon-green">
              {change.dependencyId}
            </span>
          </div>
          {change.targetVersion && (
            <div className="mb-2">
              <span className="text-cyberpunk-neon-purple text-xs">Target Version: </span>
              <span className="text-cyberpunk-neon-green">{change.targetVersion}</span>
            </div>
          )}
          {change.completed && (
            <div className="mb-2">
              <span className="text-cyberpunk-neon-purple text-xs">Completed: </span>
              <span className="text-cyberpunk-neon-green">{formatTimestamp(change.completed)}</span>
            </div>
          )}
          {change.codeChanges && change.codeChanges.length > 0 && (
            <div className="mt-3">
              <div className="text-cyberpunk-neon-purple text-xs mb-2">Related Code Changes:</div>
              <div className="space-y-2">
                {change.codeChanges.map(codeChange => (
                  <div key={codeChange.id} className="bg-[#1a1a2e] p-2 rounded text-xs">
                    <div className="text-cyberpunk-neon-green">{codeChange.description}</div>
                    <div className="text-gray-400">{codeChange.fileModified}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChangeLogPanel;
