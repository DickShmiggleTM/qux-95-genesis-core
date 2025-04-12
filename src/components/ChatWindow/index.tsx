import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ollamaService } from '@/services/ollama';
import { Message } from './types';
import Header from './Header';
import MessageList from './MessageList';
import InputBar from './InputBar';
import ChatHistoryPanel from './ChatHistoryPanel';
import { chatHistoryService } from '@/services/chatHistoryService';
import ModelSelector from './ModelSelector';
import PromptEditor from '@/components/PromptEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChatWindowProps {
  className?: string;
  modelName?: string;
  onSendMessage?: (message: string) => void;
  autoMode?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  className,
  modelName = "QUX-95",
  onSendMessage,
  autoMode = false
}) => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `QUX-95 GENESIS CORE INITIALIZED\nMODEL: ${modelName}\nSTATUS: OPERATIONAL\nSELF-MODIFICATION: ENABLED\nUSE COMMAND /help FOR AVAILABLE COMMANDS`,
      timestamp: new Date(),
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [autoRespond, setAutoRespond] = useState(false);
  const [autoRespondDelay, setAutoRespondDelay] = useState(5);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [useReasoning, setUseReasoning] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [contextRetrieval, setContextRetrieval] = useState(true);
  const autoRespondTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // New state for model selection and tools
  const [currentModel, setCurrentModel] = useState<string>(modelName);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [isQuxToolsOpen, setIsQuxToolsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>(['QUX-95', 'llama2', 'mistral', 'codellama', 'vicuna']);

  // Initialize chat history
  useEffect(() => {
    // Check if there's a current session
    const currentSession = chatHistoryService.getCurrentSession();
    if (currentSession) {
      // Load messages from the current session
      setCurrentSessionId(currentSession.id);

      // Convert stored messages to the Message format
      const loadedMessages = currentSession.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));

      // If there are messages, set them
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      }
    } else {
      // Create a new session
      const newSessionId = chatHistoryService.createSession('New Chat', modelName);
      setCurrentSessionId(newSessionId);

      // Add initial system message to chat history
      chatHistoryService.addMessage({
        role: 'system',
        content: `QUX-95 GENESIS CORE INITIALIZED\nMODEL: ${modelName}\nSTATUS: OPERATIONAL\nSELF-MODIFICATION: ENABLED\nUSE COMMAND /help FOR AVAILABLE COMMANDS`
      });
    }
  }, [modelName]);

  // Clear chat history
  const clearChat = useCallback(() => {
    // Create a new session
    const newSessionId = chatHistoryService.createSession('New Chat', currentModel);
    setCurrentSessionId(newSessionId);

    // Reset messages
    const initialMessage = {
      role: 'system' as const,
      content: `QUX-95 GENESIS CORE INITIALIZED\nMODEL: ${currentModel}\nSTATUS: OPERATIONAL\nSELF-MODIFICATION: ENABLED\nUSE COMMAND /help FOR AVAILABLE COMMANDS`,
      timestamp: new Date(),
    };

    setMessages([initialMessage]);

    // Add to chat history
    chatHistoryService.addMessage({
      role: initialMessage.role,
      content: initialMessage.content
    });
  }, [currentModel]);

  // External triggers for autonomous mode
  useEffect(() => {
    if (autoMode && !autoRespond) {
      setAutoRespond(true);
      toast.info("Auto-response activated", {
        description: "System will automatically respond to messages"
      });
    }
  }, [autoMode]);

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

      // Add context retrieval if enabled
      let context = "";
      if (contextRetrieval) {
        const recentContext = ollamaService.getContext(5);
        if (recentContext.length > 0) {
          context = "\nRecent context: " + JSON.stringify(recentContext.map(c => {
            return {type: c.type, summary: c.type === 'chat' ? 'Previous chat interaction' : 'System activity'};
          }));
          systemPrompt += context;
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

          // Add to chat history
          if (currentSessionId) {
            chatHistoryService.addMessage({
              role: 'assistant',
              content: response
            });
          }

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

  const handleSendMessage = useCallback((message: string) => {
    if (!message.trim()) return;

    // Check for commands
    if (message.startsWith('/')) {
      handleCommand(message.slice(1).trim());
      return;
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Add to chat history
    if (currentSessionId) {
      chatHistoryService.addMessage({
        role: userMessage.role,
        content: userMessage.content
      });
    }

    if (onSendMessage) {
      onSendMessage(message);
    }

    // If not in auto-respond mode, generate response immediately
    if (!autoRespond) {
      handleGenerateResponse();
    }
  }, [onSendMessage, autoRespond, currentSessionId]);

  const handleCommand = (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'clear':
        clearChat();
        break;
      case 'status':
        addSystemMessage(`MODEL: ${currentModel}\nSTATUS: OPERATIONAL\nSELF-MODIFICATION: ENABLED\nAUTO-RESPOND: ${autoRespond ? 'ENABLED' : 'DISABLED'}\nTEMPERATURE: ${temperature}\nMAX TOKENS: ${maxTokens}\nREASONING: ${useReasoning ? 'ENABLED' : 'DISABLED'}`);
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

    // Add to chat history
    if (currentSessionId) {
      chatHistoryService.addMessage({
        role: systemMessage.role,
        content: systemMessage.content
      });
    }
  };

  const handleFileUpload = useCallback((file: File) => {
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
  }, [autoRespond]);

  const handleModelChange = useCallback((model: string) => {
    setCurrentModel(model);
    
    // Update system message to reflect model change
    const systemMessage: Message = {
      role: 'system',
      content: `MODEL SWITCHED TO: ${model}`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, systemMessage]);
    
    // Add to chat history
    if (currentSessionId) {
      chatHistoryService.addMessage({
        role: systemMessage.role,
        content: systemMessage.content
      });
    }
    
    toast.success('Model changed', {
      description: `Now using ${model}`
    });
  }, [currentSessionId]);

  const handleOpenPromptEditor = useCallback(() => {
    setIsPromptEditorOpen(true);
  }, []);

  const handleOpenQuxTools = useCallback(() => {
    setIsQuxToolsOpen(true);
  }, []);

  const handlePromptEditorSubmit = useCallback((promptContent: string) => {
    setIsPromptEditorOpen(false);
    
    // Add system message for prompt change
    const systemMessage: Message = {
      role: 'system',
      content: `SYSTEM PROMPT UPDATED`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, systemMessage]);
    
    toast.success('Prompt updated', {
      description: 'System prompt has been updated'
    });
  }, []);

  const isLastMessageAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  // Handle selecting a chat from history
  const handleSelectChat = (sessionId: string) => {
    // Load the selected chat
    const session = chatHistoryService.getSession(sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      chatHistoryService.setCurrentSessionId(sessionId);

      // Convert stored messages to the Message format
      const loadedMessages = session.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));

      setMessages(loadedMessages);
      toast.success('Chat loaded', {
        description: `Loaded chat: ${session.title}`
      });
    }
  };

  // Handle creating a new chat
  const handleNewChat = () => {
    clearChat();
  };

  const settingsProps = {
    autoRespond,
    setAutoRespond,
    autoRespondDelay,
    setAutoRespondDelay,
    useStreaming,
    setUseStreaming,
    useReasoning,
    setUseReasoning,
    contextRetrieval,
    setContextRetrieval,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens
  };

  return (
    <div className={cn(
      "relative font-terminal flex flex-col bg-cyberpunk-dark border border-cyberpunk-neon-green chat-window",
      "pixel-corners pixel-borders h-full max-h-full overflow-hidden chat-container",
      className
    )}>
      <Header
        onClearChat={clearChat}
        settingsProps={settingsProps}
        historyPanel={
          <ChatHistoryPanel
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            currentSessionId={currentSessionId}
          />
        }
        modelSelector={
          <ModelSelector
            value={currentModel}
            onChange={handleModelChange}
            availableModels={availableModels}
          />
        }
        onOpenPromptEditor={handleOpenPromptEditor}
        onOpenQuxTools={handleOpenQuxTools}
      />

      <MessageList
        messages={messages}
        isTyping={isTyping}
        useStreaming={useStreaming}
      />

      <InputBar
        onSendMessage={handleSendMessage}
        onGenerateResponse={handleGenerateResponse}
        onFileUpload={handleFileUpload}
        isTyping={isTyping}
        lastMessageIsAssistant={isLastMessageAssistant}
      />

      {/* Prompt Editor Dialog */}
      <Dialog open={isPromptEditorOpen} onOpenChange={setIsPromptEditorOpen}>
        <DialogContent className="bg-cyberpunk-dark border-cyberpunk-neon-green text-cyberpunk-neon-green">
          <DialogHeader>
            <DialogTitle>Prompt Editor</DialogTitle>
          </DialogHeader>
          <PromptEditor 
            className="max-h-[70vh] overflow-auto"
            onSave={(content) => {
              handlePromptEditorSubmit(content);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Qux Tools Dialog */}
      <Dialog open={isQuxToolsOpen} onOpenChange={setIsQuxToolsOpen}>
        <DialogContent className="bg-cyberpunk-dark border-cyberpunk-neon-green text-cyberpunk-neon-green">
          <DialogHeader>
            <DialogTitle>Qux Tools</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-cyberpunk-dark-blue border border-cyberpunk-neon-blue text-cyberpunk-neon-blue p-2 rounded"
                onClick={() => {
                  toast.info('RAG Pipeline activated');
                  setIsQuxToolsOpen(false);
                }}
              >
                RAG Pipeline
              </button>
              <button
                className="bg-cyberpunk-dark-blue border border-cyberpunk-neon-blue text-cyberpunk-neon-blue p-2 rounded"
                onClick={() => {
                  toast.info('Code Generator activated');
                  setIsQuxToolsOpen(false);
                }}
              >
                Code Generator
              </button>
              <button
                className="bg-cyberpunk-dark-blue border border-cyberpunk-neon-blue text-cyberpunk-neon-blue p-2 rounded"
                onClick={() => {
                  toast.info('File Watcher activated');
                  setIsQuxToolsOpen(false);
                }}
              >
                File Watcher
              </button>
              <button
                className="bg-cyberpunk-dark-blue border border-cyberpunk-neon-blue text-cyberpunk-neon-blue p-2 rounded"
                onClick={() => {
                  toast.info('Memory Manager activated');
                  setIsQuxToolsOpen(false);
                }}
              >
                Memory Manager
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatWindow;
