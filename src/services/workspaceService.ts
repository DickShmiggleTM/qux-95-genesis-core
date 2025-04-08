
/**
 * AI Workspace Service
 * 
 * Provides functionality for the AI system to read/write files in a dedicated workspace
 * This service manages a sandboxed directory for AI operations.
 */
import { toast } from 'sonner';
import { saveSystem } from './saveSystem';

interface FileStats {
  name: string;
  size: number;
  modified: Date;
  type: 'file' | 'directory';
}

interface WorkspaceFile {
  name: string;
  content: string;
  modified: Date;
}

export interface Workspace {
  files: WorkspaceFile[];
  directories: string[];
  stats: {
    totalFiles: number;
    totalSize: number;
    lastModified: Date | null;
  };
}

class WorkspaceService {
  private workspace: Workspace;
  private readonly workspaceName = 'ai_workspace';
  
  constructor() {
    // Initialize empty workspace
    this.workspace = {
      files: [],
      directories: [this.workspaceName],
      stats: {
        totalFiles: 0,
        totalSize: 0,
        lastModified: null
      }
    };
    
    // Load workspace from saved state if available
    this.loadWorkspace();
  }
  
  /**
   * Load workspace from persistent storage
   */
  private loadWorkspace(): void {
    try {
      const savedState = saveSystem.loadSystemState();
      if (savedState?.workspace) {
        this.workspace = savedState.workspace;
        console.log('Workspace loaded from saved state:', this.workspace);
      } else {
        console.log('No workspace found in saved state, creating new workspace');
        this.initializeWorkspace();
      }
    } catch (error) {
      console.error('Error loading workspace:', error);
      this.initializeWorkspace();
    }
  }
  
  /**
   * Initialize a new workspace with some basic files
   */
  private initializeWorkspace(): void {
    const readmeContent = `# AI Workspace
Created: ${new Date().toISOString()}

This is a sandboxed workspace for AI operations.
Files in this directory are managed by the QUX-95 system.

## Contents
- logs/ - System logs and operation records
- data/ - Training data and learning artifacts
- output/ - Generated content
- configs/ - Configuration files
`;

    const initialFiles = [
      {
        name: `${this.workspaceName}/README.md`,
        content: readmeContent,
        modified: new Date()
      },
      {
        name: `${this.workspaceName}/system.log`,
        content: `[${new Date().toISOString()}] Workspace initialized\n`,
        modified: new Date()
      }
    ];
    
    const initialDirectories = [
      this.workspaceName,
      `${this.workspaceName}/logs`,
      `${this.workspaceName}/data`,
      `${this.workspaceName}/output`,
      `${this.workspaceName}/configs`
    ];
    
    this.workspace = {
      files: initialFiles,
      directories: initialDirectories,
      stats: {
        totalFiles: initialFiles.length,
        totalSize: initialFiles.reduce((size, file) => size + file.content.length, 0),
        lastModified: new Date()
      }
    };
    
    this.saveWorkspace();
  }
  
  /**
   * Save the workspace state
   */
  private saveWorkspace(): void {
    try {
      const systemState = saveSystem.loadSystemState() || {};
      
      saveSystem.saveSystemState({
        ...systemState,
        workspace: this.workspace
      });
      
      this.workspace.stats.lastModified = new Date();
    } catch (error) {
      console.error('Error saving workspace:', error);
    }
  }
  
  /**
   * Write a file to the workspace
   */
  writeFile(path: string, content: string): boolean {
    try {
      // Ensure path starts with workspace name
      if (!path.startsWith(this.workspaceName)) {
        path = `${this.workspaceName}/${path}`;
      }
      
      // Create directories if they don't exist
      const dirPath = path.split('/').slice(0, -1).join('/');
      if (dirPath && !this.workspace.directories.includes(dirPath)) {
        this.createDirectory(dirPath);
      }
      
      // Check if file already exists
      const existingFileIndex = this.workspace.files.findIndex(file => file.name === path);
      
      if (existingFileIndex !== -1) {
        // Update existing file
        this.workspace.files[existingFileIndex] = {
          name: path,
          content,
          modified: new Date()
        };
      } else {
        // Create new file
        this.workspace.files.push({
          name: path,
          content,
          modified: new Date()
        });
      }
      
      // Update stats
      this.workspace.stats.totalFiles = this.workspace.files.length;
      this.workspace.stats.totalSize = this.workspace.files.reduce(
        (size, file) => size + file.content.length, 0
      );
      this.workspace.stats.lastModified = new Date();
      
      this.saveWorkspace();
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      return false;
    }
  }
  
