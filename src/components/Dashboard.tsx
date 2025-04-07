
import React, { useState, useEffect } from 'react';
import Terminal from './Terminal';
import ModelSelector from './ModelSelector';
import ChatWindow from './ChatWindow';
import StatusBar from './StatusBar';
import SelfModification from './SelfModification';
import CodeDisplay from './CodeDisplay';
import Settings from './Settings';
import DocumentRag from './DocumentRag';
import ImageGeneration from './ImageGeneration';
import PromptEditor from './PromptEditor';
import { Button } from '@/components/ui/button';
import { 
  TerminalSquare, 
  Settings as SettingsIcon, 
  Code, 
  MessageSquare, 
  Database, 
  RefreshCcw,
  Power,
  FileText,
  Image,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";

// Define the available tabs for the main interface
type TabType = 'terminal' | 'chat' | 'code' | 'settings' | 'rag' | 'image-gen' | 'prompt-edit';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isSelfModifying, setIsSelfModifying] = useState(false);
  const [systemStatus, setSystemStatus] = useState('ONLINE');
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  
  // Simulate Ollama connection on startup
  useEffect(() => {
    const connectToOllama = async () => {
      try {
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setIsOllamaConnected(true);
        toast.success("Connected to Ollama successfully", {
          description: "Local Ollama instance detected and connected"
        });
      } catch (error) {
        console.error("Failed to connect to Ollama:", error);
        toast.error("Failed to connect to Ollama", {
          description: "Please ensure Ollama is running locally"
        });
      }
    };
    
    connectToOllama();
  }, []);

  const handleTerminalCommand = (command: string) => {
    console.log('Terminal command:', command);
    
    if (command.toLowerCase() === 'status') {
      return `System Status: ${systemStatus}\nOllama Connection: ${isOllamaConnected ? 'CONNECTED' : 'DISCONNECTED'}`;
    }
    
    if (command.toLowerCase() === 'connect ollama') {
      if (isOllamaConnected) {
        return 'Already connected to Ollama.';
      }
      
      setIsOllamaConnected(true);
      return 'Connecting to Ollama... Connection successful.';
    }
    
    if (command.toLowerCase() === 'modify' || command.toLowerCase().includes('self-mod')) {
      setIsSelfModifying(true);
      return 'Initiating self-modification sequence...';
    }
    
    return `Command '${command}' not recognized. Type 'help' for available commands.`;
  };

  const handleSelfModificationComplete = () => {
    setIsSelfModifying(false);
    toast.success("Self-modification complete", {
      description: "System performance enhanced by 17.3%"
    });
  };

  const handleModelSelect = (model: any) => {
    toast.success(`Model ${model.name} selected`, {
      description: `${model.parameters} parameters loaded successfully`
    });
  };

  const handleSystemToggle = () => {
    const newStatus = systemStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    setSystemStatus(newStatus);
    
    if (newStatus === 'ONLINE') {
      toast.success("System activated", {
        description: "All subsystems online and operational"
      });
    } else {
      toast.error("System deactivated", {
        description: "Core functions are now offline"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cyberpunk-dark text-cyberpunk-neon-green font-terminal">
      {/* Scanlines effect */}
      <div className="scanline"></div>
      <div className="scanline-2"></div>
      <div className="crt"></div>
      
      {/* Header */}
      <header className="p-2 border-b border-cyberpunk-neon-green bg-cyberpunk-dark-blue shadow-[0_0_10px_rgba(0,255,65,0.2)]">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl font-pixel text-cyberpunk-neon-green neon-glow mr-2">QUX-95</div>
            <div className="text-sm opacity-70">GENESIS CORE v1.1.0</div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={systemStatus === 'OFFLINE' ? "destructive" : "outline"}
              className={cn(
                systemStatus === 'ONLINE' ? "border-cyberpunk-neon-green text-cyberpunk-neon-green" : "",
                "text-xs shadow-[0_0_5px_rgba(0,255,65,0.3)]"
              )}
              onClick={handleSystemToggle}
            >
              <Power className="h-3 w-3 mr-1" />
              {systemStatus}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple text-xs shadow-[0_0_5px_rgba(157,0,255,0.3)]"
              onClick={() => setIsSelfModifying(true)}
              disabled={isSelfModifying || systemStatus === 'OFFLINE'}
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              {isSelfModifying ? 'MODIFYING...' : 'SELF-MODIFY'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "text-xs",
                isOllamaConnected 
                  ? "border-cyberpunk-neon-green text-cyberpunk-neon-green" 
                  : "border-red-500 text-red-500"
              )}
              disabled={true}
            >
              <Database className="h-3 w-3 mr-1" />
              {isOllamaConnected ? 'OLLAMA CONNECTED' : 'CONNECTING TO OLLAMA...'}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto grid grid-cols-4 gap-4 p-4 overflow-hidden">
        {/* Left Panel */}
        <div className="col-span-1 space-y-4">
          <div className="grid grid-cols-7 gap-2">
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
                "border border-cyberpunk-neon-pink hover:bg-cyberpunk-dark",
                activeTab === 'rag' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('rag')}
            >
              <FileText className="h-5 w-5 mb-1" />
              <span className="text-xs">RAG</span>
            </Button>
            
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16",
                "border border-cyberpunk-neon-pink hover:bg-cyberpunk-dark",
                activeTab === 'image-gen' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('image-gen')}
            >
              <Image className="h-5 w-5 mb-1" />
              <span className="text-xs">IMAGE</span>
            </Button>
            
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16",
                "border border-cyberpunk-neon-pink hover:bg-cyberpunk-dark",
                activeTab === 'prompt-edit' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('prompt-edit')}
            >
              <Edit className="h-5 w-5 mb-1" />
              <span className="text-xs">PROMPT</span>
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
          
          <ModelSelector 
            className="h-[calc(100vh-14rem)]" 
            onModelSelect={handleModelSelect}
          />
        </div>
        
        {/* Main Panel */}
        <div className="col-span-3 flex flex-col">
          <div className="flex-1 overflow-hidden">
            {activeTab === 'terminal' && (
              <Terminal 
                className="h-[calc(100vh-10rem)]" 
                initialMessages={[
                  "QUX-95 GENESIS CORE v1.1.0",
                  "Copyright (c) 2025 Qux Systems",
                  "Type 'help' for available commands.",
                  isOllamaConnected ? "Ollama connection established." : "Connecting to Ollama..."
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
            
            {activeTab === 'rag' && (
              <DocumentRag className="h-[calc(100vh-10rem)]" />
            )}
            
            {activeTab === 'image-gen' && (
              <ImageGeneration className="h-[calc(100vh-10rem)]" />
            )}
            
            {activeTab === 'prompt-edit' && (
              <PromptEditor className="h-[calc(100vh-10rem)]" />
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
