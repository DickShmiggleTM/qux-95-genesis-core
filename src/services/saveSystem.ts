
import { toast } from "sonner";

export interface SavedState {
  settings: {
    theme: string;
    animationsEnabled: boolean;
    autoMode: boolean;
    autoSaveInterval: number;
  };
  memory: Record<string, any>;
  context: any[];
  chatHistory: any[];
  lastSaved: string;
}

class SaveSystem {
  private static STORAGE_KEY = 'qux95_system_state';
  private autoSaveInterval: number = 5 * 60 * 1000; // Default: 5 minutes
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize auto-save on instantiation
    this.startAutoSave();
  }

  public startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.saveSystemState();
    }, this.autoSaveInterval);
  }

  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  public setAutoSaveInterval(minutes: number): void {
    this.autoSaveInterval = minutes * 60 * 1000;
    this.startAutoSave(); // Restart with new interval
  }

  public async saveSystemState(
    manualSave: boolean = false, 
    data?: Partial<SavedState>
  ): Promise<boolean> {
    try {
      const state: SavedState = {
        settings: {
          theme: localStorage.getItem('qux95_theme') || 'cyberpunk',
          animationsEnabled: localStorage.getItem('qux95_animations') !== 'false',
          autoMode: localStorage.getItem('qux95_auto_mode') === 'true',
          autoSaveInterval: this.autoSaveInterval / (60 * 1000), // Convert back to minutes
        },
        memory: data?.memory || {},
        context: data?.context || [],
        chatHistory: data?.chatHistory || [],
        lastSaved: new Date().toISOString(),
      };

      // Store in localStorage
      localStorage.setItem(
        SaveSystem.STORAGE_KEY,
        JSON.stringify(state)
      );

      if (manualSave) {
        toast.success("System state saved", {
          description: `All settings and memory saved at ${new Date().toLocaleTimeString()}`
        });
      }

      return true;
    } catch (error) {
      console.error("Failed to save system state:", error);
      
      if (manualSave) {
        toast.error("Failed to save system state", {
          description: "An error occurred while saving your settings"
        });
      }
      
      return false;
    }
  }

  public loadSystemState(): SavedState | null {
    try {
      const savedState = localStorage.getItem(SaveSystem.STORAGE_KEY);
      
      if (!savedState) {
        return null;
      }
      
      return JSON.parse(savedState) as SavedState;
    } catch (error) {
      console.error("Failed to load system state:", error);
      toast.error("Failed to load saved state", {
        description: "Your previous settings could not be restored"
      });
      return null;
    }
  }

  public clearSavedState(): boolean {
    try {
      localStorage.removeItem(SaveSystem.STORAGE_KEY);
      toast.success("System state cleared", {
        description: "All saved settings and memory have been reset"
      });
      return true;
    } catch (error) {
      console.error("Failed to clear system state:", error);
      return false;
    }
  }
}

export const saveSystem = new SaveSystem();
