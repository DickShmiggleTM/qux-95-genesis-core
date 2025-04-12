/**
 * Autonomous Self-Coding & Self-Modification Service
 * 
 * This service enables QUX-95 to:
 * 1. Detect code quality or performance issues at runtime
 * 2. Automatically generate, review, and apply patch PRs via GitHub's API
 * 3. Execute terminal commands programmatically as part of its self-improvement loop
 */

import { toast } from 'sonner';
import { ollamaService } from './ollamaService';
import { githubService } from './githubService';
import { workspaceService } from './workspaceService';
import { execSync } from 'child_process'; // This would be used in a Node.js environment
import { toolService, Tool, ToolExecutionResult } from './toolService';

// Issue detection types
export enum IssueType {
  PERFORMANCE = 'performance',
  MEMORY_USAGE = 'memory_usage',
  ERROR_HANDLING = 'error_handling',
  SECURITY = 'security',
  CODE_QUALITY = 'code_quality',
  TEST_COVERAGE = 'test_coverage'
}

export interface CodeIssue {
  id: string;
  type: IssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  files: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface CodeMetrics {
  complexity: number;
  maintainability: number;
  testCoverage: number;
  performance: number;
}

export interface CodeAnalysisResult {
  issues: CodeIssue[];
  metrics: CodeMetrics;
  timestamp: Date;
}

export interface DetectedIssue {
  id: string;
  type: IssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  files: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  patchPR?: {
    url: string;
    number: number;
    status: 'open' | 'merged' | 'closed';
  };
  performance?: {
    before?: number;
    after?: number;
    improvement?: string;
  };
}

export interface ModificationResult {
  success: boolean;
  message: string;
  prUrl?: string;
  commitHash?: string;
}

export interface SelfImprovementRecord {
  timestamp: Date;
  toolId: string;
  improvement: string;
  priority: number;
  status: 'pending' | 'completed' | 'failed';
  implementationSteps: string[];
  error?: string;
}

// Main service
export class AutonomousService {
  private isActive: boolean = false;
  private detectedIssues: DetectedIssue[] = [];
  private modificationHistory: ModificationResult[] = [];
  private readonly issueDetectionInterval: number = 3600000; // 1 hour in ms
  private intervalId: number | null = null;
  private readonly maxIssuesToFix: number = 5; // Max number of issues to fix automatically per run
  private autonomyLevel: number = 1; // 1=monitor only, 2=suggest, 3=fix with approval, 4=fix automatically
  private readonly allowedCommands: string[] = ['npm run lint', 'npm run test', 'npm run build', 'git status'];
  private worker: Worker | null = null;
  private selfImprovementHistory: SelfImprovementRecord[] = [];
  private readonly improvementHistoryFile = 'autonomous/improvement_history.json';

  constructor() {
    // Load previously detected issues
    this.loadState();
    this.initializeWorker();
    this.loadImprovementHistory();
  }

