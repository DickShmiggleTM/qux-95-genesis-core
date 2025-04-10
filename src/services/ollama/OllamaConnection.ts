
import { toast } from "sonner";
import { BaseService } from "../base/BaseService";
import { HardwareInfo } from "./types";

const OLLAMA_BASE_URL = 'http://localhost:11434/api';

export class OllamaConnection extends BaseService {
  private connected: boolean = false;
  private hardwareInfo: HardwareInfo = {
    gpu: {
      available: false,
      name: null,
      vramTotal: null,
      vramFree: null
    },
    cpu: {
      cores: navigator.hardwareConcurrency || 4,
      model: null
    },
    ram: {
      total: 0,
      free: 0
    }
  };

  /**
   * Check if connected to Ollama server
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/tags`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        this.connected = false;
        return false;
      }
      
      this.connected = true;
      return true;
    } catch (error) {
      this.handleError("Error checking Ollama connection", error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Detect hardware capabilities
   */
  async detectHardware(): Promise<void> {
    try {
      // In a real implementation, we would check for CUDA availability through the Ollama API
      // For now, we'll simulate this check
      const simulateGpuCheck = async (): Promise<boolean> => {
        try {
          const response = await fetch(`${OLLAMA_BASE_URL}/hardware`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => null);
          
          if (!response) {
            const userAgent = navigator.userAgent.toLowerCase();
            const probablyHasGpu = userAgent.includes('nvidia') || 
                               userAgent.includes('amd') || 
                               userAgent.includes('radeon') || 
                               userAgent.includes('geforce');
            
            return probablyHasGpu;
          }
          
          return true;
        } catch {
          return false;
        }
      };
      
      const gpuAvailable = await simulateGpuCheck();
      
      this.hardwareInfo = {
        gpu: {
          available: gpuAvailable,
          name: gpuAvailable ? "GPU Detected (CUDA/Metal)" : null,
          vramTotal: gpuAvailable ? 8192 : null, // Simulate 8GB VRAM
          vramFree: gpuAvailable ? 6144 : null  // Simulate 6GB free
        },
        cpu: {
          cores: navigator.hardwareConcurrency || 4,
          model: "CPU Detected"
        },
        ram: {
          total: 16384, // Simulate 16GB RAM
          free: 8192    // Simulate 8GB free
        }
      };
      
      console.log("Hardware detection result:", this.hardwareInfo);
    } catch (error) {
      this.handleError("Hardware detection failed", error);
    }
  }

  getHardwareInfo(): HardwareInfo {
    return this.hardwareInfo;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getBaseUrl(): string {
    return OLLAMA_BASE_URL;
  }
}
