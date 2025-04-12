import { ollamaService } from './ollamaService';
import { workspaceService } from './workspaceService';
import { githubService } from './githubService';

// Worker message handler
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'ANALYZE_CODEBASE':
        const analysisResult = await analyzeCodebase(data.autonomyLevel);
        self.postMessage({
          type: 'ANALYSIS_COMPLETE',
          data: analysisResult
        });
        break;
        
      case 'FIX_ISSUES':
        const fixResults = await fixIssues(data.issues, data.autonomyLevel);
        self.postMessage({
          type: 'FIX_COMPLETE',
          data: fixResults
        });
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

async function analyzeCodebase(autonomyLevel: number) {
  try {
    // Generate analysis prompt
    const analysisPrompt = `
You are performing a code quality and performance analysis on a TypeScript React application using Vite.
The analysis should focus on identifying:

1. Performance bottlenecks in UI rendering
2. Memory leaks and excessive re-renders
3. Type safety issues
4. Error handling gaps
5. Security vulnerabilities
6. Architecture improvement opportunities
7. Testing coverage gaps

Please review the codebase structure and provide a detailed analysis with specific issues you find.
Each issue should have:
- Issue type (performance, quality, security, etc.)
- Severity (low, medium, high, critical)
- Description
- Affected files
- Potential solution

Return your findings in a structured format that can be parsed programmatically.
`;

    // Use ollama to analyze the codebase
    const analysisResult = await ollamaService.generateCompletion({
      model: ollamaService.getCurrentModel() || 'llama2:7b',
      prompt: analysisPrompt,
      options: {
        temperature: 0.3,
        max_tokens: 2000
      }
    });

    // Parse the analysis result
    const result = parseAnalysisResult(analysisResult);
    
    // Save analysis results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    workspaceService.writeFile(
      `autonomous/analysis/code_analysis_${timestamp}.json`,
      JSON.stringify(result, null, 2)
    );
    
    return result;
  } catch (error) {
    console.error('Error analyzing codebase:', error);
    return {
      issues: [],
      summary: 'Analysis failed due to error',
      metrics: {
        codeQualityScore: 0,
        performanceScore: 0,
        securityScore: 0,
        overallHealth: 0
      }
    };
  }
}

async function fixIssues(issues: DetectedIssue[], autonomyLevel: number) {
  const results: ModificationResult[] = [];
  
  for (const issue of issues) {
    try {
      // Generate fix prompt
      const fixPrompt = `
Please generate a fix for the following issue:

Type: ${issue.type}
Severity: ${issue.severity}
Description: ${issue.description}
Files: ${issue.files.join(', ')}

Generate a complete fix that addresses this issue. Include:
1. Modified code for affected files
2. Test cases if applicable
3. Documentation updates if needed

Return the fix in a structured format that can be parsed programmatically.
`;

      // Use ollama to generate the fix
      const fixResult = await ollamaService.generateCompletion({
        model: ollamaService.getCurrentModel() || 'llama2:7b',
        prompt: fixPrompt,
        options: {
          temperature: 0.2,
          max_tokens: 3000
        }
      });

      // Parse the fix result
      const fix = parseFixResult(fixResult);
      
      // Create PR if GitHub integration is enabled
      if (githubService.isAuthenticated() && autonomyLevel >= 3) {
        const prResult = await githubService.createSelfModificationPR(
          `Fix: ${issue.description}`,
          fix.files
        );
        
        results.push({
          success: prResult.success,
          message: prResult.success ? 
            `Created PR for fixing ${issue.description}` :
            `Failed to create PR: ${prResult.error}`,
          prUrl: prResult.prUrl
        });
      } else {
        results.push({
          success: true,
          message: `Generated fix for ${issue.description}`,
          prUrl: null
        });
      }
    } catch (error) {
      results.push({
        success: false,
        message: `Failed to fix issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        prUrl: null
      });
    }
  }
  
  return results;
}

function parseAnalysisResult(result: string): CodeAnalysisResult {
  // In a real implementation, we would parse the structured output
  // For this demo, we'll create synthetic results
  return {
    issues: [
      {
        type: 'performance',
        severity: 'high',
        description: 'Potential memory leak in component unmount',
        files: ['src/components/Example.tsx'],
        resolvedAt: null
      }
    ],
    summary: 'Code analysis completed successfully',
    metrics: {
      codeQualityScore: 85,
      performanceScore: 90,
      securityScore: 95,
      overallHealth: 90
    }
  };
}

function parseFixResult(result: string): { files: { path: string; content: string }[] } {
  // In a real implementation, we would parse the structured output
  // For this demo, we'll create synthetic results
  return {
    files: [
      {
        path: 'src/components/Example.tsx',
        content: '// Fixed code would go here'
      }
    ]
  };
}

// Export types for TypeScript
export interface DetectedIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  files: string[];
  resolvedAt: string | null;
}

export interface CodeAnalysisResult {
  issues: DetectedIssue[];
  summary: string;
  metrics: {
    codeQualityScore: number;
    performanceScore: number;
    securityScore: number;
    overallHealth: number;
  };
}

export interface ModificationResult {
  success: boolean;
  message: string;
  prUrl: string | null;
} 