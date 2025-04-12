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
import MemoryStats from './MemoryStats';
import DraggableWindow from './DraggableWindow';
import { SystemStatusDashboard } from './LazyComponents';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  Sun,
  BarChart,
  Wand,
  Globe,
  Gauge,
  ChevronDown,
  X
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
import { autonomousService } from '@/services/autonomousService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { LeftDrawer, LeftDrawerContent, LeftDrawerHeader, LeftDrawerTitle, LeftDrawerClose } from '@/components/ui/left-drawer';

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
  const [showAdvancedFeaturesWindow, setShowAdvancedFeaturesWindow] = useState(false);
  const [showSystemStatusWindow, setShowSystemStatusWindow] = useState(false);

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

          // Initialize autonomous service (monitor mode)
          // It will start in monitoring-only mode but won't activate scanning yet
          if (!autonomousService.isServiceActive()) {
            autonomousService.setAutonomyLevel(1);
          }
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

      // Show system status window when going online
      setShowSystemStatusWindow(true);

      // Log to workspace
      workspaceService.log("System activated", "system.log");
    } else {
      setAutoMode(false);
      toast.error("System deactivated", {
        description: "Core functions are now offline"
      });

      // Close system status window when going offline
      setShowSystemStatusWindow(false);

      // Log to workspace
      workspaceService.log("System deactivated", "system.log");
    }
  };

  // Add a method to handle starting self-coding
  const handleStartSelfCoding = () => {
    if (autonomousService.isServiceActive()) {
      autonomousService.stop();
      toast.info("Autonomous self-coding stopped", {
        description: "QUX-95 is no longer monitoring the codebase for issues"
      });
    } else {
      const success = autonomousService.start(1); // Start in monitor-only mode
      if (success) {
        toast.success("Autonomous self-coding activated", {
          description: "QUX-95 is now monitoring the codebase for issues"
        });

        // Suggest opening self-modification panel to configure
        setTimeout(() => {
          toast.info("Tip: Open self-modification panel to configure autonomy settings", {
            duration: 5000
          });
        }, 3000);
      }
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
      <header className="sticky top-0 z-10 bg-cyberpunk-dark border-b border-cyberpunk-neon-blue p-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-cyberpunk-neon-green" />
            <span className="text-cyberpunk-neon-green font-pixel text-sm md:text-lg">QUX-95</span>
            <Button
              size="sm"
              variant={systemStatus === 'OFFLINE' ? "destructive" : "outline"}
              className={cn(
                systemStatus === 'ONLINE' ? "border-cyberpunk-neon-green text-cyberpunk-neon-green" : "",
                showSystemStatusWindow && systemStatus === 'ONLINE' ? "ring-1 ring-cyberpunk-neon-green" : "",
                "text-xs shadow-[0_0_5px_rgba(0,255,65,0.3)] relative"
              )}
              onClick={handleSystemToggle}
              onContextMenu={(e) => {
                e.preventDefault();
                if (systemStatus === 'ONLINE') {
                  setShowSystemStatusWindow(!showSystemStatusWindow);
                }
              }}
              title="Left-click to toggle system status, right-click to view system details"
            >
              <Power className="h-3 w-3 mr-1" />
              {systemStatus}
              {showSystemStatusWindow && systemStatus === 'ONLINE' && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-cyberpunk-neon-green rounded-full"></span>
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              className="border-cyberpunk-neon-blue text-cyberpunk-neon-blue text-xs shadow-[0_0_5px_rgba(0,157,255,0.3)]"
              onClick={() => setActiveTab('chat')}
              disabled={systemStatus === 'OFFLINE'}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              CHAT
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-cyberpunk-neon-pink text-cyberpunk-neon-pink text-xs shadow-[0_0_5px_rgba(255,0,157,0.3)]"
              onClick={() => setActiveTab('rag')}
              disabled={systemStatus === 'OFFLINE'}
            >
              <FileText className="h-3 w-3 mr-1" />
              KNOWLEDGE
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-cyberpunk-neon-pink text-cyberpunk-neon-pink text-xs shadow-[0_0_5px_rgba(255,0,157,0.3)]"
              onClick={() => {
                setShowAdvancedFeaturesWindow(true);
              }}
              disabled={systemStatus === 'OFFLINE'}
            >
              <Brain className="h-3 w-3 mr-1" />
              ADVANCED
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple text-xs shadow-[0_0_5px_rgba(157,0,255,0.3)]"
                  disabled={systemStatus === 'OFFLINE'}
                >
                  <SettingsIcon className="h-3 w-3 mr-1" />
                  SETTINGS
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-cyberpunk-dark border-cyberpunk-neon-purple">
                <DropdownMenuItem
                  className="text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
                  onClick={() => setActiveTab('settings')}
                >
                  <SettingsIcon className="h-3 w-3 mr-2" />
                  Configuration
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
                  onClick={() => setIsSelfModifying(!isSelfModifying)}
                >
                  <RefreshCcw className="h-3 w-3 mr-2" />
                  {isSelfModifying ? 'Close Self-Modification' : 'Open Self-Modification'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
                  onClick={handleStartSelfCoding}
                >
                  <Code className="h-3 w-3 mr-2" />
                  {autonomousService.isServiceActive() ? 'Self-Coding: ON' : 'Self-Coding: OFF'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
                  onClick={() => setAutoMode(!autoMode)}
                >
                  <Database className="h-3 w-3 mr-2" />
                  {autoMode ? 'Auto Mode: ON' : 'Auto Mode: OFF'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16 w-full",
                "border border-cyberpunk-neon-green hover:bg-cyberpunk-neon-green hover:text-white",
                activeTab === 'terminal' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('terminal')}
            >
              <TerminalSquare className="h-5 w-5 mb-1" />
              <span className="text-xs">TERMINAL</span>
            </Button>

            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16 w-full",
                "border border-cyberpunk-neon-green hover:bg-cyberpunk-neon-green hover:text-white",
                activeTab === 'code' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('code')}
            >
              <Code className="h-5 w-5 mb-1" />
              <span className="text-xs">CODE GENERATION</span>
            </Button>

            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16 w-full",
                "border border-cyberpunk-neon-green hover:bg-cyberpunk-neon-green hover:text-white",
                activeTab === 'image-gen' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('image-gen')}
            >
              <Image className="h-5 w-5 mb-1" />
              <span className="text-xs">IMAGE GENERATION</span>
            </Button>

            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16 w-full",
                "border border-cyberpunk-neon-green hover:bg-cyberpunk-neon-green hover:text-white",
                activeTab === 'workspace' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('workspace')}
            >
              <Folder className="h-5 w-5 mb-1" />
              <span className="text-xs">WS FILE DIRECTORY</span>
            </Button>

            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16 w-full",
                "border border-cyberpunk-neon-green hover:bg-cyberpunk-neon-green hover:text-white",
                activeTab === 'github' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('github')}
            >
              <Github className="h-5 w-5 mb-1" />
              <span className="text-xs">GITHUB MANAGER</span>
            </Button>

            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-16 w-full",
                "border border-cyberpunk-neon-green hover:bg-cyberpunk-neon-green hover:text-white",
                activeTab === 'learning' && "bg-cyberpunk-dark-blue"
              )}
              onClick={() => setActiveTab('learning')}
            >
              <Brain className="h-5 w-5 mb-1" />
              <span className="text-xs">SELF-LEARNING SYSTEM</span>
            </Button>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full border border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-neon-green hover:text-white"
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                <span className="text-xs">MODELS</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ModelSelector
                className="h-[calc(100vh-14rem)]"
                onModelSelect={handleModelSelect}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Main Panel */}
        <div className="col-span-3 flex flex-col">
          <div className="flex-1 overflow-hidden h-[calc(100vh-10rem)] max-h-[calc(100vh-10rem)]">
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
                className="h-full max-h-full"
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
      <div className="flex flex-col h-full">
        <div className="h-auto border-t border-cyberpunk-neon-purple bg-cyberpunk-dark" style={{ height: 'var(--status-bar-height, 40px)' }}>
          <div className="flex items-start">
            <StatusBar className="flex-1" />

            <div className="w-64 p-1">
              <MemoryStats compact={true} />
            </div>
          </div>
        </div>
      </div>

      {/* System Status Window */}
      {showSystemStatusWindow && (
        <DraggableWindow
          title="SYSTEM STATUS DASHBOARD"
          defaultPosition={{ x: Math.max(100, window.innerWidth - 700), y: 100 }}
          defaultWidth={650}
          defaultHeight={400}
          onClose={() => setShowSystemStatusWindow(false)}
          className="z-40"
        >
          <div className="h-full overflow-auto">
            <SystemStatusDashboard className="border-none" />
          </div>
        </DraggableWindow>
      )}

      {/* Self-Modification Slide-up Panel */}
      <LeftDrawer open={isSelfModifying} onOpenChange={(open) => {
        setIsSelfModifying(open);
        if (!open) handleSelfModificationComplete();
      }}>
        <LeftDrawerContent className="w-[800px] max-w-[90vw] border-cyberpunk-neon-green bg-cyberpunk-dark shadow-[0_0_15px_rgba(0,255,65,0.5)] border-r-2 border-t-2 rounded-tr-lg">
          <LeftDrawerHeader className="border-b border-cyberpunk-neon-green">
            <LeftDrawerTitle className="text-cyberpunk-neon-green font-terminal">SELF-MODIFICATION</LeftDrawerTitle>
            <LeftDrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary text-cyberpunk-neon-green">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </LeftDrawerClose>
          </LeftDrawerHeader>
          <div className="p-0 h-[500px] max-h-[calc(100vh-var(--status-bar-height,40px)-80px)] overflow-auto">
            <SelfModification
              active={true}
              className="h-full"
              onComplete={handleSelfModificationComplete}
            />
          </div>
        </LeftDrawerContent>
      </LeftDrawer>

      {/* Floating Self-Modification Button */}
      {!isSelfModifying && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="fixed left-4 bottom-[calc(var(--status-bar-height,40px)+8px)] z-40 bg-cyberpunk-dark border-2 border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue shadow-[0_0_15px_rgba(0,255,65,0.7)] animate-pulse"
                size="icon"
                onClick={() => setIsSelfModifying(true)}
              >
                <RefreshCcw className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-cyberpunk-dark border border-cyberpunk-neon-green text-cyberpunk-neon-green">
              <p>Open Self-Modification Panel</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Advanced Features Window */}
      {showAdvancedFeaturesWindow && (
        <DraggableWindow
          title="ADVANCED FEATURES"
          defaultPosition={{ x: window.innerWidth - 500, y: 100 }}
          defaultWidth={450}
          defaultHeight={500}
          onClose={() => setShowAdvancedFeaturesWindow(false)}
          className="z-40"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FeatureCard
                title="Computer Vision"
                description="Advanced image recognition and processing capabilities"
                icon={<Image className="h-10 w-10 text-cyberpunk-neon-pink" />}
                onClick={() => console.log("Computer Vision clicked")}
              />

              <FeatureCard
                title="NLP Analysis"
                description="Deep linguistic pattern recognition and semantic parsing"
                icon={<MessageSquare className="h-10 w-10 text-cyberpunk-neon-blue" />}
                onClick={() => console.log("NLP Analysis clicked")}
              />

              <FeatureCard
                title="Neural Networks"
                description="Custom neural network training and deployment"
                icon={<Brain className="h-10 w-10 text-cyberpunk-neon-purple" />}
                onClick={() => console.log("Neural Networks clicked")}
              />

              <FeatureCard
                title="Data Visualization"
                description="Advanced data visualization and pattern detection"
                icon={<BarChart className="h-10 w-10 text-cyberpunk-neon-green" />}
                onClick={() => console.log("Data Visualization clicked")}
              />

              <FeatureCard
                title="Quantum Algorithms"
                description="Quantum-inspired optimization algorithms"
                icon={<Wand className="h-10 w-10 text-cyberpunk-neon-purple" />}
                onClick={() => console.log("Quantum Algorithms clicked")}
              />

              <FeatureCard
                title="System Integration"
                description="Advanced integration with external systems and APIs"
                icon={<Globe className="h-10 w-10 text-cyberpunk-neon-blue" />}
                onClick={() => console.log("System Integration clicked")}
              />
            </div>

            <div className="pt-2 border-t border-cyberpunk-neon-purple">
              <div className="text-xs text-cyberpunk-neon-blue mb-2">
                System Performance Metrics
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Neural Efficiency</span>
                    <span>87.3%</span>
                  </div>
                  <Progress value={87.3} className="h-1" />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Quantum Utilization</span>
                    <span>63.8%</span>
                  </div>
                  <Progress value={63.8} className="h-1" />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Cognitive Index</span>
                    <span>92.1%</span>
                  </div>
                  <Progress value={92.1} className="h-1" />
                </div>
              </div>
            </div>
          </div>
        </DraggableWindow>
      )}
    </div>
  );
};

// Feature Card component for Advanced Features window
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, onClick }) => {
  return (
    <div
      className="p-3 border border-cyberpunk-neon-purple bg-cyberpunk-dark-blue rounded cursor-pointer hover:bg-cyberpunk-dark hover:border-cyberpunk-neon-pink transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="mr-3">
          {icon}
        </div>
        <div>
          <h3 className="text-cyberpunk-neon-pink text-sm font-bold">{title}</h3>
          <p className="text-xs text-cyberpunk-neon-blue mt-1">{description}</p>
        </div>
      </div>
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
