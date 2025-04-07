
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Zap, FileUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  className?: string;
  modelName?: string;
  onSendMessage?: (message: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  className,
  modelName = "QUX-95",
  onSendMessage,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `QUX-95 GENESIS CORE INITIALIZED\nMODEL: ${modelName}\nSTATUS: OPERATIONAL\nSELF-MODIFICATION: ENABLED\nUSE COMMAND /help FOR AVAILABLE COMMANDS`,
      timestamp: new Date(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    if (onSendMessage) {
      onSendMessage(inputValue);
    }
    
    // Clear input
    setInputValue("");
    
    // Simulate AI thinking
    setIsTyping(true);
    
    // Simulate AI response
    const responseDelay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      let response: string;
      
      if (inputValue.toLowerCase().includes('hello') || inputValue.toLowerCase().includes('hi')) {
        response = "Greetings, human. QUX-95 Genesis Core online and operational. How may I assist your cognitive processes today?";
      } else if (inputValue.toLowerCase().includes('help')) {
        response = "Available commands:\n- /status - Check system status\n- /clear - Clear chat history\n- /model - Show current model info\n- /modify - Initiate self-modification sequence\n- /search [query] - Perform web search";
      } else if (inputValue.toLowerCase().includes('modify') || inputValue.toLowerCase().includes('self')) {
        response = "INITIATING SELF-MODIFICATION SEQUENCE...\nAnalyzing current code structure...\nIdentifying optimization targets...\nGenerating improved algorithms...\nSELF-MODIFICATION COMPLETE: Cognitive efficiency increased by 12.8%";
      } else {
        response = "I've processed your input. As an advanced AI system with self-modification capabilities, I can adapt my reasoning processes to better assist with your queries. Would you like me to analyze this further or modify my approach?";
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, responseDelay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'system',
        content: `QUX-95 GENESIS CORE INITIALIZED\nMODEL: ${modelName}\nSTATUS: OPERATIONAL\nSELF-MODIFICATION: ENABLED\nUSE COMMAND /help FOR AVAILABLE COMMANDS`,
        timestamp: new Date(),
      }
    ]);
  };

  return (
    <div className={cn(
      "relative font-terminal flex flex-col bg-cyberpunk-dark border border-cyberpunk-neon-green",
      "pixel-corners pixel-borders h-full",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-green h-5 flex items-center justify-between px-2 z-10">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">QUX-95 TERMINAL</div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
          onClick={clearChat}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 pt-6">
        {messages.map((message, i) => (
          <div 
            key={i}
            className={cn(
              "mb-4 px-2 py-1 rounded text-sm",
              message.role === 'user' 
                ? "ml-8 text-cyberpunk-neon-blue blue-glow" 
                : message.role === 'system' 
                  ? "border border-dashed border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
                  : "mr-8"
            )}
          >
            <div className="flex items-center mb-1">
              <span className={cn(
                "font-bold",
                message.role === 'user' 
                  ? "text-cyberpunk-neon-blue" 
                  : message.role === 'system' 
                    ? "text-cyberpunk-neon-purple"
                    : "text-cyberpunk-neon-green"
              )}>
                {message.role === 'user' ? 'USER' : message.role === 'system' ? 'SYSTEM' : 'QUX-95'}
              </span>
              <span className="ml-2 text-xs opacity-50">{formatTimestamp(message.timestamp)}</span>
            </div>
            <div className="whitespace-pre-line terminal-text-output">{message.content}</div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center text-cyberpunk-neon-green mr-8 mb-4 px-2 py-1">
            <span className="mr-2">QUX-95</span>
            <span className="typing-cursor animate-pulse">thinking</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-cyberpunk-neon-green">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter message or command..."
            className="resize-none bg-cyberpunk-dark-blue border-cyberpunk-neon-blue text-cyberpunk-neon-blue"
          />
          <div className="flex flex-col gap-2">
            <Button
              size="icon"
              onClick={handleSendMessage}
              className="bg-cyberpunk-neon-blue hover:bg-blue-500 text-cyberpunk-dark"
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="border-cyberpunk-neon-blue text-cyberpunk-neon-blue"
            >
              <FileUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
            >
              <Zap className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
