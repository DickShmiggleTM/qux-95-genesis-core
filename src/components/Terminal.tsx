
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { useTerminalCommands } from '@/hooks/useTerminalCommands';
import { workspaceService } from '@/services/workspaceService';
import { useTheme } from '@/contexts/ThemeContext';

interface TerminalProps {
  className?: string;
  prompt?: string;
  initialMessages?: string[];
  onCommand?: (command: string) => void | string | Promise<string | void>;
  height?: string;
  autoMode?: boolean;
  onSelfModify?: () => void;
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
  autoMode = false,
  onSelfModify
}, ref) => {
  const { theme, animationsEnabled } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<string[]>([...initialMessages]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoModeInterval = useRef<NodeJS.Timeout | null>(null);

  // Use the terminal commands hook
  const { isProcessing, executeCommand } = useTerminalCommands({
    externalCommandHandler: onCommand,
    autoMode,
    onSelfModify
  });

  useEffect(() => {
    // Scroll to bottom when history changes with animation
    if (terminalRef.current) {
      const scrollElement = terminalRef.current;
      if (animationsEnabled) {
        // Smooth scroll with animation
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // Instant scroll without animation
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
    
    // Focus input when component mounts
    if (inputRef.current && !isProcessing) {
      inputRef.current.focus();
    }
  }, [history, isProcessing, animationsEnabled]);

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
          "connection",
          "workspace stats",
          "learn status"
        ];
        
        autoModeInterval.current = setInterval(() => {
          // Pick a random command
          const randomCommand = autoCommands[Math.floor(Math.random() * autoCommands.length)];
          handleExecuteCommand(randomCommand);
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

  const addToHistory = (text: string) => {
    // Animate the appearance of new messages
    if (animationsEnabled) {
      // Create typing effect for system responses
      if (!text.startsWith(prompt) && text.length > 20) {
        setIsTyping(true);
        
        // Add the message immediately but with a typing class
        setHistory(prev => [...prev, `${text}_typing`]);
        
        // After a delay based on text length, replace with the full text
        const typingDelay = Math.min(100 + text.length * 10, 2000);
        setTimeout(() => {
          setHistory(prev => {
            const newHistory = [...prev];
            const lastIndex = newHistory.length - 1;
            if (newHistory[lastIndex].endsWith('_typing')) {
              newHistory[lastIndex] = text;
            }
            setIsTyping(false);
            return newHistory;
          });
        }, typingDelay);
      } else {
        setHistory(prev => [...prev, text]);
      }
    } else {
      setHistory(prev => [...prev, text]);
    }
  };

  const handleExecuteCommand = async (command: string) => {
    if (!command.trim()) return;
    
    // Add command to history display
    addToHistory(`${prompt} ${command}`);
    
    // Visual effect for command execution
    if (animationsEnabled) {
      const commandElement = terminalRef.current?.lastElementChild;
      if (commandElement) {
        commandElement.classList.add('neon-glow');
        setTimeout(() => {
          commandElement.classList.remove('neon-glow');
        }, 500);
      }
    }
    
    // Log command to workspace
    workspaceService.log(`Terminal command: ${command}`, 'terminal.log');
    
    // Execute the command and get result
    const result = await executeCommand(command);
    
    // Special case for clear command
    if (result === "CLEAR_TERMINAL") {
      setHistory([]);
      return;
    }
    
    // Add result to history if it exists
    if (result) {
      addToHistory(result.toString());
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
    await handleExecuteCommand(command);
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
        "exit", "exec", "self-modify", "connection", "memory", "context", "auto", "echo",
        "hardware", "reasoning", "save", "workspace", "github", "learn"
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
    executeCommand: handleExecuteCommand
  }));

  // Get theme-specific styling
  const getThemeStyles = () => {
    switch (theme) {
      case "terminal":
        return {
          border: "border-[#33ff33]",
          titleBg: "bg-[#33ff33]",
          textColor: "text-[#33ff33]"
        };
      case "hacker":
        return {
          border: "border-[#0f0]",
          titleBg: "bg-[#0f0]",
          textColor: "text-[#0f0]"
        };
      default:
        return {
          border: "border-cyberpunk-neon-green",
          titleBg: "bg-cyberpunk-neon-green",
          textColor: "text-cyberpunk-neon-green"
        };
    }
  };
  
  const themeStyles = getThemeStyles();

  return (
    <div 
      className={cn(
        "relative font-terminal bg-cyberpunk-dark rounded-none",
        "pixel-corners pixel-borders overflow-hidden",
        themeStyles.border,
        animationsEnabled ? "transition-all duration-300" : "",
        height,
        className
      )}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-5 flex items-center px-2", themeStyles.titleBg)}>
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">TERMINAL</div>
      </div>
      <div
        ref={terminalRef}
        className="p-4 pt-6 h-full overflow-y-auto text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, index) => {
          const isTyping = line.endsWith('_typing');
          const actualLine = isTyping ? line.replace('_typing', '') : line;
          
          return (
            <div 
              key={index} 
              className={cn(
                "terminal-text-output mb-1 whitespace-pre-wrap",
                animationsEnabled && index === history.length - 1 ? "animate-fade-in" : "",
                isTyping ? "typing-cursor" : ""
              )}
            >
              {actualLine}
            </div>
          );
        })}
        <form onSubmit={handleSubmit} className="flex items-center">
          <span className={cn("terminal-text-output mr-2", themeStyles.textColor)}>{prompt}</span>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 bg-transparent border-none outline-none terminal-text-input",
              themeStyles.textColor
            )}
            autoComplete="off"
            spellCheck="false"
            disabled={isProcessing || isTyping}
          />
        </form>
        {isProcessing && (
          <div className={cn(
            "animate-pulse",
            themeStyles.textColor
          )}>
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
