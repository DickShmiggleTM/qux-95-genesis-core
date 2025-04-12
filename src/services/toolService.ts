/**
 * Tool Management Service
 * 
 * This service enables QUX-95 to:
 * 1. Manage and integrate external tools and libraries
 * 2. Create and modify custom tools
 * 3. Automatically import and configure tools based on context
 * 4. Provide tool recommendations for specific tasks
 */

import { toast } from 'sonner';
import { workspaceService } from './workspaceService';
import { ollamaService } from './ollamaService';
import { autonomousService } from './autonomousService';

// Tool types and categories
export enum ToolCategory {
  CODE_ANALYSIS = 'code_analysis',
  CODE_GENERATION = 'code_generation',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  MONITORING = 'monitoring',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  INTEGRATION = 'integration',
  CUSTOM = 'custom'
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  version: string;
  isActive: boolean;
  isCustom: boolean;
  dependencies: string[];
  configuration: Record<string, any>;
  lastUsed: Date | null;
  usageCount: number;
  errorRate: number;
  performanceScore: number;
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  metrics?: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

class ToolService {
  private tools: Map<string, Tool> = new Map();
  private readonly toolsDirectory = 'tools';
  private readonly toolRegistryFile = 'tools/registry.json';
  private readonly toolConfigFile = 'tools/config.json';

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load tool registry
      const registryData = workspaceService.readFile(this.toolRegistryFile);
      if (registryData) {
        const registry = JSON.parse(registryData);
        registry.forEach((tool: Tool) => {
          this.tools.set(tool.id, tool);
        });
      }

      // Initialize directories
      workspaceService.createDirectory(this.toolsDirectory);
      workspaceService.createDirectory(`${this.toolsDirectory}/custom`);
      workspaceService.createDirectory(`${this.toolsDirectory}/config`);

      // Load default tools
      this.loadDefaultTools();

