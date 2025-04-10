
import React, { useState, useEffect, useRef } from 'react';
import Terminal, { TerminalRefHandle } from './Terminal';
import ModelSelector from './ModelSelector';
import ChatWindow from './ChatWindow';
import StatusBar from './StatusBar';
import SelfModification from './SelfModification';
import CodeDisplay from './CodeDisplay';
import Settings from './Settings';
import DocumentRag from './DocumentRag';
import ImageGeneration from './ImageGeneration';
import PromptEditor from './PromptEditor';
import WorkspaceBrowser from './WorkspaceBrowser';
import GitHubManager from './GitHubManager';
import LearningSystem from './LearningSystem';
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
  Edit,
  Folder,
  Github,
  Brain,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { ollamaService, OllamaModel } from '@/services/ollamaService';
import { ThemeProvider, useTheme, ThemeType } from '@/contexts/ThemeContext';
import { checkHardwareCapabilities, executeSystemCommand } from '@/utils/systemUtils';
import { reasoningSystem } from '@/services/reasoningSystem';
import { workspaceService } from '@/services/workspaceService';
import { githubService } from '@/services/githubService';
import { learningService } from '@/services/learningService';

// Define the available tabs for the main interface
type TabType = 'terminal' | 'chat' | 'code' | 'settings' | 'rag' | 'image-gen' | 'prompt-edit' | 'workspace' | 'github' | 'learning';

