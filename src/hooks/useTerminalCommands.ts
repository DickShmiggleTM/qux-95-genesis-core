
import { useState } from 'react';
import { ollamaService, OllamaModel } from '@/services/ollamaService';
import { checkHardwareCapabilities, executeSystemCommand, toggleAutoMode } from '@/utils/systemUtils';
import { toast } from 'sonner';

type CommandExecutor = (command: string) => void | string | Promise<string | void>;
type CommandHandler = (args: string[]) => string | Promise<string>;

export interface UseTerminalCommandsProps {
  externalCommandHandler?: CommandExecutor;
  autoMode: boolean;
  setAutoMode?: (value: boolean) => void;
  onSelfModify?: () => void;
}

export const useTerminalCommands = ({
  externalCommandHandler,
  autoMode,
  setAutoMode,
  onSelfModify
}: UseTerminalCommandsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Built-in terminal commands
   */
  const builtInCommands: Record<string, CommandHandler> = {
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
  hardware             - Display hardware information
  reasoning [on|off]   - Enable/disable reasoning system
  save                 - Save current system state
`;
    },
    
    echo: (args) => {
      return args.join(" ");
    },
    
    status: async () => {
      return await checkHardwareCapabilities();
    },
    
    model: async (args) => {
      if (args.length === 0) {
        const currentModel = ollamaService.getCurrentModel();
        return `Current model: ${currentModel || 'None'}`;
      }
      
      const modelName = args.join(' ');
      const models = ollamaService.getModels();
      const model = models.find(m => 
        m.name.toLowerCase() === modelName.toLowerCase() || 
        m.id.toLowerCase() === modelName.toLowerCase()
      );
      
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
      return await executeSystemCommand(command, { notify: true });
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
      if (onSelfModify) {
        onSelfModify();
        return 'Initiating self-modification sequence...';
      }
      
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
      if (!setAutoMode) {
        return 'Auto mode control not available in this context.';
      }
      
      if (args[0] === 'on' || args[0] === 'enable') {
        setAutoMode(true);
        return 'Autonomous mode enabled.';
      } else if (args[0] === 'off' || args[0] === 'disable') {
        setAutoMode(false);
        return 'Autonomous mode disabled.';
      }
      
      return toggleAutoMode(autoMode, setAutoMode);
    },
    
    hardware: async () => {
      const hardwareInfo = ollamaService.getHardwareInfo();
      
      return `
Hardware Information:
GPU: ${hardwareInfo.gpu.available ? 'Available' : 'Not Available'}
${hardwareInfo.gpu.name ? `GPU Model: ${hardwareInfo.gpu.name}` : ''}
${hardwareInfo.gpu.vramTotal ? `GPU VRAM: ${hardwareInfo.gpu.vramTotal}MB (${hardwareInfo.gpu.vramFree}MB free)` : ''}
CPU: ${hardwareInfo.cpu.cores} cores
${hardwareInfo.cpu.model ? `CPU Model: ${hardwareInfo.cpu.model}` : ''}
RAM: ${hardwareInfo.ram.total}MB total (${hardwareInfo.ram.free}MB free)
`;
    },
    
    reasoning: (args) => {
      const { reasoningSystem } = require('@/services/reasoningSystem');
      
      if (args[0] === 'on' || args[0] === 'enable') {
        reasoningSystem.enable();
        return 'Reasoning system enabled.';
      } else if (args[0] === 'off' || args[0] === 'disable') {
        reasoningSystem.disable();
        return 'Reasoning system disabled.';
      }
      
      const enabled = reasoningSystem.isEnabled();
      return `Reasoning system is currently ${enabled ? 'enabled' : 'disabled'}.
Usage: reasoning [on|off|enable|disable]`;
    },
    
    save: async () => {
      try {
        const saved = await ollamaService.saveState();
        if (saved) {
          return 'System state saved successfully.';
        } else {
          return 'Failed to save system state.';
        }
      } catch (error) {
        console.error('Error saving state:', error);
        return `Error saving system state: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    
    clear: () => {
      return "CLEAR_TERMINAL";
    }
  };

  /**
   * Handle command execution
   */
  const executeCommand = async (command: string): Promise<string | void> => {
    if (!command.trim()) return;
    
    // Parse command and arguments
    const parts = command.split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    setIsProcessing(true);
    
    try {
      // Check for built-in command
      if (builtInCommands[cmd]) {
        const result = await builtInCommands[cmd](args);
        setIsProcessing(false);
        return result;
      }

      // External command handler
      if (externalCommandHandler) {
        const result = await externalCommandHandler(command);
        setIsProcessing(false);
        return result ? result.toString() : undefined;
      }
      
      // Default response if no handler
      setIsProcessing(false);
      return `Command not recognized: ${command}`;
    } catch (error) {
      console.error("Command execution error:", error);
      setIsProcessing(false);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  return {
    isProcessing,
    executeCommand,
    builtInCommands
  };
};
