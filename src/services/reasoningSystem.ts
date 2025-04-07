
import { ollamaService } from "./ollamaService";

export interface ReasoningOptions {
  steps?: number;
  verbose?: boolean;
  formatOutput?: boolean;
  saveSteps?: boolean;
}

export interface ReasoningResult {
  answer: string;
  reasoning: string[];
  confidence: number;
  timeToSolve: number;
}

class ReasoningSystem {
  private enabled: boolean = false;
  private defaultOptions: ReasoningOptions = {
    steps: 3,
    verbose: false,
    formatOutput: true,
    saveSteps: true
  };
  
  // Store reasoning steps for complex problems
  private reasoningHistory: Record<string, ReasoningResult> = {};
  
  constructor() {
    // Try to load saved reasoning history
    const savedHistory = localStorage.getItem('qux95_reasoning_history');
    if (savedHistory) {
      try {
        this.reasoningHistory = JSON.parse(savedHistory);
      } catch (e) {
        console.error("Failed to parse reasoning history:", e);
        this.reasoningHistory = {};
      }
    }
  }
  
  public enable(): void {
    this.enabled = true;
    ollamaService.enableReasoning(true);
  }
  
  public disable(): void {
    this.enabled = false;
    ollamaService.enableReasoning(false);
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  public setOptions(options: Partial<ReasoningOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }
  
  public async solve(
    problem: string,
    options: Partial<ReasoningOptions> = {}
  ): Promise<ReasoningResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Check if we've solved this problem before
    const problemHash = this.hashProblem(problem);
    if (mergedOptions.saveSteps && this.reasoningHistory[problemHash]) {
      return this.reasoningHistory[problemHash];
    }
    
    if (!this.enabled) {
      // If reasoning is disabled, return a simple result
      const response = await ollamaService.generateChatCompletion(
        [{ role: 'user', content: problem }],
        ollamaService.getCurrentModel() || 'default'
      );
      
      return {
        answer: response,
        reasoning: ["Reasoning system is disabled. Using direct response."],
        confidence: 0.7,
        timeToSolve: Date.now() - startTime
      };
    }
    
    try {
      // Use the reasoning-enabled chat completion
      const result = await ollamaService.generateChatCompletionWithReasoning(
        [{ role: 'user', content: problem }],
        ollamaService.getCurrentModel() || 'default',
        {
          temperature: 0.3 // Lower temperature for more logical reasoning
        }
      );
      
      // Process the reasoning steps
      const reasoningSteps = result.reasoning ? 
        result.reasoning.split('\n').filter(step => step.trim().length > 0) :
        ["No detailed reasoning provided"];
      
      const reasoningResult: ReasoningResult = {
        answer: result.response,
        reasoning: reasoningSteps,
        confidence: this.calculateConfidence(reasoningSteps, result.response),
        timeToSolve: Date.now() - startTime
      };
      
      // Save the reasoning result if requested
      if (mergedOptions.saveSteps) {
        this.reasoningHistory[problemHash] = reasoningResult;
        this.saveReasoningHistory();
      }
      
      return reasoningResult;
    } catch (error) {
      console.error("Error in reasoning system:", error);
      return {
        answer: "Failed to solve the problem due to an error.",
        reasoning: ["Reasoning process encountered an error."],
        confidence: 0,
        timeToSolve: Date.now() - startTime
      };
    }
  }
  
  private calculateConfidence(reasoningSteps: string[], answer: string): number {
    // A simple heuristic for confidence based on reasoning quality
    // In a real system, this would be much more sophisticated
    
    if (reasoningSteps.length === 0) return 0.5;
    
    // More steps generally indicates more thorough reasoning
    let confidence = Math.min(0.5 + (reasoningSteps.length / 10), 0.9);
    
    // Check if the answer contains uncertainty words
    const uncertaintyWords = ['maybe', 'perhaps', 'possibly', 'not sure', 'uncertain'];
    if (uncertaintyWords.some(word => answer.toLowerCase().includes(word))) {
      confidence *= 0.8;
    }
    
    return confidence;
  }
  
  private hashProblem(problem: string): string {
    // Simple hash function to use as a key for storing reasoning results
    // In a production system, you'd want a better hash function
    return btoa(problem.slice(0, 100)).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  private saveReasoningHistory(): void {
    try {
      localStorage.setItem('qux95_reasoning_history', JSON.stringify(this.reasoningHistory));
    } catch (e) {
      console.error("Failed to save reasoning history:", e);
    }
  }
  
  public clearHistory(): void {
    this.reasoningHistory = {};
    localStorage.removeItem('qux95_reasoning_history');
  }
}

export const reasoningSystem = new ReasoningSystem();