  /**
   * Read a file from the workspace
   */
  readFile(path: string): string | null {
    try {
      // Ensure path starts with workspace name
      if (!path.startsWith(this.workspaceName)) {
        path = `${this.workspaceName}/${path}`;
      }
      
      const file = this.workspace.files.find(file => file.name === path);
      
      if (!file) {
        return null;
      }
      
      return file.content;
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  }
  
  /**
   * Delete a file from the workspace
   */
  deleteFile(path: string): boolean {
    try {
      // Ensure path starts with workspace name
      if (!path.startsWith(this.workspaceName)) {
        path = `${this.workspaceName}/${path}`;
      }
      
      const fileIndex = this.workspace.files.findIndex(file => file.name === path);
      
      if (fileIndex === -1) {
        return false;
      }
      
      this.workspace.files.splice(fileIndex, 1);
      
      // Update stats
      this.workspace.stats.totalFiles = this.workspace.files.length;
      this.workspace.stats.totalSize = this.workspace.files.reduce(
        (size, file) => size + file.content.length, 0
      );
      this.workspace.stats.lastModified = new Date();
      
      this.saveWorkspace();
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }
  
  /**
   * Create a directory in the workspace
   */
  createDirectory(path: string): boolean {
    try {
      // Ensure path starts with workspace name
      if (!path.startsWith(this.workspaceName)) {
        path = `${this.workspaceName}/${path}`;
      }
      
      // Check if directory already exists
      if (this.workspace.directories.includes(path)) {
        return true;
      }
      
      // Create parent directories if they don't exist
      const parts = path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        currentPath = i === 0 ? parts[i] : `${currentPath}/${parts[i]}`;
        
        if (!this.workspace.directories.includes(currentPath)) {
          this.workspace.directories.push(currentPath);
        }
      }
      
      this.saveWorkspace();
      return true;
    } catch (error) {
      console.error('Error creating directory:', error);
      return false;
    }
  }
  
  /**
   * List files in a directory
   */
  listDirectory(path: string = ''): FileStats[] {
    try {
      // Ensure path starts with workspace name
      if (path && !path.startsWith(this.workspaceName)) {
        path = `${this.workspaceName}/${path}`;
      } else if (!path) {
        path = this.workspaceName;
      }
      
      const contents: FileStats[] = [];
      
      // Add subdirectories
      this.workspace.directories.forEach(dir => {
        if (dir !== path && dir.startsWith(path) && !dir.slice(path.length + 1).includes('/')) {
          contents.push({
            name: dir.split('/').pop() || '',
            size: 0,
            modified: this.workspace.stats.lastModified || new Date(),
            type: 'directory'
          });
        }
      });
      
      // Add files
      this.workspace.files.forEach(file => {
        const dirPath = file.name.split('/').slice(0, -1).join('/');
        
        if (dirPath === path) {
          contents.push({
            name: file.name.split('/').pop() || '',
            size: file.content.length,
            modified: file.modified,
            type: 'file'
          });
        }
      });
      
      return contents;
    } catch (error) {
      console.error('Error listing directory:', error);
      return [];
    }
  }
  
  /**
   * Append to a log file
   */
  log(message: string, logFile: string = 'system.log'): void {
    try {
      // Ensure logFile is in the logs directory
      if (!logFile.includes('/')) {
        logFile = `${this.workspaceName}/logs/${logFile}`;
      } else if (!logFile.startsWith(this.workspaceName)) {
        logFile = `${this.workspaceName}/${logFile}`;
      }
      
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      
      const existingContent = this.readFile(logFile) || '';
      this.writeFile(logFile, existingContent + logEntry);
    } catch (error) {
      console.error('Error writing to log:', error);
    }
  }
  
  /**
   * Get workspace statistics
   */
  getStats(): Workspace['stats'] {
    return { ...this.workspace.stats };
  }
  
  /**
   * Get the entire workspace structure
   */
  getWorkspace(): Workspace {
    return { ...this.workspace };
  }
}

export const workspaceService = new WorkspaceService();