const Dashboard = () => {
  const { theme, setTheme, isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isSelfModifying, setIsSelfModifying] = useState(false);
  const [systemStatus, setSystemStatus] = useState('ONLINE');
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [currentModel, setCurrentModel] = useState<OllamaModel | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [autoModeCounter, setAutoModeCounter] = useState(0);
  
  // Create a reference to the terminal component
  const terminalRef = useRef<TerminalRefHandle>(null);
  
  // Connect to Ollama on startup
  useEffect(() => {
    const connectToOllama = async () => {
      try {
        setIsOllamaConnected(false);
        
        // Initialize Ollama service
        const connected = await ollamaService.init();
        setIsOllamaConnected(connected);
        
        if (connected) {
          // Get available models
          const models = ollamaService.getModels();
          
          if (models.length > 0) {
            setCurrentModel(models[0]);
            ollamaService.setCurrentModel(models[0].id);
          }
          
          toast.success("Connected to Ollama successfully", {
            description: "Local Ollama instance detected and connected"
          });
          
          // Enable reasoning system by default
          reasoningSystem.enable();
          
          // Initialize the workspace
          const workspaceStats = workspaceService.getStats();
          console.log("Workspace initialized:", workspaceStats);
          
          // Enable learning system by default
          learningService.enable();
        } else {
          toast.error("Failed to connect to Ollama", {
            description: "Make sure Ollama is running locally"
          });
        }
      } catch (error) {
        console.error("Failed to connect to Ollama:", error);
        setIsOllamaConnected(false);
        
        toast.error("Failed to connect to Ollama", {
          description: "Please ensure Ollama is running locally"
        });
      }
    };
    
    connectToOllama();
    
    // Set up system heartbeat
    const intervalId = setInterval(() => {
      ollamaService.checkConnection().then(connected => {
        setIsOllamaConnected(connected);
      });
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Autonomous mode functionality
  useEffect(() => {
    if (!autoMode) return;
    
    const autoInterval = setInterval(() => {
      setAutoModeCounter(prev => prev + 1);
      
      // Every 5 cycles, perform an autonomous action
      if (autoModeCounter % 5 === 0) {
        const actions = [
          () => runAutonomousCommand("Analyzing system performance..."),
          () => setIsSelfModifying(true),
          () => toast.info("QUX-95 Auto-optimization", {
            description: "Adjusting parameters for optimal performance"
          }),
          () => runAutonomousCommand("Scanning for potential improvements..."),
          () => learningService.isEnabled() && learningService.learn(),
          () => workspaceService.log("Autonomous system check", "system_auto.log")
        ];
        
        // Select a random action
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        randomAction();
      }
    }, 10000);
    
    return () => clearInterval(autoInterval);
  }, [autoMode, autoModeCounter]);

  const runAutonomousCommand = async (message: string) => {
    toast.info("QUX-95 Autonomous Action", {
      description: message
    });
    
    // Add to model's context
    ollamaService.storeInMemory('autonomous', Date.now().toString(), {
      action: 'command',
      message
    });
    
    // Log to workspace
    workspaceService.log(`Autonomous action: ${message}`, 'autonomous.log');
    
    return message;
  };

  const handleTerminalCommand = async (command: string) => {
    console.log('Terminal command:', command);
    
    // Process command
    const parts = command.toLowerCase().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    switch (cmd) {
      case 'status':
        return await checkHardwareCapabilities();

      case 'connect':
        if (args[0] === 'ollama') {
          try {
            const connected = await ollamaService.init();
            setIsOllamaConnected(connected);
            
            if (connected) {
              return 'Successfully connected to Ollama.';
            } else {
              return 'Failed to connect to Ollama. Is it running?';
            }
          } catch (error) {
            return `Error connecting to Ollama: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
        return `Usage: connect ollama`;

      case 'auto':
        if (args[0] === 'on' || args[0] === 'enable') {
          setAutoMode(true);
          return 'Autonomous mode enabled.';
        } else if (args[0] === 'off' || args[0] === 'disable') {
          setAutoMode(false);
          return 'Autonomous mode disabled.';
        }
        return `Autonomous mode is currently ${autoMode ? 'ENABLED' : 'DISABLED'}.
Usage: auto [on|off|enable|disable]`;

      case 'models':
        const models = ollamaService.getModels();
        if (models.length === 0) {
          return 'No models available. Make sure Ollama is connected.';
        }
        return `Available models:\n${models.map(m => `- ${m.name} (${m.parameters})`).join('\n')}`;

      case 'model':
        if (args.length === 0) {
          return `Current model: ${currentModel?.name || 'None'}`;
        }
        
        const modelName = args.join(' ');
        const models2 = ollamaService.getModels();
        const model = models2.find(m => m.name.toLowerCase() === modelName.toLowerCase());
        
        if (model) {
          setCurrentModel(model);
          ollamaService.setCurrentModel(model.id);
          return `Model set to ${model.name}`;
        } else {
          return `Model "${modelName}" not found. Use 'models' to see available models.`;
        }

      case 'modify':
      case 'self-modify':
        setIsSelfModifying(true);
        return 'Initiating self-modification sequence...';
        
      case 'ollama':
        // Forward the command to Ollama service
        try {
          const result = await ollamaService.executeCommand(args.join(' '));
          return result;
        } catch (error) {
          return `Ollama error: ${error instanceof Error ? error.message : String(error)}`;
        }

      case 'exec':
        if (args.length === 0) {
          return 'Usage: exec <command>';
        }
        
        try {
          return await executeSystemCommand(args.join(' '));
        } catch (error) {
          return `Execution error: ${error instanceof Error ? error.message : String(error)}`;
        }

      case 'save':
        try {
          const saved = await ollamaService.saveState();
          if (saved) {
            return 'System state saved successfully.';
          } else {
            return 'Failed to save system state.';
          }
        } catch (error) {
          return `Error saving system state: ${error instanceof Error ? error.message : String(error)}`;
        }
      
      case 'workspace':
        return await executeSystemCommand(`workspace ${args.join(' ')}`);
        
      case 'github':
        return await executeSystemCommand(`github ${args.join(' ')}`);
        
      case 'learn':
        return await executeSystemCommand(`learn ${args.join(' ')}`);
        
      case 'theme':
        if (args.length === 0) {
          return `Current theme: ${theme}
Dark mode: ${isDarkMode ? 'ENABLED' : 'DISABLED'}`;
        }
        
        const newTheme = args[0];
        if (['cyberpunk', 'terminal', 'hacker', 'dark'].includes(newTheme)) {
          setTheme(newTheme as ThemeType);
          return `Theme set to ${newTheme}`;
        } else {
          return `Invalid theme: ${newTheme}
Available themes: cyberpunk, terminal, hacker, dark`;
        }
        
      case 'dark':
        if (args[0] === 'on' || args[0] === 'enable') {
          toggleDarkMode();
          return 'Dark mode enabled.';
        } else if (args[0] === 'off' || args[0] === 'disable') {
          if (isDarkMode) toggleDarkMode();
          return 'Dark mode disabled.';
        } else if (args[0] === 'toggle') {
          toggleDarkMode();
          return `Dark mode ${isDarkMode ? 'disabled' : 'enabled'}.`;
        }
        return `Dark mode is currently ${isDarkMode ? 'ENABLED' : 'DISABLED'}.
Usage: dark [on|off|enable|disable|toggle]`;

      case 'help':
        return `
Available commands:
  status               - Show system status
  connect ollama       - Connect to Ollama
  auto [on|off]        - Toggle autonomous mode
  models               - List available models
  model [name]         - Get or set current model
  modify               - Start self-modification
  self-modify          - Same as 'modify'
  exec <command>       - Execute a system command
  ollama <command>     - Send command to Ollama
  save                 - Save current system state
  workspace <command>  - Manage AI workspace files
  github <command>     - GitHub integration commands
  learn <command>      - Learning system commands
  theme [name]         - Get or set UI theme
  dark [on|off|toggle] - Control dark mode
  help                 - Show this help message
  clear                - Clear terminal
`;

      default:
        // Try to execute unknown commands via Ollama
        try {
          return await ollamaService.executeCommand(command);
        } catch {
          return `Unknown command: ${command}
Type 'help' for available commands.`;
        }
    }
  };

  const handleSelfModificationComplete = () => {
    setIsSelfModifying(false);
    toast.success("Self-modification complete", {
      description: "System performance enhanced by 17.3%"
    });
    
    // Record the self-modification in the model's context
    ollamaService.storeInMemory('self-modification', Date.now().toString(), {
      timestamp: new Date().toISOString(),
      result: "System performance enhanced by 17.3%"
    });
    
    // Save state after self-modification
    ollamaService.saveState();
    
    // Log to workspace
    workspaceService.log("Self-modification completed successfully", "modifications.log");
    
    // Record as learning example
    if (learningService.isEnabled()) {
      learningService.recordExample(
        "self-modification request",
        "System performance enhanced by 17.3%", 
        ["modification", "performance"]
      );
    }
  };

  const handleModelSelect = (model: OllamaModel) => {
    setCurrentModel(model);
    ollamaService.setCurrentModel(model.id);
    
    toast.success(`Model ${model.name} selected`, {
      description: `${model.parameters} parameters loaded successfully`
    });
    
    // Log to workspace
    workspaceService.log(`Model changed to ${model.name}`, "models.log");
  };

  const handleSystemToggle = () => {
    const newStatus = systemStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    setSystemStatus(newStatus);
    
    if (newStatus === 'ONLINE') {
      toast.success("System activated", {
        description: "All subsystems online and operational"
      });
      
      // Log to workspace
      workspaceService.log("System activated", "system.log");
    } else {
      setAutoMode(false);
      toast.error("System deactivated", {
        description: "Core functions are now offline"
      });
      
      // Log to workspace
      workspaceService.log("System deactivated", "system.log");
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col bg-cyberpunk-dark text-cyberpunk-neon-green font-terminal",
      theme === 'terminal' ? 'theme-terminal' : theme === 'hacker' ? 'theme-hacker' : 'theme-cyberpunk'
    )}>
      {/* Scanlines effect */}
      <div className="scanline"></div>
      <div className="scanline-2"></div>
      <div className="crt"></div>
      
      {/* Header */}
      <header className="p-2 border-b border-cyberpunk-neon-green bg-cyberpunk-dark-blue shadow-[0_0_10px_rgba(0,255,65,0.2)]">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl font-pixel text-cyberpunk-neon-green neon-glow mr-2">QUX-95</div>
            <div className="text-sm opacity-70">GENESIS CORE v1.2.0</div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={isDarkMode ? "default" : "outline"}
              className={cn(
                "text-xs",
                isDarkMode ? 
                  "bg-cyberpunk-neon-blue text-cyberpunk-dark border-cyberpunk-neon-blue" :
                  "border-cyberpunk-neon-blue text-cyberpunk-neon-blue"
              )}
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Moon className="h-3 w-3 mr-1" /> : <Sun className="h-3 w-3 mr-1" />}
              {isDarkMode ? 'DARK MODE' : 'LIGHT MODE'}
            </Button>
            
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
              variant={autoMode ? "default" : "outline"}
              className={cn(
                "text-xs",
                autoMode ? 
                  "bg-cyberpunk-neon-purple text-cyberpunk-dark border-cyberpunk-neon-purple" :
                  "border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
              )}
              disabled={systemStatus === 'OFFLINE'}
              onClick={() => setAutoMode(!autoMode)}
            >
              <Database className="h-3 w-3 mr-1" />
              {autoMode ? 'AUTO: ON' : 'AUTO: OFF'}
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
              onClick={async () => {
                const connected = await ollamaService.checkConnection();
                setIsOllamaConnected(connected);
                
                if (connected) {
                  toast.success("Ollama connection verified", {
                    description: "Connection is active and working properly"
                  });
                } else {
                  toast.error("Ollama connection failed", {
                    description: "Unable to connect to Ollama service"
                  });
                }
              }}
            >
              <Database className="h-3 w-3 mr-1" />
              {isOllamaConnected ? 'OLLAMA CONNECTED' : 'OLLAMA DISCONNECTED'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="border-cyberpunk-neon-blue text-cyberpunk-neon-blue text-xs"
              onClick={async () => {
                const saved = await ollamaService.saveState();
                if (saved) {
                  toast.success("System state saved", {
                    description: "All settings and memory saved successfully"
                  });
                  
                  // Log to workspace
                  workspaceService.log("System state saved", "system.log");
                } else {
                  toast.error("Save failed", {
                    description: "Could not save system state"
                  });
                }
              }}
              disabled={!isOllamaConnected || systemStatus === 'OFFLINE'}
            >
              SAVE
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto grid grid-cols-4 gap-4 p-4 overflow-hidden">
        {/* Left Panel */}
        <div className="col-span-1 space-y-4">
          <div className="grid grid-cols-10 gap-2">
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
                "border border-cyberpunk-neon-blue hover:bg-cyberpunk-dark",
                activeTab === 'workspace' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('workspace')}
            >
              <Folder className="h-5 w-5 mb-1" />
              <span className="text-xs">FILES</span>
            </Button>
            
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16",
                "border border-cyberpunk-neon-blue hover:bg-cyberpunk-dark",
                activeTab === 'github' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('github')}
            >
              <Github className="h-5 w-5 mb-1" />
              <span className="text-xs">GIT</span>
            </Button>
            
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16",
                "border border-cyberpunk-neon-pink hover:bg-cyberpunk-dark",
                activeTab === 'learning' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('learning')}
            >
              <Brain className="h-5 w-5 mb-1" />
              <span className="text-xs">LEARN</span>
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
                ref={terminalRef}
                className="h-[calc(100vh-10rem)]" 
                initialMessages={[
                  "QUX-95 GENESIS CORE v1.2.0",
                  "Copyright (c) 2025 Qux Systems",
                  "Type 'help' for available commands.",
                  isOllamaConnected ? "Ollama connection established." : "Connecting to Ollama...",
                  "AI Workspace initialized."
                ]}
                onCommand={handleTerminalCommand}
                autoMode={autoMode}
                onSelfModify={() => setIsSelfModifying(true)}
              />
            )}
            
            {activeTab === 'chat' && (
              <ChatWindow 
                className="h-[calc(100vh-10rem)]" 
                modelName={currentModel?.name || "QUX-95"} 
                autoMode={autoMode}
              />
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
            
            {activeTab === 'workspace' && (
              <WorkspaceBrowser className="h-[calc(100vh-10rem)]" />
            )}
            
            {activeTab === 'github' && (
              <GitHubManager className="h-[calc(100vh-10rem)]" />
            )}
            
            {activeTab === 'learning' && (
              <LearningSystem className="h-[calc(100vh-10rem)]" />
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

// Correcting the DashboardWithTheme component
const DashboardWithTheme = () => {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
};

export default DashboardWithTheme;
