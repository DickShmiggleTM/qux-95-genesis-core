
import { LearningExamples } from '../LearningExamples';
import { workspaceService } from '../../workspaceService';

// Mock workspaceService
jest.mock('../../workspaceService', () => ({
  workspaceService: {
    log: jest.fn()
  }
}));

describe('LearningExamples', () => {
  let learningExamples: LearningExamples;

  beforeEach(() => {
    jest.clearAllMocks();
    learningExamples = new LearningExamples();
  });

  it('should initialize with empty examples', () => {
    const examples = learningExamples.getExamples();
    expect(examples).toHaveLength(0);
  });

  it('should record a new example', () => {
    const exampleId = learningExamples.recordExample('test input', 'test output', ['tag1', 'tag2']);
    
    const examples = learningExamples.getExamples();
    expect(examples).toHaveLength(1);
    expect(examples[0].id).toBe(exampleId);
    expect(examples[0].input).toBe('test input');
    expect(examples[0].output).toBe('test output');
    expect(examples[0].tags).toEqual(['tag1', 'tag2']);
    expect(workspaceService.log).toHaveBeenCalled();
  });

  it('should provide feedback for an example', () => {
    const exampleId = learningExamples.recordExample('test input', 'test output');
    const result = learningExamples.provideFeedback(exampleId, 'positive');
    
    expect(result).toBe(true);
    expect(learningExamples.getExamples()[0].feedback).toBe('positive');
    expect(workspaceService.log).toHaveBeenCalledTimes(2); // Once for record, once for feedback
  });

  it('should not provide feedback for an invalid example', () => {
    const result = learningExamples.provideFeedback('invalid-id', 'positive');
    expect(result).toBe(false);
  });

  it('should filter examples by tag', () => {
    learningExamples.recordExample('test1', 'output1', ['tag1']);
    learningExamples.recordExample('test2', 'output2', ['tag2']);
    learningExamples.recordExample('test3', 'output3', ['tag1', 'tag3']);
    
    const filteredExamples = learningExamples.getExamples({ tags: ['tag1'] });
    expect(filteredExamples).toHaveLength(2);
    expect(filteredExamples[0].input).toBe('test1');
    expect(filteredExamples[1].input).toBe('test3');
  });

  it('should filter examples by feedback', () => {
    const id1 = learningExamples.recordExample('test1', 'output1');
    const id2 = learningExamples.recordExample('test2', 'output2');
    
    learningExamples.provideFeedback(id1, 'positive');
    
    const filteredExamples = learningExamples.getExamples({ feedback: 'positive' });
    expect(filteredExamples).toHaveLength(1);
    expect(filteredExamples[0].input).toBe('test1');
  });

  it('should get the correct example count', () => {
    expect(learningExamples.getExampleCount()).toBe(0);
    
    learningExamples.recordExample('test1', 'output1');
    learningExamples.recordExample('test2', 'output2');
    
    expect(learningExamples.getExampleCount()).toBe(2);
  });
  
  it('should return the correct state', () => {
    learningExamples.recordExample('test', 'output');
    
    const state = learningExamples.getState();
    expect(state).toHaveProperty('examples');
    expect(state.examples).toHaveLength(1);
    expect(state.examples[0].input).toBe('test');
  });
});
