
import { LearningModels } from '../LearningModels';
import { workspaceService } from '../../workspaceService';

// Mock workspaceService
jest.mock('../../workspaceService', () => ({
  workspaceService: {
    log: jest.fn()
  }
}));

describe('LearningModels', () => {
  let learningModels: LearningModels;

  beforeEach(() => {
    jest.clearAllMocks();
    learningModels = new LearningModels();
  });

  it('should initialize with a default model', () => {
    const models = learningModels.getModels();
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('BaseModel');
    
    const activeModel = learningModels.getActiveModel();
    expect(activeModel).not.toBeNull();
    expect(activeModel?.name).toBe('BaseModel');
  });

  it('should create a new model', () => {
    const modelId = learningModels.createModel('TestModel', 'Test Description');
    const models = learningModels.getModels();
    
    expect(models).toHaveLength(2);
    expect(models[1].id).toBe(modelId);
    expect(models[1].name).toBe('TestModel');
    expect(workspaceService.log).toHaveBeenCalled();
  });

  it('should set an active model', () => {
    const modelId = learningModels.createModel('TestModel', 'Test Description');
    const result = learningModels.setActiveModel(modelId);
    
    expect(result).toBe(true);
    expect(learningModels.getActiveModel()?.id).toBe(modelId);
  });

  it('should not set an invalid model as active', () => {
    const result = learningModels.setActiveModel('invalid-id');
    expect(result).toBe(false);
  });

  it('should update model performance', () => {
    const models = learningModels.getModels();
    const modelId = models[0].id;
    const initialAccuracy = models[0].performance.accuracy;
    
    const result = learningModels.updateModelPerformance(modelId);
    
    expect(result).toBe(true);
    expect(learningModels.getActiveModel()?.performance.accuracy).toBeGreaterThan(initialAccuracy);
    expect(learningModels.getActiveModel()?.performance.iterations).toBe(1);
  });
  
  it('should not update an invalid model', () => {
    const result = learningModels.updateModelPerformance('invalid-id');
    expect(result).toBe(false);
  });
  
  it('should return the correct state', () => {
    const state = learningModels.getState();
    expect(state).toHaveProperty('models');
    expect(state).toHaveProperty('activeModelId');
    expect(state.models).toHaveLength(1);
  });
});
