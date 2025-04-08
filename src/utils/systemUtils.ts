
/**
 * System utilities for common operations across the application
 */
import { toast } from 'sonner';
import { ollamaService } from '@/services/ollamaService';

/**
 * Checks hardware capabilities and returns a formatted status message
 */
export const checkHardwareCapabilities = async (): Promise<string> => {
  try {
    const hardwareInfo = ollamaService.getHardwareInfo();
    const connected = await ollamaService.checkConnection();
    
    return `
System Status: ONLINE
Ollama Connection: ${connected ? 'CONNECTED' : 'DISCONNECTED'}
Hardware Details:
- GPU: ${hardwareInfo.gpu.available ? `${hardwareInfo.gpu.name} (${hardwareInfo.gpu.vramFree}MB/${hardwareInfo.gpu.vramTotal}MB VRAM)` : 'Not Available'}
- CPU: ${hardwareInfo.cpu.cores} cores
- RAM: ${hardwareInfo.ram.free}MB free of ${hardwareInfo.ram.total}MB
Session ID: ${ollamaService.getSessionId()}`;
  } catch (error) {
    console.error('Error checking hardware capabilities:', error);
    return 'Error retrieving system hardware information';
  }
};

/**
 * Executes a system command with proper error handling
 */
export const executeSystemCommand = async (
  command: string,
  options?: { notify?: boolean }
): Promise<string> => {
  try {
    const result = await ollamaService.executeCommand(command);
    
    if (options?.notify) {
      toast.success('Command executed successfully', {
        description: `Command: ${command.substring(0, 30)}${command.length > 30 ? '...' : ''}`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Command execution error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (options?.notify) {
      toast.error('Command execution failed', {
        description: errorMessage
      });
    }
    
    return `Error executing command: ${errorMessage}`;
  }
};

/**
 * Toggles auto mode with proper error handling
 */
export const toggleAutoMode = (
  currentState: boolean, 
  setAutoMode: (value: boolean) => void
): string => {
  try {
    const newState = !currentState;
    setAutoMode(newState);
    return `Autonomous mode ${newState ? 'enabled' : 'disabled'}.`;
  } catch (error) {
    console.error('Error toggling auto mode:', error);
    toast.error('Failed to toggle autonomous mode', {
      description: 'There was an error changing the system mode'
    });
    return 'Error toggling autonomous mode.';
  }
};
