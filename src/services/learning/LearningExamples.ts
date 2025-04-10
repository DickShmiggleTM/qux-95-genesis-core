
/**
 * Learning Examples Manager
 * 
 * Handles the collection and management of learning examples
 */
import { v4 as uuidv4 } from 'uuid';
import { BaseService } from "../base/BaseService";
import { LearningExample, LearningFilter } from "./types";
import { workspaceService } from "../workspaceService";

export class LearningExamples extends BaseService {
  private examples: LearningExample[] = [];
  
  constructor(initialExamples: LearningExample[] = []) {
    super();
    this.examples = initialExamples;
  }
  
  /**
   * Record a new learning example
   */
  recordExample(input: string, output: string, tags: string[] = []): string {
    const example: LearningExample = {
      id: uuidv4(),
      input,
      output,
      tags,
      timestamp: Date.now()
    };
    
    this.examples.push(example);
    
    // Log to workspace
    workspaceService.log(`New example recorded: ${example.id}`, 'learning.log');
    
    return example.id;
  }
  
  /**
   * Get all learning examples with optional filtering
   */
  getExamples(filter?: LearningFilter): LearningExample[] {
    let filteredExamples = [...this.examples];
    
    if (filter) {
      if (filter.tags && filter.tags.length > 0) {
        filteredExamples = filteredExamples.filter(e => 
          filter.tags!.some(tag => e.tags.includes(tag))
        );
      }
      
      if (filter.feedback) {
        filteredExamples = filteredExamples.filter(e => e.feedback === filter.feedback);
      }
    }
    
    return filteredExamples;
  }
  
  /**
   * Provide feedback for a learning example
   */
  provideFeedback(exampleId: string, feedback: 'positive' | 'negative' | 'neutral'): boolean {
    const exampleIndex = this.examples.findIndex(e => e.id === exampleId);
    
    if (exampleIndex === -1) {
      return false;
    }
    
    this.examples[exampleIndex].feedback = feedback;
    
    // Log to workspace
    workspaceService.log(`Feedback provided for example ${exampleId}: ${feedback}`, 'learning.log');
    
    return true;
  }
  
  /**
   * Get example count
   */
  getExampleCount(): number {
    return this.examples.length;
  }
  
  /**
   * Get the current examples state
   */
  getState() {
    return {
      examples: this.examples
    };
  }
  
  /**
   * Load examples from state
   */
  loadFromState(examples: LearningExample[]): void {
    this.examples = examples;
  }
}
