/**
 * System utilities for common operations across the application
 */
import { toast } from 'sonner';
import { ollamaService } from '@/services/ollamaService';
import { workspaceService } from '@/services/workspaceService';
import { githubService } from '@/services/githubService';
import { learningService } from '@/services/learningService';

/**
 * Checks hardware capabilities and returns a formatted status message
 */
export const checkHardwareCapabilities = async (): Promise<string> => {
  try {
    const hardwareInfo = ollamaService.getHardwareInfo();
    const connected = await ollamaService.checkConnection();
    
    // Check workspace status
    const workspaceStats = workspaceService.getStats();
    
    // Check learning system status
    const learningEnabled = learningService.isEnabled();
    const learningStats = learningService.getStats();
    const activeModel = learningService.getActiveModel();
    
    return `
System Status: ONLINE
Ollama Connection: ${connected ? 'CONNECTED' : 'DISCONNECTED'}
Hardware Details:
- GPU: ${hardwareInfo.gpu.available ? `${hardwareInfo.gpu.name} (${hardwareInfo.gpu.vramFree}MB/${hardwareInfo.gpu.vramTotal}MB VRAM)` : 'Not Available'}
- CPU: ${hardwareInfo.cpu.cores} cores
- RAM: ${hardwareInfo.ram.free}MB free of ${hardwareInfo.ram.total}MB

Workspace Status:
- Files: ${workspaceStats.totalFiles}
- Total Size: ${workspaceStats.totalSize} bytes
- Last Modified: ${workspaceStats.lastModified ? new Date(workspaceStats.lastModified).toLocaleString() : 'Never'}

Learning System: ${learningEnabled ? 'ENABLED' : 'DISABLED'}
${activeModel ? `- Active Model: ${activeModel.name}
- Model Accuracy: ${(activeModel.performance.accuracy * 100).toFixed(2)}%
- Training Iterations: ${activeModel.performance.iterations}` : ''}

GitHub Integration: ${githubService.isAuthenticated() ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}
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
    // Check for workspace commands
    if (command.startsWith('workspace ')) {
      return handleWorkspaceCommand(command.substring(10));
    }
    
    // Check for GitHub commands
    if (command.startsWith('github ')) {
      return handleGitHubCommand(command.substring(7));
    }
    
    // Check for learning commands
    if (command.startsWith('learn ')) {
      return handleLearningCommand(command.substring(6));
    }
    
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
 * Handle workspace-related commands
 */
const handleWorkspaceCommand = (command: string): string => {
  const parts = command.split(' ');
  const action = parts[0];
  
  switch (action) {
    case 'list':
      const path = parts[1] || '';
      const contents = workspaceService.listDirectory(path);
      return `Directory: ${path || 'ai_workspace'}\n\n${contents.map(item => 
        `${item.type === 'directory' ? 'DIR' : 'FILE'} ${item.name} (${item.size} bytes)`
      ).join('\n')}`;
    
    case 'read':
      const filePath = parts[1];
      if (!filePath) return 'Usage: workspace read <file_path>';
      
      const content = workspaceService.readFile(filePath);
      if (content === null) return `File not found: ${filePath}`;
      
      return `=== ${filePath} ===\n\n${content}`;
    
    case 'write':
      if (parts.length < 3) return 'Usage: workspace write <file_path> <content>';
      
      const writeFilePath = parts[1];
      const writeContent = parts.slice(2).join(' ');
      
      const success = workspaceService.writeFile(writeFilePath, writeContent);
      return success ? `File written: ${writeFilePath}` : `Failed to write file: ${writeFilePath}`;
    
    case 'delete':
      const deleteFilePath = parts[1];
      if (!deleteFilePath) return 'Usage: workspace delete <file_path>';
      
      const deleted = workspaceService.deleteFile(deleteFilePath);
      return deleted ? `File deleted: ${deleteFilePath}` : `Failed to delete file: ${deleteFilePath}`;
    
    case 'mkdir':
      const dirPath = parts[1];
      if (!dirPath) return 'Usage: workspace mkdir <directory_path>';
      
      const created = workspaceService.createDirectory(dirPath);
      return created ? `Directory created: ${dirPath}` : `Failed to create directory: ${dirPath}`;
    
    case 'stats':
      const stats = workspaceService.getStats();
      return `Workspace Statistics:
- Files: ${stats.totalFiles}
- Total Size: ${stats.totalSize} bytes
- Last Modified: ${stats.lastModified ? new Date(stats.lastModified).toLocaleString() : 'Never'}`;
    
    default:
      return `Unknown workspace command: ${action}
Available commands:
- workspace list [path]
- workspace read <file_path>
- workspace write <file_path> <content>
- workspace delete <file_path>
- workspace mkdir <directory_path>
- workspace stats`;
  }
};

/**
 * Handle GitHub-related commands
 */
const handleGitHubCommand = (command: string): string => {
  const parts = command.split(' ');
  const action = parts[0];
  
  switch (action) {
    case 'auth':
      if (parts.length < 3) return 'Usage: github auth <username> <token>';
      
      const username = parts[1];
      const token = parts[2];
      
      const authSuccess = githubService.authenticate({ username, token });
      return authSuccess ? `Authenticated as ${username}` : 'Authentication failed';
    
    case 'repos':
      if (!githubService.isAuthenticated()) return 'Not authenticated. Use "github auth" first.';
      
      const repos = githubService.getRepositories();
      return `Repositories (${repos.length}):\n${repos.map(repo => 
        `- ${repo.name}: ${repo.description} (${repo.cloned ? 'Cloned' : 'Not Cloned'})`
      ).join('\n')}`;
    
    case 'clone':
      if (!githubService.isAuthenticated()) return 'Not authenticated. Use "github auth" first.';
      if (parts.length < 2) return 'Usage: github clone <repo_name>';
      
      const repoName = parts[1];
      const cloneSuccess = githubService.cloneRepository(repoName);
      return cloneSuccess ? `Repository cloned: ${repoName}` : `Failed to clone repository: ${repoName}`;
    
    case 'commit':
      if (!githubService.isAuthenticated()) return 'Not authenticated. Use "github auth" first.';
      if (parts.length < 3) return 'Usage: github commit <message> <file1,file2,...>';
      
      const message = parts[1];
      const files = parts[2].split(',');
      
      const commitPromise = githubService.createCommit(message, files);
      // Return a message without requiring the hash right away
      return 'Creating commit... Check the GitHub interface for details.';
    
    case 'push':
      if (!githubService.isAuthenticated()) return 'Not authenticated. Use "github auth" first.';
      
      const pushSuccess = githubService.pushCommits();
      return pushSuccess ? 'Changes pushed successfully' : 'Failed to push changes';
    
    case 'pull':
      if (!githubService.isAuthenticated()) return 'Not authenticated. Use "github auth" first.';
      
      const pullSuccess = githubService.pullChanges();
      return pullSuccess ? 'Changes pulled successfully' : 'Failed to pull changes';
    
    case 'logout':
      if (!githubService.isAuthenticated()) return 'Not authenticated.';
      
      githubService.logout();
      return 'Logged out successfully';
    
    default:
      return `Unknown GitHub command: ${action}
Available commands:
- github auth <username> <token>
- github repos
- github clone <repo_name>
- github commit <message> <file1,file2,...>
- github push
- github pull
- github logout`;
  }
};

/**
 * Handle learning-related commands
 */
const handleLearningCommand = (command: string): string => {
  const parts = command.split(' ');
  const action = parts[0];
  
  switch (action) {
    case 'enable':
      learningService.enable();
      return 'Learning system enabled';
    
    case 'disable':
      learningService.disable();
      return 'Learning system disabled';
    
    case 'status':
      const enabled = learningService.isEnabled();
      const stats = learningService.getStats();
      const activeModel = learningService.getActiveModel();
      
      return `Learning System: ${enabled ? 'ENABLED' : 'DISABLED'}
Statistics:
- Total Examples: ${stats.totalExamples}
- Last Learning: ${stats.lastLearnedAt ? new Date(stats.lastLearnedAt).toLocaleString() : 'Never'}
- Improvement Rate: ${stats.improvementRate.toFixed(2)}%
${activeModel ? `\nActive Model: ${activeModel.name}
- Accuracy: ${(activeModel.performance.accuracy * 100).toFixed(2)}%
- Iterations: ${activeModel.performance.iterations}
- Last Improvement: ${new Date(activeModel.performance.lastImprovement).toLocaleString()}` : '\nNo active model'}`;
    
    case 'start':
      if (!learningService.isEnabled()) return 'Learning system is disabled. Enable it first.';
      
      const learnSuccess = learningService.learn();
      return learnSuccess ? 'Learning process started' : 'Failed to start learning process';
    
    case 'record':
      if (!learningService.isEnabled()) return 'Learning system is disabled. Enable it first.';
      if (parts.length < 3) return 'Usage: learn record <input> <output> [tag1,tag2,...]';
      
      const input = parts[1];
      const output = parts[2];
      const tags = parts.length > 3 ? parts[3].split(',') : [];
      
      const exampleId = learningService.recordExample(input, output, tags);
      return exampleId ? `Example recorded: ${exampleId}` : 'Failed to record example';
    
    case 'models':
      const models = learningService.getModels();
      return `Learning Models (${models.length}):\n${models.map(model => 
        `- ${model.name}: Accuracy ${(model.performance.accuracy * 100).toFixed(2)}%, ${model.performance.iterations} iterations`
      ).join('\n')}`;
    
    default:
      return `Unknown learning command: ${action}
Available commands:
- learn enable
- learn disable
- learn status
- learn start
- learn record <input> <output> [tag1,tag2,...]
- learn models`;
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
    
    // Log this action to the workspace
    workspaceService.log(`Auto mode ${newState ? 'enabled' : 'disabled'}`);
    
    return `Autonomous mode ${newState ? 'enabled' : 'disabled'}.`;
  } catch (error) {
    console.error('Error toggling auto mode:', error);
    toast.error('Failed to toggle autonomous mode', {
      description: 'There was an error changing the system mode'
    });
    return 'Error toggling autonomous mode.';
  }
};
