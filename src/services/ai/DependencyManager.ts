import { v4 as uuidv4 } from 'uuid';
import { selfImprovingAgent, CodeChange } from './SelfImprovingAgent';
import { ollamaService } from '@/services/ollama';
import { aiServiceUtils } from './AIServiceUtils';

export interface Dependency {
  id: string;
  name: string;
  version: string;
  packageType: 'npm' | 'pip' | 'other';
  isDevDependency: boolean;
  usageCount: number;
  importedBy: string[];
  lastUpdated: Date;
  availableUpdate?: {
    version: string;
    releaseDate: Date;
    breaking: boolean;
    releaseNotes?: string;
  };
}

export interface DependencyChangeRequest {
  id: string;
  dependencyId: string;
  requestType: 'install' | 'update' | 'remove';
  targetVersion?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  created: Date;
  completed?: Date;
  codeChanges: CodeChange[];
}

export interface DependencyGraph {
  nodes: { id: string; name: string; version: string }[];
  edges: { source: string; target: string; type: 'uses' | 'requires' | 'conflicts' }[];
}

class DependencyManager {
  private static instance: DependencyManager;
  private dependencies: Map<string, Dependency> = new Map();
  private dependencyChanges: DependencyChangeRequest[] = [];
  private dependencyGraph: DependencyGraph = { nodes: [], edges: [] };
  private changeListeners: ((change: DependencyChangeRequest) => void)[] = [];

  private constructor() {
    // Listen for code changes that might affect dependencies
    selfImprovingAgent.onCodeChange(this.handleCodeChange.bind(this));
  }

  public static getInstance(): DependencyManager {
    if (!DependencyManager.instance) {
      DependencyManager.instance = new DependencyManager();
    }
    return DependencyManager.instance;
  }

  /**
   * Scans the project for dependencies
   */
  public async scanProjectDependencies(): Promise<Dependency[]> {
    console.log('Scanning project dependencies...');
    
    // In a real implementation, this would:
    // 1. Parse package.json for npm dependencies
    // 2. Parse requirements.txt for Python dependencies
    // 3. Analyze imports in code files
    
    // Simulate scanning dependencies
    await this.simulateDependencyScan();
    
    return Array.from(this.dependencies.values());
  }

  /**
   * Checks for available dependency updates
   */
  public async checkForUpdates(): Promise<Dependency[]> {
    console.log('Checking for dependency updates...');
    
    // In a real implementation, this would:
    // 1. Query npm registry for latest versions
    // 2. Query PyPI for latest versions
    // 3. Compare with current versions
    
    const dependenciesWithUpdates: Dependency[] = [];
    
    // Simulate checking for updates
    for (const [id, dependency] of this.dependencies.entries()) {
      if (Math.random() < 0.3) { // 30% chance of having an update
        const updatedDep = { ...dependency };
        
        // Generate a simulated newer version
        const versionParts = dependency.version.split('.');
        const lastPart = parseInt(versionParts[versionParts.length - 1]);
        versionParts[versionParts.length - 1] = (lastPart + 1).toString();
        const newVersion = versionParts.join('.');
        
        // Create update information
        updatedDep.availableUpdate = {
          version: newVersion,
          releaseDate: new Date(),
          breaking: Math.random() < 0.1, // 10% chance of breaking change
          releaseNotes: `Release ${newVersion} includes performance improvements and bug fixes.`
        };
        
        this.dependencies.set(id, updatedDep);
        dependenciesWithUpdates.push(updatedDep);
      }
    }
    
    return dependenciesWithUpdates;
  }

  /**
   * Creates a request to install a new dependency
   */
  public async requestDependencyInstall(
    name: string,
    version: string,
    packageType: 'npm' | 'pip' | 'other' = 'npm',
    isDevDependency = false,
    reason = 'Required for new feature'
  ): Promise<DependencyChangeRequest> {
    const dependencyId = uuidv4();
    const requestId = uuidv4();
    
    // Create a new dependency object
    const dependency: Dependency = {
      id: dependencyId,
      name,
      version,
      packageType,
      isDevDependency,
      usageCount: 0,
      importedBy: [],
      lastUpdated: new Date()
    };
    
    // Store the dependency
    this.dependencies.set(dependencyId, dependency);
    
    // Create the change request
    const changeRequest: DependencyChangeRequest = {
      id: requestId,
      dependencyId,
      requestType: 'install',
      targetVersion: version,
      reason,
      status: 'pending',
      created: new Date(),
      codeChanges: []
    };
    
    // Add to the list of changes
    this.dependencyChanges.push(changeRequest);
    
    // Notify listeners
    this.notifyChangeListeners(changeRequest);
    
    return changeRequest;
  }

