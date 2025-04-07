import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, Zap, FileUp, Trash2, Settings as SettingsIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ollamaService } from '@/services/ollamaService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

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
  const [autoRespond, setAutoRespond] = useState(false);
  const [autoRespondDelay, setAutoRespondDelay] = useState(5);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoRespondTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-respond feature
  useEffect(() => {
    if (autoRespond && messages.length > 1 && messages[messages.length - 1].role === 'user') {
      if (autoRespondTimeoutRef.current) {
        clearTimeout(autoRespondTimeoutRef.current);
      }
      
      autoRespondTimeoutRef.current = setTimeout(() => {
        handleGenerateResponse();
      }, autoRespondDelay * 1000);
    }
    
    return () => {
      if (autoRespondTimeoutRef.current) {
        clearTimeout(autoRespondTimeoutRef.current);
      }
    };
  }, [messages, autoRespond, autoRespondDelay]);

  const handleGenerateResponse = async () => {
    // Don't generate if already typing
    if (isTyping) return;
    
    // Get last few messages for context
    const recentMessages = messages
      .filter(msg => msg.role !== 'system') // Exclude system messages
      .slice(-10) // Take last 10 messages
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    
    if (recentMessages.length === 0) return;
    
    setIsTyping(true);
    
    try {
      // Use Ollama service for actual response
      const availableModels = ollamaService.getModels();
      
      // If we have models from Ollama, use the currently selected one
      // otherwise fall back to simulated responses
      if (availableModels.length > 0 && ollamaService.isConnected()) {
        const currentModel = ollamaService.getCurrentModel() || availableModels[0].id;
        
        const response = await ollamaService.generateChatCompletion(
          [
            {
              role: "system", 
              content: "You are QUX-95, an autonomous AI assistant with self-modification capabilities. You're running in a cyberpunk-themed terminal interface."
            },
            ...recentMessages.map(msg => ({
              role: msg.role, 
              content: msg.content
            }))
          ],
          currentModel,
          {
            temperature,
            max_tokens: maxTokens
          }
        );
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Fallback to simulated responses if Ollama is not available
        simulateResponse(recentMessages[recentMessages.length - 1].content);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("Failed to generate response", {
        description: "There was an issue connecting to the language model"
      });
      
      // Add error message
      const errorMessage: Message = {
        role: 'system',
        content: `Error generating response: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const simulateResponse = (userInput: string) => {
    // Simulate thinking time
    const responseDelay = 1000 + Math.random() * 2000;
    
    setTimeout(() => {
      let response: string;
      
      if (userInput.toLowerCase().includes('hello') || userInput.toLowerCase().includes('hi')) {
        response = "Greetings, human. QUX-95 Genesis Core online and operational. How may I assist your cognitive processes today?";
      } else if (userInput.toLowerCase().includes('help')) {
        response = "Available commands:\n- /status - Check system status\n- /clear - Clear chat history\n- /model - Show current model info\n- /modify - Initiate self-modification sequence\n- /search [query] - Perform web search";
      } else if (userInput.toLowerCase().includes('modify') || userInput.toLowerCase().includes('self')) {
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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Check for commands
    if (inputValue.startsWith('/')) {
      handleCommand(inputValue.slice(1).trim());
      setInputValue("");
      return;
    }

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
    
    // If not in auto-respond mode, generate response immediately
    if (!autoRespond) {
      handleGenerateResponse();
    }
  };

  const handleCommand = (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (cmd) {
      case 'clear':
        clearChat();
        break;
      case 'status':
        addSystemMessage(`MODEL: ${modelName}\nSTATUS: OPERATIONAL\nSELF-MODIFICATION: ENABLED\nAUTO-RESPOND: ${autoRespond ? 'ENABLED' : 'DISABLED'}\nTEMPERATURE: ${temperature}\nMAX TOKENS: ${maxTokens}`);
        break;
      case 'help':
        addSystemMessage("Available commands:\n- /status - Check system status\n- /clear - Clear chat history\n- /model - Show current model info\n- /modify - Initiate self-modification sequence\n- /auto [on|off] - Toggle auto-response mode\n- /temp [0-1] - Set temperature parameter");
        break;
      case 'auto':
        if (args[0] === 'on') {
          setAutoRespond(true);
          addSystemMessage("Auto-response mode enabled");
        } else if (args[0] === 'off') {
          setAutoRespond(false);
          addSystemMessage("Auto-response mode disabled");
        } else {
          setAutoRespond(!autoRespond);
          addSystemMessage(`Auto-response mode ${!autoRespond ? 'enabled' : 'disabled'}`);
        }
        break;
      case 'temp':
        if (args[0] && !isNaN(parseFloat(args[0]))) {
          const newTemp = Math.max(0, Math.min(1, parseFloat(args[0])));
          setTemperature(newTemp);
          addSystemMessage(`Temperature set to ${newTemp}`);
        } else {
          addSystemMessage(`Current temperature: ${temperature}`);
        }
        break;
      default:
        addSystemMessage(`Unknown command: ${cmd}`);
    }
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      role: 'system',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, systemMessage]);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target?.result) return;
      
      try {
        // Try to read as text
        const content = event.target.result as string;
        // Truncate if too large
        const truncatedContent = content.length > 1000 
          ? content.substring(0, 1000) + "... [content truncated]" 
          : content;
          
        // Add file content to chat
        const fileMessage: Message = {
          role: 'user',
          content: `[Uploaded file: ${file.name}]\n\n${truncatedContent}`,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, fileMessage]);
        
        // If not in auto-respond mode, generate response immediately
        if (!autoRespond) {
          handleGenerateResponse();
        }
      } catch (error) {
        console.error("Error reading file:", error);
        toast.error("Failed to read file", {
          description: "The file could not be processed"
        });
      }
    };
    
    reader.onerror = () => {
      toast.error("Failed to read file", {
        description: "There was an error processing the file"
      });
    };
    
    reader.readAsText(file);
    
    // Reset the input
    e.target.value = '';
  };

  return (
    <div className={cn(
      "relative font-terminal flex flex-col bg-cyberpunk-dark border border-cyberpunk-neon-green",
      "pixel-corners pixel-borders h-full",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-green h-5 flex items-center justify-between px-2 z-10">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">QUX-95 TERMINAL</div>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
              >
                <SettingsIcon className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-cyberpunk-dark-blue border-cyberpunk-neon-green text-cyberpunk-neon-green w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Chat Settings</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-respond">Auto-respond</Label>
                    <Switch 
                      id="auto-respond" 
                      checked={autoRespond}
                      onCheckedChange={setAutoRespond}
                      className="data-[state=checked]:bg-cyberpunk-neon-green"
                    />
                  </div>
                  {autoRespond && (
                    <div className="grid gap-2">
                      <Label htmlFor="auto-respond-delay">Response delay (seconds)</Label>
                      <Slider
                        id="auto-respond-delay"
                        defaultValue={[autoRespondDelay]}
                        min={1}
                        max={30}
                        step={1}
                        onValueChange={([value]) => setAutoRespondDelay(value)}
                      />
                      <div className="text-xs text-right">{autoRespondDelay}s</div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Model Settings</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <Slider
                      id="temperature"
                      defaultValue={[temperature * 100]}
                      min={1}
                      max={100}
                      step={1}
                      onValueChange={([value]) => setTemperature(value / 100)}
                    />
                    <div className="text-xs text-right">{temperature.toFixed(2)}</div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Slider
                      id="max-tokens"
                      defaultValue={[maxTokens]}
                      min={256}
                      max={4096}
                      step={256}
                      onValueChange={([value]) => setMaxTokens(value)}
                    />
                    <div className="text-xs text-right">{maxTokens}</div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
            onClick={clearChat}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
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
              disabled={isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
            
            <label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                size="icon"
                variant="outline"
                className="border-cyberpunk-neon-blue text-cyberpunk-neon-blue cursor-pointer"
                type="button"
                asChild
              >
                <div>
                  <FileUp className="h-4 w-4" />
                </div>
              </Button>
            </label>
            
            <Button
              size="icon"
              variant="outline"
              className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
              onClick={() => handleGenerateResponse()}
              disabled={isTyping || messages.length === 0 || messages[messages.length - 1].role === 'assistant'}
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
