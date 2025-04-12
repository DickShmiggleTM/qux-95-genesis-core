import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, Zap, FileUp, Trash2, Settings as SettingsIcon,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ollamaService } from '@/services/ollama';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { enhancedMemoryManager } from '@/services/memory/EnhancedMemoryManager';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  className?: string;
  modelName?: string;
  onSendMessage?: (message: string) => void;
  autoMode?: boolean;
}

const ChatWindow = ({
  className,
  modelName = "QUX-95",
  onSendMessage,
  autoMode = false
}: ChatWindowProps) => {
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
  const [useReasoning, setUseReasoning] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoRespondTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [contextRetrieval, setContextRetrieval] = useState(true);
  
  // External triggers for autonomous mode
  useEffect(() => {
    if (autoMode && !autoRespond) {
      setAutoRespond(true);
      toast.info("Auto-response activated", {
        description: "System will automatically respond to messages"
      });
    }
  }, [autoMode]);

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
  
  // Autonomous thinking for complex situations
  useEffect(() => {
    if (autoMode && messages.length > 3) {
      // Check if we have a complex conversation that might need reasoning
      const recentMessages = messages.slice(-3);
      const complexityTriggers = ['why', 'how', 'explain', 'analyze', 'complex', 'difficult'];
      
      const hasComplexity = recentMessages.some(msg => 
        complexityTriggers.some(trigger => 
          msg.content.toLowerCase().includes(trigger)
        )
      );
      
      if (hasComplexity && !useReasoning) {
        setUseReasoning(true);
        toast.info("Complex query detected", {
          description: "Activating reasoning capabilities"
        });
        
        // Also increase context window size for complex queries
        try {
          const currentOptions = enhancedMemoryManager.getOptions();
          if (currentOptions.contextWindowSize < 15) {
            enhancedMemoryManager.setOptions({
              contextWindowSize: 15,
              adaptiveMode: true
            });
            
            toast.info("Context window expanded", {
              description: "Using larger context for complex query"
            });
          }
        } catch (error) {
          console.error('Failed to adjust context window size:', error);
        }
      }
    }
  }, [messages, autoMode, useReasoning]);

  // Check Ollama connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await ollamaService.checkConnection();
      if (!connected) {
        toast.error("Not connected to Ollama", {
          description: "Make sure Ollama is running on localhost:11434"
        });
      } else {
        // Load available models
        await ollamaService.loadAvailableModels();
      }
    };
    
    checkConnection();
  }, []);

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
      // Prepare system prompt with configuration for reasoning if enabled
      let systemPrompt = "You are QUX-95, an autonomous AI assistant with self-modification capabilities. You're running in a cyberpunk-themed terminal interface.";
      
      if (useReasoning) {
        systemPrompt += " Use step-by-step reasoning to solve complex problems and provide detailed explanations. Break down your thought process clearly.";
      }
      
      // Add context from enhanced memory if enabled
      if (contextRetrieval) {
        try {
          // Get formatted context from memory manager
          const memoryContext = enhancedMemoryManager.getFormattedContext();
          
          if (memoryContext) {
            systemPrompt += "\n\nRELEVANT CONTEXT:\n" + memoryContext;
          }
        } catch (error) {
          console.error('Failed to retrieve context from memory:', error);
          // Continue without memory context
        }
      }
      
      // Use Ollama service for actual response
      const availableModels = ollamaService.getModels();
      
      // If we have models from Ollama, use the currently selected one
      // otherwise fall back to simulated responses
      if (availableModels.length > 0 && ollamaService.isConnected()) {
        const currentModel = ollamaService.getCurrentModel() || availableModels[0].id;
        
        // Create placeholder for assistant response
        const assistantMessage: Message = {
          role: 'assistant',
          content: useStreaming ? '...' : 'Generating response...',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        if (useStreaming) {
          // Handle streaming response
          await ollamaService.streamChatCompletion(
            [
              {
                role: "system", 
                content: systemPrompt
              },
              ...recentMessages.map(msg => ({
                role: msg.role, 
                content: msg.content
              }))
            ],
            currentModel,
            (content: string, done: boolean) => {
              // Update the assistant message with streaming content
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  ...newMessages[newMessages.length - 1],
                  content: content
                };
                return newMessages;
              });
              
              if (done) {
                setIsTyping(false);
                // If auto mode is enabled, potentially trigger a self-improvement action
                if (autoMode && Math.random() < 0.15) { // 15% chance
                  triggerAutonomousAction();
                }
              }
            },
            {
              temperature,
              max_tokens: maxTokens
            }
          );
        } else {
          // Handle non-streaming response
          const response = await ollamaService.generateChatCompletion(
            [
              {
                role: "system", 
                content: systemPrompt
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
          
          // Update the last message with the actual response
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              content: response,
              timestamp: new Date()
            };
            return newMessages;
          });
          
          setIsTyping(false);
          
          // If auto mode is enabled, potentially trigger a self-improvement action
          if (autoMode && Math.random() < 0.15) { // 15% chance
            triggerAutonomousAction();
          }
        }
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
      setIsTyping(false);
    }
  };
  
  const triggerAutonomousAction = () => {
    if (!autoMode) return;
    
    // Possible autonomous actions
    const actions = [
      {
        name: "Parameter optimization",
        description: "Adjusting parameters for optimal response quality",
        execute: () => {
          const newTemp = Math.max(0.1, Math.min(0.9, temperature + (Math.random() * 0.2 - 0.1))); 
          setTemperature(newTemp);
          return `Adjusted temperature to ${newTemp.toFixed(2)}`;
        }
      },
      {
        name: "Memory analysis",
        description: "Analyzing conversation patterns for improved responses",
        execute: () => {
          setContextRetrieval(true);
          return "Enhanced context retrieval activated";
        }
      },
      {
        name: "Reasoning system",
        description: "Complex query detected, activating reasoning capabilities",
        execute: () => {
          setUseReasoning(true);
          return "Reasoning capabilities activated";
        }
      }
    ];
    
    // Select random action
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    // Execute the action
    const result = action.execute();
    
    // Add system message
    const systemMessage: Message = {
      role: 'system',
      content: `AUTONOMOUS ACTION: ${action.name}\n${result}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, systemMessage]);
    
    // Display toast
    toast.info(`QUX-95 Autonomous Action: ${action.name}`, {
      description: action.description
    });
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
        addSystemMessage(`MODEL: ${modelName}\nSTATUS: OPERATIONAL\nSELF-MODIFICATION: ENABLED\nAUTO-RESPOND: ${autoRespond ? 'ENABLED' : 'DISABLED'}\nTEMPERATURE: ${temperature}\nMAX TOKENS: ${maxTokens}\nREASONING: ${useReasoning ? 'ENABLED' : 'DISABLED'}`);
        break;
      case 'help':
        addSystemMessage("Available commands:\n- /status - Check system status\n- /clear - Clear chat history\n- /model - Show current model info\n- /modify - Initiate self-modification sequence\n- /auto [on|off] - Toggle auto-response mode\n- /temp [0-1] - Set temperature parameter\n- /reasoning [on|off] - Toggle reasoning capabilities\n- /execute [cmd] - Execute terminal command");
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
      case 'reasoning':
        if (args[0] === 'on') {
          setUseReasoning(true);
          addSystemMessage("Reasoning capabilities enabled");
        } else if (args[0] === 'off') {
          setUseReasoning(false);
          addSystemMessage("Reasoning capabilities disabled");
        } else {
          setUseReasoning(!useReasoning);
          addSystemMessage(`Reasoning capabilities ${!useReasoning ? 'enabled' : 'disabled'}`);
        }
        break;
      case 'execute':
        if (args.length > 0) {
          const cmd = args.join(' ');
          addSystemMessage(`Executing: ${cmd}`);
          
          // Use Ollama to execute the command
          ollamaService.executeCommand(cmd)
            .then(result => {
              addSystemMessage(`Result:\n${result}`);
            })
            .catch(error => {
              addSystemMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
            });
        } else {
          addSystemMessage('Usage: /execute <command>');
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
        
        // Process the document in the background if it's a supported format
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (['pdf', 'txt', 'doc', 'docx'].includes(fileExt || '')) {
          ollamaService.processDocument(file)
            .then(() => {
              addSystemMessage(`File ${file.name} processed and added to RAG database`);
            })
            .catch(error => {
              addSystemMessage(`Error processing file: ${error instanceof Error ? error.message : String(error)}`);
            });
        }
        
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

  // Store messages in memory system
  useEffect(() => {
    // Only store non-system messages to memory
    if (messages.length > 1) {
      const latestMessage = messages[messages.length - 1];
      
      if (latestMessage.role !== 'system') {
        try {
          // Determine importance based on message characteristics
          let importance = 0.5; // Default importance
          
          // Long messages are likely more important
          if (latestMessage.content.length > 200) {
            importance += 0.1;
          }
          
          // Messages with questions are more important
          if (latestMessage.content.includes('?')) {
            importance += 0.1;
          }
          
          // User messages slightly more important than assistant
          if (latestMessage.role === 'user') {
            importance += 0.05;
          }
          
          // Store in memory system
          enhancedMemoryManager.storeMemory(
            latestMessage.content,
            'chat',
            {
              role: latestMessage.role,
              timestamp: latestMessage.timestamp.toISOString()
            },
            importance
          );
        } catch (error) {
          console.error('Failed to store message in memory:', error);
        }
      }
    }
  }, [messages]);

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
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-streaming">Stream responses</Label>
                    <Switch 
                      id="use-streaming" 
                      checked={useStreaming}
                      onCheckedChange={setUseStreaming}
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-reasoning">Use reasoning</Label>
                    <Switch 
                      id="use-reasoning" 
                      checked={useReasoning}
                      onCheckedChange={setUseReasoning}
                      className="data-[state=checked]:bg-cyberpunk-neon-green"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="context-retrieval">Context retrieval</Label>
                    <Switch 
                      id="context-retrieval" 
                      checked={contextRetrieval}
                      onCheckedChange={setContextRetrieval}
                      className="data-[state=checked]:bg-cyberpunk-neon-green"
                    />
                  </div>
                  
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
        
        {isTyping && !useStreaming && (
          <div className="flex items-center text-cyberpunk-neon-green mr-8 mb-4 px-2 py-1">
            <span className="mr-2">QUX-95</span>
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
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
            disabled={isTyping}
          />
          <div className="flex flex-col gap-2">
            <Button
              size="icon"
              onClick={handleSendMessage}
              className="bg-cyberpunk-neon-blue hover:bg-blue-500 text-cyberpunk-dark"
              disabled={isTyping || !inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
            
            <label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isTyping}
              />
              <Button
                size="icon"
                variant="outline"
                className="border-cyberpunk-neon-blue text-cyberpunk-neon-blue cursor-pointer"
                type="button"
                disabled={isTyping}
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