  /**
   * Creates a request to update a dependency
   */
  public async requestDependencyUpdate(
    dependencyId: string,
    targetVersion: string,
    reason = 'Update to latest version'
  ): Promise<DependencyChangeRequest> {
    const dependency = this.dependencies.get(dependencyId);
    if (!dependency) {
      throw new Error(`Dependency with ID ${dependencyId} not found`);
    }
    
    const requestId = uuidv4();
    
    // Create the change request
    const changeRequest: DependencyChangeRequest = {
      id: requestId,
      dependencyId,
      requestType: 'update',
      targetVersion,
      reason,
      status: 'pending',
      created: new Date(),
      codeChanges: []
    };
    
    // Add to the list of changes
    this.dependencyChanges.push(changeRequest);
    
    // Notify listeners
    this.notifyChangeListeners(changeRequest);
    
    return changeRequest;
  }

  /**
   * Creates a request to remove a dependency
   */
  public async requestDependencyRemoval(
    dependencyId: string,
    reason = 'No longer needed'
  ): Promise<DependencyChangeRequest> {
    const dependency = this.dependencies.get(dependencyId);
    if (!dependency) {
      throw new Error(`Dependency with ID ${dependencyId} not found`);
    }
    
    const requestId = uuidv4();
    
    // Create the change request
    const changeRequest: DependencyChangeRequest = {
      id: requestId,
      dependencyId,
      requestType: 'remove',
      reason,
      status: 'pending',
      created: new Date(),
      codeChanges: []
    };
    
    // Add to the list of changes
    this.dependencyChanges.push(changeRequest);
    
    // Notify listeners
    this.notifyChangeListeners(changeRequest);
    
    return changeRequest;
  }

