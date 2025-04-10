
/**
 * BaseService
 * 
 * Provides common functionality for all services including
 * error handling and state persistence
 */
import { toast } from 'sonner';
import { SavedState, saveSystem } from '../saveSystem';

export abstract class BaseService {
  /**
   * Save state to persistent storage
   * @param key The key to store the state under
   * @param state The state to store
   */
  protected saveState<T>(key: keyof SavedState, state: T): boolean {
    try {
      const systemState = saveSystem.loadSystemState() || {};
      systemState[key] = state;
      return saveSystem.saveSystemState(systemState);
    } catch (error) {
      this.handleError('Error saving state', error);
      return false;
    }
  }

  /**
   * Load state from persistent storage
   * @param key The key to load the state from
   * @returns The loaded state or null if none exists
   */
  protected loadState<T>(key: keyof SavedState): T | null {
    try {
      const savedState = saveSystem.loadSystemState();
      if (savedState?.[key]) {
        return savedState[key] as T;
      }
      return null;
    } catch (error) {
      this.handleError('Error loading state', error);
      return null;
    }
  }

  /**
   * Handle errors consistently across services
   * @param message Error message
   * @param error Error object
   * @param notify Whether to show a toast notification
   */
  protected handleError(message: string, error: unknown, notify: boolean = false): void {
    console.error(`${message}:`, error);
    
    if (notify) {
      toast.error('An error occurred', {
        description: message
      });
    }
  }
}
