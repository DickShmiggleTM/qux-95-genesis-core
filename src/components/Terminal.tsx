import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ollamaService } from '@/services/ollamaService';

interface TerminalProps {
  className?: string;
  prompt?: string;
  initialMessages?: string[];
  onCommand?: (command: string) => void | string | Promise<string | void>;
  height?: string;
  autoMode?: boolean;
}

// Create a proper interface for the ref
export interface TerminalRefHandle {
  executeCommand: (cmd: string) => Promise<void>;
}

// Use forwardRef to explicitly type the ref
const Terminal = forwardRef<TerminalRefHandle, TerminalProps>(({
  className,
  prompt = "QUX-95>",
  initialMessages = [],
  onCommand,
  height = "h-64",
  autoMode = false
}, ref) => {
  

  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<string[]>([...initialMessages]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoModeInterval = useRef<NodeJS.Timeout | null>(null);

  

  useEffect(() => {
    // Scroll to bottom when history changes
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [history]);

  // Auto mode for autonomous execution
  useEffect(() => {
    if (autoMode) {
      // Set up autonomous command execution
      if (!autoModeInterval.current) {
        // Create a list of autonomous commands to randomly execute
        const autoCommands = [
          "status",
          "models",
          "auto on",
          "exec analyze system performance",
          "self-modify optimize memory usage",
          "connection"
        ];
        
        autoModeInterval.current = setInterval(() => {
          // Pick a random command
          const randomCommand = autoCommands[Math.floor(Math.random() * autoCommands.length)];
          executeCommand(randomCommand);
        }, 30000); // Every 30 seconds
      }
    } else {
      // Clean up interval when auto mode is disabled
      if (autoModeInterval.current) {
        clearInterval(autoModeInterval.current);
        autoModeInterval.current = null;
      }
    }
    
    return () => {
      if (autoModeInterval.current) {
        clearInterval(autoModeInterval.current);
      }
    };
  }, [autoMode]);

  

  const builtInCommands: Record<string, (args: string[]) => string | Promise<string>> = {
    help: () => {
      return `
Available commands:
  help                 - Show this help message
  clear                - Clear the terminal
  echo <text>          - Print text
  status               - Show system status
  model <name>         - Set current model
  models               - List available models
  exec <command>       - Execute system command
  self-modify          - Activate self-modification
  connection           - Check Ollama connection status
  memory <key>         - Show memory content
  context              - Show context window
  auto [on|off]        - Toggle autonomous mode
`;
    },
    clear: () => {
      setHistory([]);
      return "";
    },
    echo: (args) => {
      return args.join(" ");
    },
    status: async () => {
      const connected = await ollamaService.checkConnection();
      const currentModel = ollamaService.getCurrentModel();
      return `
System Status: ONLINE
Ollama Connection: ${connected ? 'CONNECTED' : 'DISCONNECTED'}
Current Model: ${currentModel || 'None'}
Session ID: ${ollamaService.getSessionId()}
Memory Status: ACTIVE
`;
    },
    model: async (args) => {
      if (args.length === 0) {
        const currentModel = ollamaService.getCurrentModel();
        return `Current model: ${currentModel || 'None'}`;
      }
      
      const modelName = args.join(' ');
      const models = ollamaService.getModels();
      const model = models.find(m => m.name.toLowerCase() === modelName.toLowerCase() || m.id.toLowerCase() === modelName.toLowerCase());
      
      if (model) {
        ollamaService.setCurrentModel(model.id);
        return `Model set to ${model.name} (${model.id})`;
      } else {
        return `Model "${modelName}" not found. Use 'models' to see available models.`;
      }
    },
    models: async () => {
      const models = ollamaService.getModels();
      
      if (models.length === 0) {
        return 'No models available. Make sure Ollama is connected.';
      }
      
      return `Available models:\n${models.map(m => `- ${m.name} (${m.id}): ${m.parameters}`).join('\n')}`;
    },
    exec: async (args) => {
      if (args.length === 0) {
        return 'Usage: exec <command>';
      }
      
      const command = args.join(' ');
      try {
        const result = await ollamaService.executeCommand(command);
        return result;
      } catch (error) {
        return `Error executing command: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    connection: async () => {
      const connected = await ollamaService.checkConnection();
      return connected 
        ? 'Successfully connected to Ollama.' 
        : 'Failed to connect to Ollama. Is it running?';
    },
    memory: (args) => {
      const key = args[0];
      if (!key) {
        return 'Usage: memory <category>';
      }
      
      const data = ollamaService.retrieveFromMemory(key);
      return `Memory contents for "${key}":\n${JSON.stringify(data, null, 2)}`;
    },
    context: () => {
      const context = ollamaService.getContext();
      return `Recent context window:\n${JSON.stringify(context.slice(-5), null, 2)}`;
    },
    "self-modify": async (args) => {
      if (args.length === 0) {
        return 'Usage: self-modify <description>';
      }
      
      const description = args.join(' ');
      const result = await ollamaService.selfModify(
        "// Simulated code modification",
        description
      );
      
      return result 
        ? `Self-modification successful: ${description}` 
        : 'Self-modification failed';
    },
    auto: (args) => {
      // This will be handled by the Dashboard component
      if (args[0] === 'on' || args[0] === 'enable') {
        return 'Autonomous mode enabled.';
      } else if (args[0] === 'off' || args[0] === 'disable') {
        return 'Autonomous mode disabled.';
      }
      return `Usage: auto [on|off|enable|disable]`;
    }
  };

  const addToHistory = (text: string) => {
    setHistory((prev) => [...prev, text]);
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;
    
    // Add command to history display
    addToHistory(`${prompt} ${command}`);
    
    // Parse command and arguments
    const parts = command.split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Check for built-in command
    if (builtInCommands[cmd]) {
      try {
        const result = await builtInCommands[cmd](args);
        if (result) {
          addToHistory(result);
        }
      } catch (error) {
        addToHistory(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }

    // External command handler
    if (onCommand) {
      setIsProcessing(true);
      try {
        const result = await onCommand(command);
        if (result) {
          addToHistory(result.toString());
        }
      } catch (error) {
        console.error("Command execution error:", error);
        addToHistory(`Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Default response if no handler
      addToHistory(`Command not recognized: ${command}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || !inputValue.trim()) return;
    
    // Add to command history for up/down navigation
    setCommandHistory([inputValue, ...commandHistory].slice(0, 50));
    setHistoryIndex(-1);
    
    const command = inputValue;
    setInputValue("");
    
    // Execute command
    await executeCommand(command);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Up arrow - navigate command history
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    }
    
    // Down arrow - navigate command history
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue("");
      }
    }

    // Tab completion
    if (e.key === "Tab") {
      e.preventDefault();
      const possibleCommands = [
        "help", "status", "connect", "model", "models", "chat", "settings", "clear", 
        "exit", "exec", "self-modify", "connection", "memory", "context", "auto", "echo"
      ];
      
      const matchingCommands = possibleCommands.filter(
        cmd => cmd.startsWith(inputValue.toLowerCase().split(" ")[0])
      );
      
      if (matchingCommands.length === 1) {
        // Single match - complete the command
        setInputValue(matchingCommands[0]);
      } else if (matchingCommands.length > 1) {
        // Multiple matches - show options
        addToHistory(`${prompt} ${inputValue}`);
        addToHistory(`Possible completions: ${matchingCommands.join(", ")}`);
      }
    }
  };
  
  // Properly expose the executeCommand method via useImperativeHandle
  useImperativeHandle(ref, () => ({
    executeCommand
  }));

  // Remove the window global reference that was causing the error
  // The following line was causing the error - it's been replaced with a proper ref implementation above
  // React.useImperativeHandle((window as any).terminalRef = {}, () => ({ executeCommand: (cmd: string) => executeCommand(cmd) }));

  return (
    <div 
      className={cn(
        "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-green rounded-none",
        "pixel-corners pixel-borders overflow-hidden",
        height,
        className
      )}
    >
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-green h-5 flex items-center px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">TERMINAL</div>
      </div>
      <div
        ref={terminalRef}
        className="p-4 pt-6 h-full overflow-y-auto text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, index) => (
          <div key={index} className="terminal-text-output mb-1 whitespace-pre-wrap">
            {line}
          </div>
        ))}
        <form onSubmit={handleSubmit} className="flex items-center">
          <span className="terminal-text-output mr-2">{prompt}</span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-cyberpunk-neon-green terminal-text-input"
            autoComplete="off"
            spellCheck="false"
            disabled={isProcessing}
          />
        </form>
        {isProcessing && (
          <div className="text-cyberpunk-neon-green animate-pulse">
            Processing...
          </div>
        )}
      </div>
    </div>
  );
});

// Add display name for React DevTools
Terminal.displayName = 'Terminal';

export default Terminal;
