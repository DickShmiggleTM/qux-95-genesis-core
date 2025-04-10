/**
 * Computer Vision Service
 * 
 * Provides image analysis capabilities using Hugging Face transformers library
 */
import { BaseService } from '../base/BaseService';
import { pipeline, env } from '@huggingface/transformers';
import { toast } from 'sonner';
import { workspaceService } from '../workspaceService';

export type VisionTask = 'image-classification' | 'object-detection';

export type VisionModel = {
  id: string;
  name: string;
  task: VisionTask;
  description: string;
};

export type VisionAnalysisResult = {
  task: VisionTask;
  imageUrl: string;
  result: any;
  processingTime: number;
  timestamp: number;
};

export class VisionService extends BaseService {
  private models: VisionModel[] = [];
  private pipelines: Map<string, any> = new Map();
  private recentResults: VisionAnalysisResult[] = [];
  private isInitialized: boolean = false;
  private webGPUSupported: boolean = false;
  
  constructor() {
    super();
    this.initializeModels();
    this.checkWebGPU();
  }
  
  /**
   * Check if WebGPU is supported
   */
  private async checkWebGPU(): Promise<void> {
    try {
      this.webGPUSupported = typeof navigator.gpu !== 'undefined';
      
      if (this.webGPUSupported) {
        workspaceService.log('WebGPU is supported for vision tasks', 'vision.log');
      } else {
        workspaceService.log('WebGPU is not supported for vision tasks, using CPU backend', 'vision.log');
      }
    } catch (error) {
      console.error('Error checking WebGPU support for vision:', error);
      this.webGPUSupported = false;
    }
  }
  
  /**
   * Initialize available Vision models
   */
  private initializeModels(): void {
    this.models = [
      {
        id: 'image-classification',
        name: 'Image Classification',
        task: 'image-classification',
        description: 'Classify images into categories'
      },
      {
        id: 'object-detection',
        name: 'Object Detection',
        task: 'object-detection',
        description: 'Detect and locate objects within images'
      }
    ];
  }
  
  /**
   * Initialize the Vision service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      // Initialize with image classification model
      const classifierPipeline = await pipeline(
        'image-classification',
        'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k',
        { 
          device: this.webGPUSupported ? 'webgpu' : 'cpu'
        }
      );
      
      this.pipelines.set('image-classification', classifierPipeline);
      this.isInitialized = true;
      
      workspaceService.log('Vision Service initialized successfully', 'vision.log');
      return true;
    } catch (error) {
      console.error('Failed to initialize Vision service:', error);
      workspaceService.log(`Vision initialization error: ${error}`, 'vision.log');
      return false;
    }
  }
  
  /**
   * Load a specific Vision model
   */
  async loadModel(modelId: string): Promise<boolean> {
    const model = this.models.find(m => m.id === modelId);
    
    if (!model) {
      console.error(`Vision model ${modelId} not found`);
      return false;
    }
    
    // Check if already loaded
    if (this.pipelines.has(modelId)) {
      return true;
    }
    
    try {
      let modelPath;
      
      // Map model IDs to actual model paths
      switch (modelId) {
        case 'image-classification':
          modelPath = 'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k';
          break;
        case 'object-detection':
          modelPath = 'onnx-community/yolos-tiny';
          break;
        default:
          modelPath = 'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k';
      }
      
      toast.info(`Loading ${model.name} model...`, {
        description: "This might take a moment",
        duration: 5000
      });
      
      const visionPipeline = await pipeline(
        model.task,
        modelPath,
        { 
          device: this.webGPUSupported ? 'webgpu' : 'cpu'
        }
      );
      
      this.pipelines.set(modelId, visionPipeline);
      
      toast.success(`${model.name} model loaded successfully`);
      workspaceService.log(`Vision model ${modelId} loaded successfully`, 'vision.log');
      
      return true;
    } catch (error) {
      console.error(`Failed to load vision model ${modelId}:`, error);
      
      toast.error(`Failed to load vision model`, {
        description: `${model.name} could not be loaded`
      });
      
      workspaceService.log(`Error loading vision model ${modelId}: ${error}`, 'vision.log');
      return false;
    }
  }
  
  /**
   * Analyze an image using the specified model
   */
  async analyzeImage(imageUrl: string, modelId: string): Promise<VisionAnalysisResult | null> {
    if (!imageUrl || !modelId) {
      return null;
    }
    
    // Load model if not already loaded
    if (!this.pipelines.has(modelId)) {
      const loaded = await this.loadModel(modelId);
      if (!loaded) return null;
    }
    
    const pipeline = this.pipelines.get(modelId);
    const model = this.models.find(m => m.id === modelId);
    
    if (!pipeline || !model) return null;
    
    try {
      const startTime = performance.now();
      
      // Process image
      const result = await pipeline(imageUrl);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Save result
      const analysisResult: VisionAnalysisResult = {
        task: model.task,
        imageUrl,
        result,
        processingTime,
        timestamp: Date.now()
      };
      
      this.recentResults.push(analysisResult);
      
      // Keep only recent 10 results
      if (this.recentResults.length > 10) {
        this.recentResults.shift();
      }
      
      workspaceService.log(`Image analyzed with ${model.id}: ${processingTime.toFixed(2)}ms`, 'vision.log');
      return analysisResult;
    } catch (error) {
      console.error(`Error analyzing image with model ${modelId}:`, error);
      workspaceService.log(`Vision analysis error with ${modelId}: ${error}`, 'vision.log');
      return null;
    }
  }
  
  /**
   * Get all available models
   */
  getAvailableModels(): VisionModel[] {
    return [...this.models];
  }
  
  /**
   * Get recent analysis results
   */
  getRecentResults(): VisionAnalysisResult[] {
    return [...this.recentResults];
  }
  
  /**
   * Check if a specific model is loaded
   */
  isModelLoaded(modelId: string): boolean {
    return this.pipelines.has(modelId);
  }
  
  /**
   * Get initialization status
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Check WebGPU support status
   */
  isWebGPUSupported(): boolean {
    return this.webGPUSupported;
  }
}

export const visionService = new VisionService();
