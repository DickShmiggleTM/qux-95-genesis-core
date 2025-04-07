
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TerminalProps {
  className?: string;
  prompt?: string;
  initialMessages?: string[];
  onCommand?: (command: string) => void | string | Promise<string | void>;
  height?: string;
}

const Terminal: React.FC<TerminalProps> = ({
  className,
  prompt = "QUX-95>",
  initialMessages = [],
  onCommand,
  height = "h-64"
}) => {
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<string[]>([...initialMessages]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Built-in terminal commands
  const builtInCommands: Record<string, (args: string[]) => string> = {
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
`;
    },
    clear: () => {
      setHistory([]);
      return "";
    },
    echo: (args) => {
      return args.join(" ");
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
      const result = builtInCommands[cmd](args);
      if (result) {
        addToHistory(result);
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
        "help", "status", "connect", "model", "chat", "settings", "clear", 
        "exit", "exec", "self-modify", "connection", "models", "echo"
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
  
  // Run system commands automatically
  const runSystemCommand = async (command: string) => {
    addToHistory(`SYSTEM: ${command}`);
    await executeCommand(command);
  };

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
};

export default Terminal;
