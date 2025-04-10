
import { BaseService } from '../BaseService';
import { saveSystem } from '../../saveSystem';
import { toast } from 'sonner';

// Mock the saveSystem
jest.mock('../../saveSystem', () => ({
  saveSystem: {
    loadSystemState: jest.fn(),
    saveSystemState: jest.fn().mockReturnValue(true),
  },
}));

// Mock console.error
console.error = jest.fn();

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Create a test implementation of BaseService
class TestService extends BaseService {
  // Expose protected methods for testing
  public testSaveState<T>(key: any, state: T): boolean {
    return this.saveState(key, state);
  }

  public testLoadState<T>(key: any): T | null {
    return this.loadState<T>(key);
  }

  public testHandleError(message: string, error: unknown, notify: boolean = false): void {
    this.handleError(message, error, notify);
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
    jest.clearAllMocks();
  });

  describe('saveState', () => {
    it('should call saveSystemState and return true on success', () => {
      // Mock loadSystemState to return an empty object
      (saveSystem.loadSystemState as jest.Mock).mockReturnValue({});
      
      const result = service.testSaveState('testKey', { data: 'test' });
      
      expect(saveSystem.loadSystemState).toHaveBeenCalled();
      expect(saveSystem.saveSystemState).toHaveBeenCalledWith({
        testKey: { data: 'test' }
      });
      expect(result).toBe(true);
    });

    it('should handle errors and return false', () => {
      // Mock loadSystemState to throw an error
      (saveSystem.loadSystemState as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = service.testSaveState('testKey', { data: 'test' });
      
      expect(console.error).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('loadState', () => {
    it('should return state value when it exists', () => {
      // Mock loadSystemState to return an object with test data
      (saveSystem.loadSystemState as jest.Mock).mockReturnValue({
        testKey: { data: 'test' }
      });
      
      const result = service.testLoadState('testKey');
      
      expect(saveSystem.loadSystemState).toHaveBeenCalled();
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null when state key does not exist', () => {
      // Mock loadSystemState to return an object without the needed key
      (saveSystem.loadSystemState as jest.Mock).mockReturnValue({
        otherKey: { data: 'test' }
      });
      
      const result = service.testLoadState('testKey');
      
      expect(saveSystem.loadSystemState).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('should handle errors and return null', () => {
      // Mock loadSystemState to throw an error
      (saveSystem.loadSystemState as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = service.testLoadState('testKey');
      
      expect(console.error).toHaveBeenCalled();
      expect(result).toBe(null);
    });
  });
});
