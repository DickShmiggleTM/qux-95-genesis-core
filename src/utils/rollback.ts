
/**
 * Rollback System
 * 
 * Provides functionality to automatically roll back to previous states
 * in case of system errors or failures
 */

import { toast } from 'sonner';
import { saveSystem, SavedState } from '../services/saveSystem';

/**
 * State snapshot representing a point-in-time capture of system state
 */
interface StateSnapshot {
  id: string;
  timestamp: number;
  description: string;
  state: SavedState;
}

/**
 * Rollback record with state snapshots and metadata
 */
class RollbackSystem {
  private snapshots: StateSnapshot[] = [];
  private maxSnapshots: number = 10;
  
  constructor() {
    this.loadSnapshots();
  }
  
  /**
   * Load saved snapshots from localStorage
   */
  private loadSnapshots(): void {
    try {
      const savedSnapshots = localStorage.getItem('qux95_snapshots');
      if (savedSnapshots) {
        this.snapshots = JSON.parse(savedSnapshots);
      }
    } catch (error) {
      console.error('Failed to load snapshots:', error);
      this.snapshots = [];
    }
  }
  
  /**
   * Save snapshots to localStorage
   */
  private saveSnapshots(): void {
    try {
      localStorage.setItem('qux95_snapshots', JSON.stringify(this.snapshots));
    } catch (error) {
      console.error('Failed to save snapshots:', error);
    }
  }
  
  /**
   * Create a new state snapshot
   * @param description Human-readable description of the state
   * @returns Snapshot ID
   */
  createSnapshot(description: string): string | null {
    try {
      const currentState = saveSystem.loadSystemState();
      if (!currentState) {
        return null;
      }
      
      const snapshot: StateSnapshot = {
        id: `snap-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        description,
        state: currentState
      };
      
      // Add snapshot and trim if needed
      this.snapshots.push(snapshot);
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots.shift();
      }
      
      this.saveSnapshots();
      return snapshot.id;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      return null;
    }
  }
  
  /**
   * Roll back to a previous snapshot
   * @param snapshotId ID of the snapshot to roll back to
   * @returns Success status
   */
  rollback(snapshotId: string): boolean {
    try {
      const snapshot = this.snapshots.find(s => s.id === snapshotId);
      if (!snapshot) {
        toast.error('Rollback failed', {
          description: 'Snapshot not found'
        });
        return false;
      }
      
      // Apply the state from the snapshot
      const success = saveSystem.saveSystemState(snapshot.state);
      
      if (success) {
        toast.success('System rolled back', {
          description: `Rolled back to: ${snapshot.description}`
        });
        
        // Force page reload to apply the rolled back state
        window.location.reload();
        return true;
      } else {
        toast.error('Rollback failed', {
          description: 'Failed to apply snapshot state'
        });
        return false;
      }
    } catch (error) {
      console.error('Rollback error:', error);
      toast.error('Rollback error', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
  
  /**
   * Get list of available snapshots
   * @returns Array of available snapshots
   */
  getSnapshots(): Array<Omit<StateSnapshot, 'state'>> {
    return this.snapshots.map(({ id, timestamp, description }) => ({
      id,
      timestamp,
      description
    }));
  }
  
  /**
   * Delete a specific snapshot
   * @param snapshotId ID of the snapshot to delete
   */
  deleteSnapshot(snapshotId: string): boolean {
    const initialLength = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => s.id !== snapshotId);
    
    if (this.snapshots.length !== initialLength) {
      this.saveSnapshots();
      return true;
    }
    
    return false;
  }
  
  /**
   * Create an automatic snapshot before a risky operation
   * @param operation Description of the operation
   * @returns Function to clear the auto-rollback timer
   */
  prepareAutoRollback(operation: string): () => void {
    const snapshotId = this.createSnapshot(`Auto-snapshot before: ${operation}`);
    
    if (!snapshotId) {
      return () => {};
    }
    
    // Set up an auto-rollback timer (5 minutes)
    const timer = setTimeout(() => {
      // If this timer fires, something went wrong and we need to roll back
      this.rollback(snapshotId);
    }, 5 * 60 * 1000);
    
    // Return function to clear the auto-rollback timer
    return () => {
      clearTimeout(timer);
    };
  }
}

// Export singleton instance
export const rollbackSystem = new RollbackSystem();
