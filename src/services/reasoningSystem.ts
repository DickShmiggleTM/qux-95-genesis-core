
import { ollamaService } from "./ollamaService";
import { toast } from "sonner";

export interface ReasoningOptions {
  steps?: number;
  verbose?: boolean;
  formatOutput?: boolean;
  saveSteps?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ReasoningResult {
  answer: string;
  reasoning: string[];
  confidence: number;
  timeToSolve: number;
  modelUsed?: string;
}

export interface StoredReasoning {
  problem: string;
  result: ReasoningResult;
  timestamp: string;
}

class ReasoningSystem {
  private enabled: boolean = false;
  private defaultOptions: ReasoningOptions = {
    steps: 3,
    verbose: false,
    formatOutput: true,
    saveSteps: true,
    temperature: 0.3,
    maxTokens: 1000
  };
  
  // Store reasoning steps for complex problems
  private reasoningHistory: Record<string, StoredReasoning> = {};
  
  constructor() {
    // Try to load saved reasoning history
    this.loadReasoningHistory();
  }
  
  public enable(): void {
    this.enabled = true;
    ollamaService.enableReasoning(true);
    toast.success("Reasoning system enabled", {
      description: "Chain-of-thought reasoning is now active"
    });
  }
  
  public disable(): void {
    this.enabled = false;
    ollamaService.enableReasoning(false);
    toast.success("Reasoning system disabled", {
      description: "Using standard response generation"
    });
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  public setOptions(options: Partial<ReasoningOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    
    toast.success("Reasoning options updated", {
      description: "New reasoning parameters applied"
    });
  }
  
  public getOptions(): ReasoningOptions {
    return { ...this.defaultOptions };
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
      console.log("Using cached reasoning result for:", problem);
      return this.reasoningHistory[problemHash].result;
    }
    
    // If the model isn't set, notify the user
    const currentModel = ollamaService.getCurrentModel();
    if (!currentModel) {
      toast.error("No model selected", {
        description: "Please select a model before using reasoning"
      });
      
      return {
        answer: "Error: No model selected for reasoning",
        reasoning: ["No model selected for reasoning. Please set a model first."],
        confidence: 0,
        timeToSolve: 0
      };
    }
    
    if (!this.enabled) {
      // If reasoning is disabled, return a simple result
      const response = await ollamaService.generateChatCompletion(
        [{ role: 'user', content: problem }],
        currentModel,
        {
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens
        }
      );
      
      return {
        answer: response,
        reasoning: ["Reasoning system is disabled. Using direct response."],
        confidence: 0.7,
        timeToSolve: Date.now() - startTime,
        modelUsed: currentModel
      };
    }
    
    try {
      // Show a loading toast for complex problems
      let toastId;
      if (problem.length > 100) {
        toastId = toast.loading("Processing complex problem", {
          description: "Using chain-of-thought reasoning..."
        });
      }
      
      // Use the reasoning-enabled chat completion
      const result = await ollamaService.generateChatCompletionWithReasoning(
        [{ role: 'user', content: problem }],
        currentModel,
        {
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens
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
        timeToSolve: Date.now() - startTime,
        modelUsed: currentModel
      };
      
      // Save the reasoning result if requested
      if (mergedOptions.saveSteps) {
        this.reasoningHistory[problemHash] = {
          problem,
          result: reasoningResult,
          timestamp: new Date().toISOString()
        };
        this.saveReasoningHistory();
      }
      
      // Close loading toast if it exists
      if (toastId) {
        toast.success("Analysis complete", {
          description: `Solved in ${Math.round(reasoningResult.timeToSolve / 100) / 10}s`,
          id: toastId
        });
      }
      
      return reasoningResult;
    } catch (error) {
      console.error("Error in reasoning system:", error);
      
      toast.error("Reasoning failed", {
        description: "Could not complete the reasoning process"
      });
      
      return {
        answer: "Failed to solve the problem due to an error.",
        reasoning: ["Reasoning process encountered an error."],
        confidence: 0,
        timeToSolve: Date.now() - startTime,
        modelUsed: currentModel
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
    
    // Check for logical structure indicators
    const logicIndicators = ['therefore', 'thus', 'consequently', 'because', 'since'];
    if (logicIndicators.some(word => reasoningSteps.some(step => step.toLowerCase().includes(word)))) {
      confidence = Math.min(confidence + 0.1, 0.95);
    }
    
    return confidence;
  }
  
  private hashProblem(problem: string): string {
    // Simple hash function to use as a key for storing reasoning results
    // In a production system, you'd want a better hash function
    return btoa(problem.slice(0, 100)).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  private loadReasoningHistory(): void {
    try {
      const savedHistory = localStorage.getItem('qux95_reasoning_history');
      if (savedHistory) {
        this.reasoningHistory = JSON.parse(savedHistory);
        console.log("Loaded reasoning history:", Object.keys(this.reasoningHistory).length, "entries");
      }
    } catch (e) {
      console.error("Failed to load reasoning history:", e);
      this.reasoningHistory = {};
    }
  }
  
  private saveReasoningHistory(): void {
    try {
      localStorage.setItem('qux95_reasoning_history', JSON.stringify(this.reasoningHistory));
    } catch (e) {
      console.error("Failed to save reasoning history:", e);
      
      // If the error is due to storage limit, try to reduce the size
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        this.pruneOldestEntries();
        try {
          localStorage.setItem('qux95_reasoning_history', JSON.stringify(this.reasoningHistory));
        } catch (retryError) {
          console.error("Failed to save even after pruning:", retryError);
        }
      }
    }
  }
  
  private pruneOldestEntries(): void {
    // Get all entries with their timestamps
    const entries = Object.entries(this.reasoningHistory).map(([key, value]) => ({
      key,
      timestamp: new Date(value.timestamp).getTime()
    }));
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove the oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      if (entries[i]) {
        delete this.reasoningHistory[entries[i].key];
      }
    }
    
    console.log(`Pruned ${toRemove} oldest reasoning entries to save space`);
  }
  
  public clearHistory(): void {
    this.reasoningHistory = {};
    localStorage.removeItem('qux95_reasoning_history');
    
    toast.success("Reasoning history cleared", {
      description: "All saved reasoning entries have been removed"
    });
  }
  
  public getHistoryStats(): { count: number, oldestEntry: string | null, newestEntry: string | null } {
    const entries = Object.values(this.reasoningHistory);
    if (entries.length === 0) {
      return {
        count: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
    
    entries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return {
      count: entries.length,
      oldestEntry: entries[0].timestamp,
      newestEntry: entries[entries.length - 1].timestamp
    };
  }
}

export const reasoningSystem = new ReasoningSystem();