  /**
   * Executes a dependency change request
   */
  public async executeDependencyChange(requestId: string): Promise<DependencyChangeRequest> {
    const request = this.dependencyChanges.find(r => r.id === requestId);
    if (!request) {
      throw new Error(`Dependency change request with ID ${requestId} not found`);
    }
    
    if (request.status !== 'approved' && request.status !== 'pending') {
      throw new Error(`Dependency change request is not in a valid state for execution: ${request.status}`);
    }
    
    console.log(`Executing dependency change: ${request.requestType} ${request.dependencyId}`);
    
    try {
      // Get the dependency
      const dependency = this.dependencies.get(request.dependencyId);
      if (!dependency) {
        throw new Error(`Dependency with ID ${request.dependencyId} not found`);
      }
      
      // Execute the appropriate command based on the request type
      let successMessage = '';
      let command = '';
      
      switch (request.requestType) {
        case 'install':
          if (dependency.packageType === 'npm') {
            command = `npm install ${dependency.isDevDependency ? '--save-dev ' : ''}${dependency.name}${request.targetVersion ? `@${request.targetVersion}` : ''}`;
          } else if (dependency.packageType === 'pip') {
            command = `pip install ${dependency.name}${request.targetVersion ? `==${request.targetVersion}` : ''}`;
          }
          successMessage = `Installed ${dependency.name}${request.targetVersion ? ` version ${request.targetVersion}` : ''}`;
          break;
          
        case 'update':
          if (dependency.packageType === 'npm') {
            command = `npm install ${dependency.name}@${request.targetVersion}`;
          } else if (dependency.packageType === 'pip') {
            command = `pip install --upgrade ${dependency.name}==${request.targetVersion}`;
          }
          successMessage = `Updated ${dependency.name} to version ${request.targetVersion}`;
          break;
          
        case 'remove':
          if (dependency.packageType === 'npm') {
            command = `npm uninstall ${dependency.name}`;
          } else if (dependency.packageType === 'pip') {
            command = `pip uninstall -y ${dependency.name}`;
          }
          successMessage = `Removed ${dependency.name}`;
          break;
      }
      
      // Execute the command (simulated here)
      console.log(`Executing command: ${command}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update dependency information
      if (request.requestType === 'install' || request.requestType === 'update') {
        const updatedDependency = { ...dependency };
        if (request.targetVersion) {
          updatedDependency.version = request.targetVersion;
        }
        updatedDependency.lastUpdated = new Date();
        this.dependencies.set(dependency.id, updatedDependency);
      } else if (request.requestType === 'remove') {
        this.dependencies.delete(dependency.id);
      }
      
      // Create a code change record
      const codeChange: CodeChange = await selfImprovingAgent.createCodeChange(
        successMessage,
        dependency.packageType === 'npm' ? 'package.json' : 'requirements.txt',
        request.requestType === 'remove' ? 'remove' : 'modify',
        undefined,
        undefined,
        { dependencyChange: request }
      );
      
      // Update the request
      request.status = 'completed';
      request.completed = new Date();
      request.codeChanges.push(codeChange);
      
      // If we need to update imports or code that uses this dependency,
      // analyze the code and create additional change requests
      if (request.requestType === 'update' && dependency.availableUpdate?.breaking) {
        await this.handleBreakingChanges(dependency, request.targetVersion!);
      }
      
      // Notify listeners
      this.notifyChangeListeners(request);
      
      return request;
    } catch (error) {
      console.error('Error executing dependency change:', error);
      
      // Update the request status
      request.status = 'failed';
      
      // Notify listeners
      this.notifyChangeListeners(request);
      
      throw error;
    }
  }

  /**
   * Registers a listener for dependency changes
   */
  public onDependencyChange(listener: (change: DependencyChangeRequest) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Gets a list of all dependencies
   */
  public getAllDependencies(): Dependency[] {
    return Array.from(this.dependencies.values());
  }

  /**
   * Gets a list of all dependency change requests
   */
  public getAllDependencyChangeRequests(): DependencyChangeRequest[] {
    return [...this.dependencyChanges];
  }

  /**
   * Gets the dependency graph
   */
  public getDependencyGraph(): DependencyGraph {
    return { ...this.dependencyGraph };
  }

  // Private methods

  /**
   * Handles breaking changes in dependency updates
   */
  private async handleBreakingChanges(
    dependency: Dependency,
    newVersion: string
  ): Promise<void> {
    console.log(`Handling breaking changes for update to ${dependency.name}@${newVersion}`);
    
    // In a real implementation, this would:
    // 1. Analyze affected code files
    // 2. Generate change proposals to adapt to the breaking changes
    // 3. Create code change requests
    
    // Get the potentially affected files
    const affectedFiles = dependency.importedBy;
    
    if (affectedFiles.length === 0) {
      console.log('No affected files found');
      return;
    }
    
    // Use LLM to generate adaptation plan
    const prompt = `
    You are helping to adapt code to a breaking change in a dependency.
    
    Dependency: ${dependency.name}
    Current version: ${dependency.version}
    New version: ${newVersion}
    
    The following files import this dependency:
    ${affectedFiles.join('\n')}
    
    Generate a plan to adapt the code to the breaking changes. Be specific about what changes need to be made in each file.
    `;
    
    try {
      const adaptationPlan = await aiServiceUtils.generateChat('codellama', [
        { role: 'system', content: 'You are a programming assistant that helps adapt code to breaking changes in dependencies.' },
        { role: 'user', content: prompt }
      ]);
      
      console.log('Generated adaptation plan for breaking changes:', adaptationPlan);
      
      // TODO: In a real implementation, parse this plan and create code change requests
    } catch (error) {
      console.error('Failed to generate adaptation plan:', error);
    }
  }

  /**
   * Handles code changes that might affect dependencies
   */
  private handleCodeChange(change: CodeChange): void {
    // Only process changes to specific files
    if (
      change.fileModified === 'package.json' ||
      change.fileModified === 'requirements.txt'
    ) {
      console.log(`Dependency-related file changed: ${change.fileModified}`);
      
      // In a real implementation, this would parse the file and update the dependency information
      this.scanProjectDependencies().catch(error => {
        console.error('Error rescanning dependencies after file change:', error);
      });
    }
  }

  /**
   * Notifies all registered change listeners
   */
  private notifyChangeListeners(change: DependencyChangeRequest): void {
    for (const listener of this.changeListeners) {
      try {
        listener(change);
      } catch (error) {
        console.error('Error in dependency change listener:', error);
      }
    }
  }

  /**
   * Simulates scanning dependencies
   */
  private async simulateDependencyScan(): Promise<void> {
    // Create some simulated dependencies
    const npmDependencies = [
      { name: 'react', version: '18.2.0', dev: false },
      { name: 'next', version: '14.0.3', dev: false },
      { name: 'tailwindcss', version: '3.3.0', dev: true },
      { name: 'typescript', version: '5.0.4', dev: true },
      { name: '@radix-ui/react-dialog', version: '1.0.4', dev: false },
      { name: 'lucide-react', version: '0.294.0', dev: false },
      { name: 'uuid', version: '9.0.1', dev: false }
    ];
    
    const pipDependencies = [
      { name: 'numpy', version: '1.24.3', dev: false },
      { name: 'pandas', version: '2.0.3', dev: false },
      { name: 'transformers', version: '4.35.2', dev: false },
      { name: 'pytest', version: '7.4.0', dev: true }
    ];
    
    // Clear the current dependencies
    this.dependencies.clear();
    
    // Add the npm dependencies
    for (const dep of npmDependencies) {
      const id = uuidv4();
      this.dependencies.set(id, {
        id,
        name: dep.name,
        version: dep.version,
        packageType: 'npm',
        isDevDependency: dep.dev,
        usageCount: Math.floor(Math.random() * 20) + 1, // Random usage count 1-20
        importedBy: this.generateRandomImportFiles(dep.name, 'npm'),
        lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in the last 30 days
      });
    }
    
    // Add the pip dependencies
    for (const dep of pipDependencies) {
      const id = uuidv4();
      this.dependencies.set(id, {
        id,
        name: dep.name,
        version: dep.version,
        packageType: 'pip',
        isDevDependency: dep.dev,
        usageCount: Math.floor(Math.random() * 20) + 1, // Random usage count 1-20
        importedBy: this.generateRandomImportFiles(dep.name, 'pip'),
        lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in the last 30 days
      });
    }
    
    // Generate a dependency graph
    this.generateDependencyGraph();
  }

  /**
   * Generates random import files for a simulated dependency
   */
  private generateRandomImportFiles(dependencyName: string, packageType: 'npm' | 'pip'): string[] {
    const importFiles: string[] = [];
    const importCount = Math.floor(Math.random() * 5) + 1; // Random number of imports 1-5
    
    const extensions = packageType === 'npm' 
      ? ['.ts', '.tsx', '.js', '.jsx']
      : ['.py'];
    
    for (let i = 0; i < importCount; i++) {
      const extension = extensions[Math.floor(Math.random() * extensions.length)];
      let filePath: string;
      
      // Generate a realistic file path
      switch (Math.floor(Math.random() * 4)) {
        case 0:
          filePath = `src/components/${this.getRandomComponent()}${extension}`;
          break;
        case 1:
          filePath = `src/services/${this.getRandomService()}${extension}`;
          break;
        case 2:
          filePath = `src/utils/${this.getRandomUtility()}${extension}`;
          break;
        default:
          filePath = `src/pages/${this.getRandomPage()}${extension}`;
      }
      
      importFiles.push(filePath);
    }
    
    return importFiles;
  }

  /**
   * Generates a random component name for simulation
   */
  private getRandomComponent(): string {
    const components = [
      'Button', 'Card', 'Dropdown', 'Modal', 'Navbar',
      'Sidebar', 'Table', 'Form', 'Input', 'Header'
    ];
    return components[Math.floor(Math.random() * components.length)];
  }

  /**
   * Generates a random service name for simulation
   */
  private getRandomService(): string {
    const services = [
      'api', 'auth', 'data', 'storage', 'analytics',
      'notifications', 'user', 'chat', 'settings', 'search'
    ];
    return services[Math.floor(Math.random() * services.length)];
  }

  /**
   * Generates a random utility name for simulation
   */
  private getRandomUtility(): string {
    const utilities = [
      'formatter', 'validation', 'helpers', 'constants', 'logger',
      'date', 'string', 'array', 'object', 'math'
    ];
    return utilities[Math.floor(Math.random() * utilities.length)];
  }

  /**
   * Generates a random page name for simulation
   */
  private getRandomPage(): string {
    const pages = [
      'index', 'about', 'contact', 'dashboard', 'profile',
      'settings', 'login', 'register', 'products', 'blog'
    ];
    return pages[Math.floor(Math.random() * pages.length)];
  }

  /**
   * Generates a simulated dependency graph
   */
  private generateDependencyGraph(): void {
    const nodes: DependencyGraph['nodes'] = [];
    const edges: DependencyGraph['edges'] = [];
    
    // Create nodes for each dependency
    for (const [id, dependency] of this.dependencies) {
      nodes.push({
        id,
        name: dependency.name,
        version: dependency.version
      });
    }
    
    // Create edges between dependencies (simulated relationships)
    const dependencies = Array.from(this.dependencies.values());
    for (let i = 0; i < dependencies.length; i++) {
      const source = dependencies[i].id;
      
      // Each dependency might depend on 0-3 other dependencies
      const dependencyCount = Math.floor(Math.random() * 4);
      for (let j = 0; j < dependencyCount; j++) {
        // Pick a random target dependency that's not itself
        let targetIndex = Math.floor(Math.random() * dependencies.length);
        if (targetIndex === i) {
          targetIndex = (targetIndex + 1) % dependencies.length;
        }
        const target = dependencies[targetIndex].id;
        
        // Determine the type of relationship
        const relationshipType: 'uses' | 'requires' | 'conflicts' = Math.random() < 0.1
          ? 'conflicts'
          : (Math.random() < 0.7 ? 'requires' : 'uses');
        
        edges.push({ source, target, type: relationshipType });
      }
    }
    
    this.dependencyGraph = { nodes, edges };
  }
}

export const dependencyManager = DependencyManager.getInstance();
export default dependencyManager;
