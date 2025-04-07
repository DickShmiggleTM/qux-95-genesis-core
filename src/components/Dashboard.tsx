
import React, { useState } from 'react';
import Terminal from './Terminal';
import ModelSelector from './ModelSelector';
import ChatWindow from './ChatWindow';
import StatusBar from './StatusBar';
import SelfModification from './SelfModification';
import CodeDisplay from './CodeDisplay';
import Settings from './Settings';
import { Button } from '@/components/ui/button';
import { 
  TerminalSquare, 
  Settings as SettingsIcon, 
  Code, 
  MessageSquare, 
  Database, 
  RefreshCcw,
  Power
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'chat' | 'code' | 'settings'>('chat');
  const [isSelfModifying, setIsSelfModifying] = useState(false);
  const [systemStatus, setSystemStatus] = useState('ONLINE');

  const handleTerminalCommand = (command: string) => {
    console.log('Terminal command:', command);
    
    if (command.toLowerCase() === 'status') {
      return 'System Status: ' + systemStatus;
    }
    
    if (command.toLowerCase() === 'modify' || command.toLowerCase().includes('self-mod')) {
      setIsSelfModifying(true);
      return 'Initiating self-modification sequence...';
    }
  };

  const handleSelfModificationComplete = () => {
    setIsSelfModifying(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-cyberpunk-dark text-cyberpunk-neon-green font-terminal">
      {/* Scanlines effect */}
      <div className="scanline"></div>
      <div className="scanline-2"></div>
      <div className="crt"></div>
      
      {/* Header */}
      <header className="p-2 border-b border-cyberpunk-neon-green">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl font-pixel text-cyberpunk-neon-green neon-glow mr-2">QUX-95</div>
            <div className="text-sm opacity-70">GENESIS CORE v1.0.2</div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={systemStatus === 'OFFLINE' ? "destructive" : "outline"}
              className={cn(
                systemStatus === 'ONLINE' ? "border-cyberpunk-neon-green text-cyberpunk-neon-green" : "",
                "text-xs"
              )}
              onClick={() => setSystemStatus(systemStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE')}
            >
              <Power className="h-3 w-3 mr-1" />
              {systemStatus}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple text-xs"
              onClick={() => setIsSelfModifying(true)}
              disabled={isSelfModifying}
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              {isSelfModifying ? 'MODIFYING...' : 'SELF-MODIFY'}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto grid grid-cols-4 gap-4 p-4 overflow-hidden">
        {/* Left Panel */}
        <div className="col-span-1 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16",
                "border border-cyberpunk-neon-green hover:bg-cyberpunk-dark",
                activeTab === 'terminal' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('terminal')}
            >
              <TerminalSquare className="h-5 w-5 mb-1" />
              <span className="text-xs">TERM</span>
            </Button>
            
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16",
                "border border-cyberpunk-neon-blue hover:bg-cyberpunk-dark",
                activeTab === 'chat' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare className="h-5 w-5 mb-1" />
              <span className="text-xs">CHAT</span>
            </Button>
            
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16",
                "border border-cyberpunk-neon-blue hover:bg-cyberpunk-dark",
                activeTab === 'code' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('code')}
            >
              <Code className="h-5 w-5 mb-1" />
              <span className="text-xs">CODE</span>
            </Button>
            
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16",
                "border border-cyberpunk-neon-purple hover:bg-cyberpunk-dark",
                activeTab === 'settings' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('settings')}
            >
              <SettingsIcon className="h-5 w-5 mb-1" />
              <span className="text-xs">CONFIG</span>
            </Button>
          </div>
          
          <ModelSelector className="h-[calc(100vh-14rem)]" />
        </div>
        
        {/* Main Panel */}
        <div className="col-span-3 flex flex-col">
          <div className="flex-1 overflow-hidden">
            {activeTab === 'terminal' && (
              <Terminal 
                className="h-[calc(100vh-10rem)]" 
                initialMessages={[
                  "QUX-95 GENESIS CORE v1.0.2",
                  "Copyright (c) 2025 Qux Systems",
                  "Type 'help' for available commands.",
                ]}
                onCommand={handleTerminalCommand}
              />
            )}
            
            {activeTab === 'chat' && (
              <ChatWindow className="h-[calc(100vh-10rem)]" />
            )}
            
            {activeTab === 'code' && (
              <CodeDisplay className="h-[calc(100vh-10rem)]" activeLines={[3, 4, 5, 6, 25, 26]} />
            )}
            
            {activeTab === 'settings' && (
              <Settings className="h-[calc(100vh-10rem)]" />
            )}
          </div>
        </div>
      </main>
      
      {/* Status Bar */}
      <StatusBar />
      
      {/* Self-Modification Overlay */}
      {isSelfModifying && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-8">
          <SelfModification 
            active={true} 
            className="w-full max-w-4xl h-[500px]" 
            onComplete={handleSelfModificationComplete}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
