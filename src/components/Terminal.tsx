
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TerminalProps {
  className?: string;
  prompt?: string;
  initialMessages?: string[];
  onCommand?: (command: string) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Add command to history
    const newHistory = [...history, `${prompt} ${inputValue}`];
    setHistory(newHistory);
    
    // Add to command history for up/down navigation
    setCommandHistory([inputValue, ...commandHistory].slice(0, 50));
    setHistoryIndex(-1);
    
    // Call onCommand callback
    if (onCommand) {
      onCommand(inputValue);
    }
    
    // Clear input
    setInputValue("");
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

    // Tab completion (simplified)
    if (e.key === "Tab") {
      e.preventDefault();
      // Simple tab completion - this would normally check available commands
      const possibleCommands = ["help", "status", "connect", "model", "chat", "settings", "clear", "exit"];
      const match = possibleCommands.find(cmd => cmd.startsWith(inputValue.toLowerCase()));
      if (match) {
        setInputValue(match);
      }
    }
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
          <div key={index} className="terminal-text-output mb-1">
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
          />
        </form>
      </div>
    </div>
  );
};

export default Terminal;