      workspaceService.log('Tool service initialized', 'tools.log');
    } catch (error) {
      console.error('Error initializing tool service:', error);
      workspaceService.log(`Error initializing tool service: ${error}`, 'tools.log');
    }
  }

  private loadDefaultTools(): void {
    const defaultTools: Tool[] = [
      {
        id: 'eslint',
        name: 'ESLint',
        description: 'Static code analysis tool for JavaScript/TypeScript',
        category: ToolCategory.CODE_ANALYSIS,
        version: 'latest',
        isActive: true,
        isCustom: false,
        dependencies: ['@typescript-eslint/parser', '@typescript-eslint/eslint-plugin'],
        configuration: {},
        lastUsed: null,
        usageCount: 0,
        errorRate: 0,
        performanceScore: 0
      },
      {
        id: 'jest',
        name: 'Jest',
        description: 'JavaScript testing framework',
        category: ToolCategory.TESTING,
        version: 'latest',
        isActive: true,
        isCustom: false,
        dependencies: ['@types/jest', 'ts-jest'],
        configuration: {},
        lastUsed: null,
        usageCount: 0,
        errorRate: 0,
        performanceScore: 0
      },
      {
        id: 'webpack',
        name: 'Webpack',
        description: 'Module bundler',
        category: ToolCategory.DEPLOYMENT,
        version: 'latest',
        isActive: true,
        isCustom: false,
        dependencies: ['webpack-cli', 'webpack-dev-server'],
        configuration: {},
        lastUsed: null,
        usageCount: 0,
        errorRate: 0,
        performanceScore: 0
      }
    ];

    defaultTools.forEach(tool => {
      if (!this.tools.has(tool.id)) {
        this.tools.set(tool.id, tool);
      }
    });
  }

  /**
   * Create a new custom tool
   */
  public async createCustomTool(
    name: string,
    description: string,
    category: ToolCategory,
    code: string
  ): Promise<Tool> {
    try {
      const id = `custom_${Date.now()}`;
      const tool: Tool = {
        id,
        name,
        description,
        category,
        version: '1.0.0',
        isActive: true,
        isCustom: true,
        dependencies: [],
        configuration: {},
        lastUsed: null,
        usageCount: 0,
        errorRate: 0,
        performanceScore: 0
      };

      // Save tool code
      workspaceService.writeFile(
        `${this.toolsDirectory}/custom/${id}.ts`,
        code
      );

      // Add to registry
      this.tools.set(id, tool);
      this.saveToolRegistry();

      // Notify autonomous service
      autonomousService.onToolCreated(tool);

      toast.success('Custom tool created', {
        description: `${name} has been added to the tool registry`
      });

      return tool;
    } catch (error) {
      console.error('Error creating custom tool:', error);
      workspaceService.log(`Error creating custom tool: ${error}`, 'tools.log');
      throw error;
    }
  }

  /**
   * Execute a tool
   */
  public async executeTool(
    toolId: string,
    input: any,
    context?: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    try {
      const startTime = Date.now();
      
      // Execute tool based on type
      let result: ToolExecutionResult;
      if (tool.isCustom) {
        result = await this.executeCustomTool(tool, input, context);
      } else {
        result = await this.executeExternalTool(tool, input, context);
      }

      // Update tool metrics
      tool.lastUsed = new Date();
      tool.usageCount++;
      tool.errorRate = (tool.errorRate * (tool.usageCount - 1) + (result.success ? 0 : 1)) / tool.usageCount;
      tool.performanceScore = this.calculatePerformanceScore(tool, result);

      // Save updated registry
      this.saveToolRegistry();

      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolId}:`, error);
      workspaceService.log(`Error executing tool ${toolId}: ${error}`, 'tools.log');
      throw error;
    }
  }

  private async executeCustomTool(
    tool: Tool,
    input: any,
    context?: Record<string, any>
  ): Promise<ToolExecutionResult> {
    try {
      // Load tool code
      const code = workspaceService.readFile(`${this.toolsDirectory}/custom/${tool.id}.ts`);
      if (!code) {
        throw new Error(`Tool code not found for ${tool.id}`);
      }

      // Execute tool in a sandboxed environment
      const result = await this.executeInSandbox(code, input, context);

      return {
        success: true,
        output: result,
        metrics: {
          executionTime: Date.now() - Date.now(),
          memoryUsage: 0,
          cpuUsage: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          executionTime: 0,
          memoryUsage: 0,
          cpuUsage: 0
        }
      };
    }
  }

  private async executeExternalTool(
    tool: Tool,
    input: any,
    context?: Record<string, any>
  ): Promise<ToolExecutionResult> {
    // Implementation for external tools would go here
    // This would involve calling the actual tool's API or CLI
    return {
      success: true,
      output: 'External tool execution result',
      metrics: {
        executionTime: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    };
  }

  private calculatePerformanceScore(tool: Tool, result: ToolExecutionResult): number {
    // Calculate a performance score based on various metrics
    const weights = {
      errorRate: 0.4,
      executionTime: 0.3,
      memoryUsage: 0.2,
      cpuUsage: 0.1
    };

    const normalizedMetrics = {
      errorRate: 1 - tool.errorRate,
      executionTime: result.metrics ? 1 - (result.metrics.executionTime / 1000) : 0,
      memoryUsage: result.metrics ? 1 - (result.metrics.memoryUsage / 1000) : 0,
      cpuUsage: result.metrics ? 1 - (result.metrics.cpuUsage / 100) : 0
    };

    return Object.entries(weights).reduce(
      (score, [metric, weight]) => score + normalizedMetrics[metric as keyof typeof normalizedMetrics] * weight,
      0
    );
  }

  private saveToolRegistry(): void {
    const registry = Array.from(this.tools.values());
    workspaceService.writeFile(
      this.toolRegistryFile,
      JSON.stringify(registry, null, 2)
    );
  }

  private async executeInSandbox(code: string, input: any, context?: Record<string, any>): Promise<any> {
    // In a real implementation, this would use a proper sandboxing mechanism
    // For this demo, we'll use a simple eval with error handling
    try {
      const sandbox = {
        input,
        context,
        console: {
          log: (...args: any[]) => workspaceService.log(args.join(' '), 'tools.log')
        }
      };

      const wrappedCode = `
        (function() {
          ${code}
          return main(input, context);
        })();
      `;

      return eval(wrappedCode);
    } catch (error) {
      console.error('Error in sandbox execution:', error);
      throw error;
    }
  }

  /**
   * Get all available tools
   */
  public getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: ToolCategory): Tool[] {
    return Array.from(this.tools.values())
      .filter(tool => tool.category === category);
  }

  /**
   * Get recommended tools for a specific task
   */
  public async getRecommendedTools(task: string): Promise<Tool[]> {
    try {
      // Use Ollama to analyze the task and recommend tools
      const prompt = `Analyze the following task and recommend the most suitable tools:
Task: ${task}

Available tools:
${Array.from(this.tools.values())
  .map(tool => `- ${tool.name} (${tool.category}): ${tool.description}`)
  .join('\n')}

Recommend the top 3 most suitable tools for this task, considering:
1. Tool category relevance
2. Performance history
3. Error rate
4. Usage frequency

Format the response as a JSON array of tool IDs.`;

      const response = await ollamaService.generateCompletion({
        model: ollamaService.getCurrentModel() || 'llama2:7b',
        prompt,
        options: {
          temperature: 0.3,
          max_tokens: 500
        }
      });

      const recommendedIds = JSON.parse(response);
      return recommendedIds
        .map((id: string) => this.tools.get(id))
        .filter((tool: Tool | undefined) => tool !== undefined) as Tool[];
    } catch (error) {
      console.error('Error getting recommended tools:', error);
      return [];
    }
  }
}

// Create and export singleton instance
export const toolService = new ToolService(); 