  private initializeWorker(): void {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./autonomousWorker.ts', import.meta.url));
      
      this.worker.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'ANALYSIS_COMPLETE':
            this.handleAnalysisResults(data);
            break;
          case 'FIX_COMPLETE':
            this.handleFixResults(data);
            break;
          case 'ERROR':
            console.error('Worker error:', data);
            workspaceService.log(`Worker error: ${data}`, 'autonomous.log');
            break;
        }
      };
    }
  }

  private handleAnalysisResults(results: CodeAnalysisResult): void {
    if (results.issues.length > 0) {
      this.mergeDetectedIssues(results.issues);
      this.saveState();
      
      if (this.autonomyLevel === 1) {
        toast.info('Code issues detected', {
          description: `Found ${results.issues.length} issues during code analysis`
        });
      } else if (this.autonomyLevel >= 2) {
        const fixableIssues = results.issues.filter(issue => 
          !issue.resolvedAt && 
          (issue.severity === 'high' || issue.severity === 'critical')
        );
        
        if (fixableIssues.length > 0) {
          if (this.autonomyLevel === 2) {
            toast.warning('Critical code issues detected', {
              description: `${fixableIssues.length} issues need attention`
            });
          } else {
            const issuesToFix = fixableIssues.slice(0, this.maxIssuesToFix);
            this.worker?.postMessage({
              type: 'FIX_ISSUES',
              data: {
                issues: issuesToFix,
                autonomyLevel: this.autonomyLevel
              }
            });
          }
        }
      }
    }
  }

  private handleFixResults(results: ModificationResult[]): void {
    this.modificationHistory.push(...results);
    this.saveState();
    
    results.forEach(result => {
      if (result.success) {
        toast.success('Issue fixed', {
          description: result.message
        });
      } else {
        toast.error('Fix failed', {
          description: result.message
        });
      }
    });
  }

  /**
   * Load previous state from workspace
   */
  private loadState(): void {
    try {
      const issuesData = workspaceService.readFile('autonomous/detected_issues.json');
      const historyData = workspaceService.readFile('autonomous/modification_history.json');
      
      if (issuesData) {
        this.detectedIssues = JSON.parse(issuesData);
      }
      
      if (historyData) {
        this.modificationHistory = JSON.parse(historyData);
      }
      
      workspaceService.log('Autonomous service state loaded', 'autonomous.log');
    } catch (error) {
      console.error('Error loading autonomous service state:', error);
      workspaceService.log(`Error loading autonomous service state: ${error}`, 'autonomous.log');
      
      // Initialize directories if not present
      workspaceService.createDirectory('autonomous');
      workspaceService.createDirectory('autonomous/patches');
      workspaceService.createDirectory('autonomous/analysis');
    }
  }

  /**
   * Save current state to workspace
   */
  private saveState(): void {
    try {
      workspaceService.writeFile(
        'autonomous/detected_issues.json', 
        JSON.stringify(this.detectedIssues, null, 2)
      );
      
      workspaceService.writeFile(
        'autonomous/modification_history.json', 
        JSON.stringify(this.modificationHistory, null, 2)
      );
      
      workspaceService.log('Autonomous service state saved', 'autonomous.log');
    } catch (error) {
      console.error('Error saving autonomous service state:', error);
      workspaceService.log(`Error saving autonomous service state: ${error}`, 'autonomous.log');
    }
  }

  /**
   * Start autonomous monitoring and self-improvement
   */
  public start(autonomyLevel: number = 1): boolean {
    if (this.isActive) {
      workspaceService.log('Autonomous service is already active', 'autonomous.log');
      return false;
    }
    
    this.isActive = true;
    this.autonomyLevel = Math.min(Math.max(autonomyLevel, 1), 4); // Ensure value is between 1-4
    
    // Start monitoring interval
    this.intervalId = window.setInterval(() => {
      if (this.worker) {
        this.worker.postMessage({
          type: 'ANALYZE_CODEBASE',
          data: { autonomyLevel: this.autonomyLevel }
        });
      } else {
        this.runDetectionCycle();
      }
    }, this.issueDetectionInterval);
    
    // Immediately run first detection
    setTimeout(() => {
      if (this.worker) {
        this.worker.postMessage({
          type: 'ANALYZE_CODEBASE',
          data: { autonomyLevel: this.autonomyLevel }
        });
      } else {
        this.runDetectionCycle();
      }
    }, 5000);
    
    const message = `Autonomous self-modification activated at level ${this.autonomyLevel}`;
    toast.success('Self-improvement activated', {
      description: message
    });
    
    workspaceService.log(message, 'autonomous.log');
    return true;
  }

  /**
   * Stop autonomous monitoring and self-improvement
   */
  public stop(): boolean {
    if (!this.isActive) {
      return false;
    }
    
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.worker) {
      this.worker.terminate();
      this.initializeWorker();
    }
    
    this.isActive = false;
    
    const message = 'Autonomous self-modification deactivated';
    toast.info('Self-improvement deactivated', {
      description: 'Autonomous monitoring has been stopped'
    });
    
    workspaceService.log(message, 'autonomous.log');
    return true;
  }

  /**
   * Run a complete detection and modification cycle
   */
  private async runDetectionCycle(): Promise<void> {
    if (!this.isActive) {
      return;
    }
    
    try {
      // Log start of cycle
      const cycleStartMessage = 'Starting autonomous code quality detection cycle';
      workspaceService.log(cycleStartMessage, 'autonomous.log');
      
      // Execute pre-analysis commands (e.g., running linters)
      if (this.autonomyLevel >= 2) {
        await this.executeCommand('npm run lint', 'Running code linters before analysis');
      }
      
      // Analyze codebase for issues
      const analysisResult = await this.analyzeCodebase();
      
      // Save analysis results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      workspaceService.writeFile(
        `autonomous/analysis/code_analysis_${timestamp}.json`,
        JSON.stringify(analysisResult, null, 2)
      );
      
      // Handle detected issues based on autonomy level
      if (analysisResult.issues.length > 0) {
        // Update stored issues
        this.mergeDetectedIssues(analysisResult.issues);
        
        // Save updated state
        this.saveState();
        
        // Log and display notification
        const message = `Detected ${analysisResult.issues.length} code issues during analysis`;
        workspaceService.log(message, 'autonomous.log');
        
        if (this.autonomyLevel === 1) {
          // Monitor only - just log the issues
          toast.info('Code issues detected', {
            description: `Found ${analysisResult.issues.length} issues during code analysis`
          });
        } else if (this.autonomyLevel >= 2) {
          // Suggest fixes or auto-fix
          const fixableIssues = analysisResult.issues.filter(issue => 
            !issue.resolvedAt && 
            (issue.severity === 'high' || issue.severity === 'critical')
          );
          
          if (fixableIssues.length > 0) {
            if (this.autonomyLevel === 2) {
              // Suggest fixes
              toast.warning('Critical code issues detected', {
                description: `${fixableIssues.length} issues need attention`
              });
            } else {
              // Auto-fix (level 3 or 4)
              const issuesToFix = fixableIssues.slice(0, this.maxIssuesToFix);
              await this.fixDetectedIssues(issuesToFix);
            }
          }
        }
      } else {
        workspaceService.log('No issues detected during code analysis', 'autonomous.log');
      }
      
      // Log end of cycle
      workspaceService.log('Completed autonomous code quality detection cycle', 'autonomous.log');
    } catch (error) {
      console.error('Error during autonomous detection cycle:', error);
      workspaceService.log(`Error during autonomous detection: ${error}`, 'autonomous.log');
      
      toast.error('Self-improvement error', {
        description: 'Error during autonomous code analysis'
      });
    }
  }

  /**
   * Analyze codebase for issues
   */
  private async analyzeCodebase(): Promise<CodeAnalysisResult> {
    try {
      // Get recommended tools for code analysis
      const recommendedTools = await this.getAvailableTools();
      
      // Execute analysis using recommended tools
      const analysisResults = await Promise.all(
        recommendedTools.map(tool => 
          this.executeTool(tool, {
            codebase: workspaceService.getWorkspace()
          })
        )
      );

      // Combine and process results
      const combinedResults = this.processAnalysisResults(analysisResults);
      
      return combinedResults;
    } catch (error) {
      console.error('Error analyzing codebase:', error);
      workspaceService.log(`Error analyzing codebase: ${error}`, 'autonomous.log');
      throw error;
    }
  }
  
  private processAnalysisResults(results: ToolExecutionResult[]): CodeAnalysisResult {
    // Process and combine results from multiple tools
    const issues: CodeIssue[] = [];
    const metrics: CodeMetrics = {
      complexity: 0,
      maintainability: 0,
      testCoverage: 0,
      performance: 0
    };

    results.forEach(result => {
      if (result.success && result.output) {
        const toolResult = JSON.parse(result.output);
        if (toolResult.issues) {
          issues.push(...toolResult.issues);
        }
        if (toolResult.metrics) {
          Object.assign(metrics, toolResult.metrics);
        }
      }
    });

    return {
      issues,
      metrics,
      timestamp: new Date()
    };
  }
  
  /**
   * Merge newly detected issues with existing ones
   */
  private mergeDetectedIssues(newIssues: DetectedIssue[]): void {
    // For each new issue, check if it already exists
    newIssues.forEach(newIssue => {
      const existingIndex = this.detectedIssues.findIndex(
        issue => issue.description === newIssue.description
      );
      
      if (existingIndex === -1) {
        // Add new issue
        this.detectedIssues.push(newIssue);
      } else {
        // Update existing issue if not yet resolved
        if (!this.detectedIssues[existingIndex].resolvedAt) {
          this.detectedIssues[existingIndex] = {
            ...this.detectedIssues[existingIndex],
            severity: newIssue.severity,
            detectedAt: new Date()
          };
        }
      }
    });
    
    // Sort issues by severity (critical first)
    const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    this.detectedIssues.sort((a, b) => {
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Fix detected issues automatically
   */
  private async fixDetectedIssues(issues: DetectedIssue[]): Promise<void> {
    if (issues.length === 0) {
      return;
    }
    
    try {
      // Log start of fix process
      workspaceService.log(`Attempting to fix ${issues.length} issues automatically`, 'autonomous.log');
      
      // Group issues by file for more efficient fixing
      const issuesByFile = this.groupIssuesByFile(issues);
      
      // Prepare modifications
      const filesWithModifications: { path: string, content: string }[] = [];
      
      // For each file, generate fixes
      for (const [file, fileIssues] of Object.entries(issuesByFile)) {
        // Generate fixes using Ollama
        const fixedContent = await this.generateFixForFile(file, fileIssues);
        
        if (fixedContent) {
          filesWithModifications.push({
            path: file,
            content: fixedContent
          });
        }
      }
      
      // If we have fixes, create PR or apply directly
      if (filesWithModifications.length > 0) {
        // Create a PR description based on the issues being fixed
        const description = this.generatePRDescription(issues);
        
        // Apply the changes
        let result: ModificationResult;
        
        if (this.autonomyLevel === 3) {
          // Create PR for approval
          const prResult = await githubService.createSelfModificationPR(
            description,
            filesWithModifications
          );
          
          result = {
            success: prResult.success,
            message: prResult.success ? 'Successfully created PR with fixes' : `PR creation failed: ${prResult.error}`,
            prUrl: prResult.prUrl
          };
          
          // Update issues with PR info if successful
          if (prResult.success && prResult.prUrl) {
            const prNumber = parseInt(prResult.prUrl.split('/').pop() || '0');
            
            issues.forEach(issue => {
              const existingIssue = this.detectedIssues.find(i => i.id === issue.id);
              if (existingIssue) {
                existingIssue.patchPR = {
                  url: prResult.prUrl!,
                  number: prNumber,
                  status: 'open'
                };
              }
            });
          }
          
          // Notify user
          toast.success('Auto-fix PR created', {
            description: `Created PR with fixes for ${issues.length} issues`
          });
        } else {
          // Apply directly (level 4)
          const applyResult = await githubService.applySelfModification(
            description,
            filesWithModifications
          );
          
          result = {
            success: applyResult.success,
            message: applyResult.success ? 'Successfully applied fixes directly' : `Direct fixes failed: ${applyResult.error}`,
            commitHash: applyResult.commitHash
          };
          
          // Update issues as resolved if successful
          if (applyResult.success) {
            issues.forEach(issue => {
              const existingIssue = this.detectedIssues.find(i => i.id === issue.id);
              if (existingIssue) {
                existingIssue.resolvedAt = new Date();
              }
            });
          }
          
          // Notify user
          toast.success('Auto-fix applied', {
            description: `Applied fixes for ${issues.length} issues`
          });
        }
        
        // Save the modification result
        this.modificationHistory.push({
          ...result,
          success: result.success,
          message: `${result.message} (fixed ${issues.length} issues)`
        });
        
        // Save state
        this.saveState();
        
        // Run tests if configured to do so
        if (result.success && this.autonomyLevel >= 3) {
          await this.executeCommand('npm run test', 'Running tests after applying fixes');
        }
        
        // Log completion
        workspaceService.log(`Completed fix process: ${result.message}`, 'autonomous.log');
      } else {
        workspaceService.log('No fixes were generated for the detected issues', 'autonomous.log');
      }
    } catch (error) {
      console.error('Error fixing detected issues:', error);
      workspaceService.log(`Error fixing detected issues: ${error}`, 'autonomous.log');
      
      toast.error('Auto-fix failed', {
        description: 'Failed to generate or apply fixes'
      });
    }
  }
  
  /**
   * Group issues by file for more efficient fixing
   */
  private groupIssuesByFile(issues: DetectedIssue[]): Record<string, DetectedIssue[]> {
    const result: Record<string, DetectedIssue[]> = {};
    
    issues.forEach(issue => {
      issue.files.forEach(file => {
        if (!result[file]) {
          result[file] = [];
        }
        result[file].push(issue);
      });
    });
    
    return result;
  }
  
  /**
   * Generate a fixed version of a file based on its issues
   */
  private async generateFixForFile(filePath: string, issues: DetectedIssue[]): Promise<string | null> {
    try {
      // In a real implementation, we would read the actual file content
      // For this demo, we'll simulate having the file content
      
      // Sample/synthetic file content as a placeholder
      const simulatedFileContent = `
// This is a simulated file content for ${filePath}
import React, { useState, useEffect } from 'react';

const Component = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // This is where the issue might be
    const interval = setInterval(() => {
      // Do something periodically
    }, 1000);
    
    // Missing cleanup
  }, []);
  
  return <div>Component content</div>;
};

export default Component;
`;
      
      // Generate a prompt for fixing the issues
      const fixPrompt = `
You are an expert TypeScript and React developer tasked with fixing the following issues in ${filePath}:

${issues.map(issue => `- ${issue.severity.toUpperCase()}: ${issue.description}`).join('\n')}

Here is the current file content:

\`\`\`typescript
${simulatedFileContent}
\`\`\`

Please provide a corrected version of the file that fixes all the issues. Return ONLY the complete fixed file content, nothing else.
`;

      // Generate fixed content using Ollama
      const fixedContent = await ollamaService.generateCompletion({
        model: ollamaService.getCurrentModel() || 'llama2:7b',
        prompt: fixPrompt,
        options: {
          temperature: 0.1,
          max_tokens: 2000
        }
      });
      
      // In a real implementation, we would validate the output
      
      // Log fix generation
      workspaceService.log(`Generated fixes for ${filePath} addressing ${issues.length} issues`, 'autonomous.log');
      
      return fixedContent;
    } catch (error) {
      console.error(`Error generating fix for ${filePath}:`, error);
      workspaceService.log(`Error generating fix for ${filePath}: ${error}`, 'autonomous.log');
      return null;
    }
  }
  
  /**
   * Generate a PR description based on the issues being fixed
   */
  private generatePRDescription(issues: DetectedIssue[]): string {
    const issuesByType: Record<string, DetectedIssue[]> = {};
    
    // Group issues by type
    issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });
    
    // Create description sections
    let description = `# QUX-95 Autonomous Self-Improvement

This PR was automatically generated by QUX-95's autonomous self-improvement system to fix ${issues.length} detected issues.

## Issues Fixed

`;

    // Add each issue type
    for (const [type, typeIssues] of Object.entries(issuesByType)) {
      description += `### ${type.replace('_', ' ').toUpperCase()} (${typeIssues.length} issues)\n\n`;
      
      typeIssues.forEach(issue => {
        description += `- **${issue.severity.toUpperCase()}**: ${issue.description}\n`;
        if (issue.files.length > 0) {
          description += `  Files: ${issue.files.join(', ')}\n`;
        }
        description += '\n';
      });
    }
    
    // Add system information
    description += `\n## System Information\n\n`;
    description += `- Generated at: ${new Date().toISOString()}\n`;
    description += `- Autonomy level: ${this.autonomyLevel}\n`;
    description += `- Runtime metrics available: Yes\n`;
    
    return description;
  }

  /**
   * Execute a terminal command programmatically
   */
  public async executeCommand(command: string, reason: string): Promise<string> {
    // Validate the command is allowed
    if (!this.isCommandAllowed(command)) {
      const errorMsg = `Command not allowed for autonomous execution: ${command}`;
      workspaceService.log(errorMsg, 'autonomous.log');
      return `Error: ${errorMsg}`;
    }
    
    try {
      workspaceService.log(`Executing command: ${command} - Reason: ${reason}`, 'autonomous.log');
      
      // In a browser environment, we can't execute shell commands directly
      // This would work in Node.js with execSync or in Electron
      
      // For this demo, we'll simulate the command execution
      const simulatedResult = this.simulateCommandExecution(command);
      
      // Log the result
      workspaceService.log(`Command result: ${simulatedResult.substring(0, 100)}${simulatedResult.length > 100 ? '...' : ''}`, 'autonomous.log');
      
      return simulatedResult;
    } catch (error) {
      const errorMsg = `Error executing command '${command}': ${error}`;
      console.error(errorMsg);
      workspaceService.log(errorMsg, 'autonomous.log');
      return `Error: ${errorMsg}`;
    }
  }

  /**
   * Check if a command is allowed to be executed autonomously
   */
  private isCommandAllowed(command: string): boolean {
    // Check against the whitelist
    return this.allowedCommands.some(allowedCmd => command.startsWith(allowedCmd));
  }

  /**
   * Simulate command execution (for browser environment)
   */
  private simulateCommandExecution(command: string): string {
    // Simulate command output
    if (command.includes('lint')) {
      return `
Running ESLint...

/src/components/Dashboard.tsx
  Line 432:5   warning  React Hook useEffect has a missing dependency: 'autoModeCounter'  react-hooks/exhaustive-deps

/src/services/ollamaService.ts  
  Line 211:7   error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  Line 345:12  warning  Prefer optional chaining '.?'             @typescript-eslint/prefer-optional-chain

✖ 3 problems (1 error, 2 warnings)
`;
    } else if (command.includes('test')) {
      return `
 PASS  src/tests/utils.test.ts
 PASS  src/tests/components/Button.test.tsx
 PASS  src/tests/services/workspaceService.test.ts

Test Suites: 3 passed, 3 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        3.41s
`;
    } else if (command.includes('build')) {
      return `
vite v5.0.0 building for production...
✓ 1243 modules transformed.
rendering chunks (43)...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.30 kB
dist/assets/index-9df29ae7.css   72.95 kB │ gzip: 14.11 kB
dist/assets/index-7c28d5f5.js   514.33 kB │ gzip: 150.12 kB

Build complete.
`;
    } else if (command.includes('git status')) {
      return `
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   src/components/Dashboard.tsx
        modified:   src/services/ollamaService.ts

no changes added to commit (use "git add" and/or "git commit -a")
`;
    } else {
      return `Command executed: ${command}`;
    }
  }

  /**
   * Get currently detected issues
   */
  public getDetectedIssues(): DetectedIssue[] {
    return [...this.detectedIssues];
  }

  /**
   * Get modification history
   */
  public getModificationHistory(): ModificationResult[] {
    return [...this.modificationHistory];
  }

  /**
   * Check if autonomous service is active
   */
  public isServiceActive(): boolean {
    return this.isActive;
  }
  
  /**
   * Get current autonomy level
   */
  public getAutonomyLevel(): number {
    return this.autonomyLevel;
  }
  
  /**
   * Set autonomy level (1-4)
   */
  public setAutonomyLevel(level: number): boolean {
    if (level < 1 || level > 4) {
      return false;
    }
    
    this.autonomyLevel = level;
    workspaceService.log(`Autonomy level changed to ${level}`, 'autonomous.log');
    
    // If we're switching to or from monitoring-only mode, log the change
    if (level === 1) {
      toast.info('Monitoring mode activated', {
        description: 'QUX-95 will detect issues but not fix them automatically'
      });
    } else if (level === 4) {
      toast.warning('Full autonomy mode activated', {
        description: 'QUX-95 will automatically fix detected issues'
      });
    }
    
    return true;
  }

  private loadImprovementHistory(): void {
    try {
      const historyData = workspaceService.readFile(this.improvementHistoryFile);
      if (historyData) {
        this.selfImprovementHistory = JSON.parse(historyData);
      }
    } catch (error) {
      console.error('Error loading improvement history:', error);
      workspaceService.log(`Error loading improvement history: ${error}`, 'autonomous.log');
    }
  }

  private saveImprovementHistory(): void {
    workspaceService.writeFile(
      this.improvementHistoryFile,
      JSON.stringify(this.selfImprovementHistory, null, 2)
    );
  }

  public onToolCreated(tool: Tool): void {
    // Analyze the new tool and determine if it can be used for self-improvement
    this.analyzeToolForSelfImprovement(tool);
  }

  private async analyzeToolForSelfImprovement(tool: Tool): Promise<void> {
    try {
      const prompt = `Analyze the following tool and suggest potential improvements to the autonomous system:
Tool: ${tool.name}
Category: ${tool.category}
Description: ${tool.description}

Consider:
1. How this tool could enhance the autonomous system's capabilities
2. Potential integration points with existing functionality
3. New features or improvements that could be implemented using this tool

Format the response as a JSON object with:
- improvement: string (description of the improvement)
- priority: number (1-5, where 5 is highest)
- implementationSteps: string[] (steps to implement the improvement)`;

      const response = await ollamaService.generateCompletion({
        model: ollamaService.getCurrentModel() || 'llama2:7b',
        prompt,
        options: {
          temperature: 0.3,
          max_tokens: 1000
        }
      });

      const analysis = JSON.parse(response);
      if (analysis.improvement && analysis.implementationSteps) {
        this.selfImprovementHistory.push({
          timestamp: new Date(),
          toolId: tool.id,
          improvement: analysis.improvement,
          priority: analysis.priority,
          status: 'pending',
          implementationSteps: analysis.implementationSteps
        });
        this.saveImprovementHistory();
      }
    } catch (error) {
      console.error('Error analyzing tool for self-improvement:', error);
      workspaceService.log(`Error analyzing tool for self-improvement: ${error}`, 'autonomous.log');
    }
  }

  public async executeSelfImprovement(): Promise<void> {
    if (this.selfImprovementHistory.length === 0) {
      return;
    }

    // Sort improvements by priority and status
    const sortedImprovements = [...this.selfImprovementHistory]
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return b.priority - a.priority;
      });

    for (const improvement of sortedImprovements) {
      if (improvement.status === 'pending') {
        try {
          // Execute each implementation step
          for (const step of improvement.implementationSteps) {
            await this.executeImprovementStep(step, improvement.toolId);
          }
          improvement.status = 'completed';
          this.saveImprovementHistory();
        } catch (error) {
          console.error('Error executing improvement:', error);
          improvement.status = 'failed';
          improvement.error = error instanceof Error ? error.message : String(error);
          this.saveImprovementHistory();
        }
      }
    }
  }

  private async executeImprovementStep(step: string, toolId: string): Promise<void> {
    try {
      // Use the tool service to execute the step
      const tools = await toolService.getTools();
      const tool = tools.find(t => t.id === toolId);
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }
      const result = await this.executeTool(tool, { step });
      if (!result.success) {
        throw new Error(result.error || 'Tool execution failed');
      }
    } catch (error) {
      console.error('Error executing improvement step:', error);
      throw error;
    }
  }

  private async executeTool(tool: Tool, args: any): Promise<ToolExecutionResult> {
    try {
      return await toolService.executeTool(tool.id, args);
    } catch (error) {
      console.error('Error executing tool:', error);
      throw error;
    }
  }

  private async getAvailableTools(): Promise<Tool[]> {
    return toolService.getTools();
  }
}

// Create and export singleton instance
export const autonomousService = new AutonomousService();