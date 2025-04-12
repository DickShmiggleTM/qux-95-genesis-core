
/**
 * VisionService - Provides computer vision capabilities
 */
import { BaseService } from '../base/BaseService';
import { workspaceService } from '../workspaceService';
import { isWebGPUSupported } from '@/utils/browserCapabilities';
import { ollamaService } from '../ollama';
import { toast } from 'sonner';

// Vision processing types
export interface ImageClassification {
  label: string;
  confidence: number;
}

export interface DetectedObject {
  label: string;
  boundingBox: {
    x: number;   // x-coordinate of top-left corner (0-1)
    y: number;   // y-coordinate of top-left corner (0-1)
    width: number;  // width of box (0-1)
    height: number; // height of box (0-1)
  };
  confidence: number;
}

export interface ImageAnalysisResult {
  classifications?: ImageClassification[];
  detectedObjects?: DetectedObject[];
  processingTime?: number;
  imageSize?: {
    width: number;
    height: number;
  };
}

// Define interface for Vision models
export interface VisionModel {
  id: string;
  name: string;
  description: string;
  task: 'object-detection' | 'image-classification' | 'segmentation' | 'face-detection';
  size: number;
  source?: 'local' | 'ollama';
  modelFile?: string;
}

// Define interface for Vision analysis results
export interface VisionAnalysisResult {
  result: any;
  processingTime: number;
  imageInfo?: {
    width: number;
    height: number;
  };
  imageUrl?: string; // Add the imageUrl property to store the source URL
}

export class VisionService extends BaseService {
  private hasGPUAcceleration: boolean;
  private modelLoaded: boolean = false;
  private loadingPromise: Promise<boolean> | null = null;
  private availableModels: VisionModel[] = [
    {
      id: 'object-detection-model',
      name: 'Object Detection',
      description: 'Detects and locates objects in images',
      task: 'object-detection',
      size: 85,
      source: 'local'
    },
    {
      id: 'image-classification-model',
      name: 'Image Classification',
      description: 'Categorizes images into predefined classes',
      task: 'image-classification',
      size: 50,
      source: 'local'
    },
    {
      id: 'segmentation-model',
      name: 'Image Segmentation',
      description: 'Segments images into distinct objects',
      task: 'segmentation',
      size: 120,
      source: 'local'
    },
    {
      id: 'face-detection-model',
      name: 'Face Detection',
      description: 'Detects and analyzes faces in images',
      task: 'face-detection',
      size: 65,
      source: 'local'
    }
  ];

  private ollamaModels: VisionModel[] = [];

  constructor() {
    super();
    // Check for WebGPU support
    this.hasGPUAcceleration = isWebGPUSupported();
    workspaceService.log(`Vision Service initialized. GPU acceleration: ${this.hasGPUAcceleration ? 'available' : 'unavailable'}`, 'vision.log');
  }

  /**
   * Initialize the Vision service
   */
  public async initialize(): Promise<boolean> {
    workspaceService.log('Initializing Vision service...', 'vision.log');

    // Try to load Ollama vision models if available
    await this.loadOllamaVisionModels();

    return true;
  }

  /**
   * Load available vision models from Ollama
   */
  private async loadOllamaVisionModels(): Promise<void> {
    try {
      // Check if Ollama is connected
      const isConnected = await ollamaService.checkConnection();
      if (!isConnected) {
        workspaceService.log('Ollama not connected, skipping vision model loading', 'vision.log');
        return;
      }

      // Get all available models from Ollama
      const allModels = await ollamaService.loadAvailableModels();

      // Filter for vision-capable models
      // For now, we'll consider models with 'vision', 'llava', 'clip', or 'image' in their name
      const visionModels = allModels.filter(model => {
        const modelName = model.name.toLowerCase();
        return (
          modelName.includes('vision') ||
          modelName.includes('llava') ||
          modelName.includes('clip') ||
          modelName.includes('image') ||
          modelName.includes('visual')
        );
      });

      // Convert to VisionModel format
      this.ollamaModels = visionModels.map(model => ({
        id: `ollama-${model.id}`,
        name: model.name,
        description: `Ollama vision model (${model.parameters})`,
        task: 'image-classification', // Default task
        size: model.size || 0,
        source: 'ollama',
        modelFile: model.modelfile
      }));

      workspaceService.log(`Loaded ${this.ollamaModels.length} Ollama vision models`, 'vision.log');
    } catch (error) {
      workspaceService.log(`Error loading Ollama vision models: ${error}`, 'vision.log');
      console.error('Error loading Ollama vision models:', error);
    }
  }

  /**
   * Get available models
   */
  public getAvailableModels(): VisionModel[] {
    // Combine local and Ollama models
    return [...this.availableModels, ...this.ollamaModels];
  }

  /**
   * Get Ollama vision models
   */
  public getOllamaModels(): VisionModel[] {
    return this.ollamaModels;
  }

  /**
   * Check if WebGPU is supported
   */
  public isWebGPUSupported(): boolean {
    return this.hasGPUAcceleration;
  }

  /**
   * Check if model is loaded
   */
  public isModelLoaded(modelId: string): boolean {
    return this.modelLoaded;
  }

  /**
   * Load a specific model
   */
  public async loadModel(modelId: string): Promise<boolean> {
    return this.ensureModelLoaded();
  }

  /**
   * Load an image from a URL
   */
  private async loadImageFromUrl(imageUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Handle CORS
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  /**
   * Analyze an image with a specific model
   */
  public async analyzeImage(
    imageData: ImageData | HTMLImageElement | string,
    modelId: string = 'object-detection-model'
  ): Promise<VisionAnalysisResult> {
    await this.ensureModelLoaded(modelId);

    const startTime = performance.now();

    // Handle string URLs by converting to HTMLImageElement
    let imgElement: HTMLImageElement | null = null;
    let width: number;
    let height: number;
    let imageUrl: string | undefined;

    if (typeof imageData === 'string') {
      // It's a URL, load the image
      imageUrl = imageData;
      imgElement = await this.loadImageFromUrl(imageData);
      width = imgElement.naturalWidth;
      height = imgElement.naturalHeight;
    } else if ('naturalWidth' in imageData) {
      // It's already an HTMLImageElement
      imgElement = imageData;
      width = imageData.naturalWidth;
      height = imageData.naturalHeight;

      // Try to get the URL
      if (imageData.src) {
        imageUrl = imageData.src;
      }
    } else {
      // It's an ImageData object
      width = imageData.width;
      height = imageData.height;
    }

    let result;

    // Check if this is an Ollama model
    if (modelId.startsWith('ollama-')) {
      // Use Ollama for vision analysis
      try {
        // Extract the actual Ollama model ID
        const ollamaModelId = modelId.replace('ollama-', '');

        // Create a prompt for the vision model
        const prompt = "Analyze this image and describe what you see. Include any objects, people, scenes, or notable elements. Also provide any relevant classifications or categories for the image.";

        // Call Ollama vision API
        const response = await this.analyzeWithOllama(ollamaModelId, imageUrl || '', prompt);

        // Parse the response to extract classifications
        const classifications = this.parseOllamaVisionResponse(response);
        result = classifications;
      } catch (error) {
        console.error('Error analyzing with Ollama:', error);
        toast.error('Error analyzing with Ollama model', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });

        // Fallback to simulated results
        result = [
          { label: 'analysis_failed', confidence: 1.0 },
          { label: 'using_fallback_results', confidence: 1.0 }
        ];
      }
    } else {
      // Use local simulated models
      switch (modelId) {
        case 'object-detection-model':
          // Simulated object detections
          const possibleObjects = [
            'person', 'car', 'dog', 'cat', 'tree', 'building', 'furniture'
          ];

          // Generate 1-3 random object detections
          const numObjects = Math.floor(Math.random() * 3) + 1;
          const detectedObjects: DetectedObject[] = [];

          for (let i = 0; i < numObjects; i++) {
            const objectType = possibleObjects[Math.floor(Math.random() * possibleObjects.length)];

            detectedObjects.push({
              label: objectType,
              boundingBox: {
                x: Math.random() * 0.7,  // Random position
                y: Math.random() * 0.7,
                width: 0.1 + Math.random() * 0.3,  // Random size
                height: 0.1 + Math.random() * 0.3
              },
              confidence: 0.5 + Math.random() * 0.4  // Random confidence 0.5-0.9
            });
          }
          result = detectedObjects;
          break;

        case 'image-classification-model':
          // Simulated classifications
          const possibleClasses = [
            { label: 'landscape', confidence: 0.8 },
            { label: 'portrait', confidence: 0.3 },
            { label: 'indoor', confidence: 0.6 },
            { label: 'outdoor', confidence: 0.75 },
            { label: 'day', confidence: 0.9 },
            { label: 'night', confidence: 0.2 },
            { label: 'urban', confidence: 0.7 },
            { label: 'rural', confidence: 0.4 }
          ];

          // Randomly select 2-4 classifications
          const numClasses = Math.floor(Math.random() * 3) + 2;
          const shuffled = [...possibleClasses].sort(() => 0.5 - Math.random());
          result = shuffled.slice(0, numClasses);
          break;

        default:
          // Default to image classification
          result = [
            { label: 'unknown', confidence: 0.6 }
          ];
      }
    }

    const processingTime = performance.now() - startTime;

    return {
      result,
      processingTime,
      imageInfo: { width, height },
      imageUrl // Include the URL in the result
    };
  }

  /**
   * Ensure the vision model is loaded before processing
   */
  private async ensureModelLoaded(modelId: string): Promise<boolean> {
    // If model is already loaded, return immediately
    if (this.modelLoaded) return true;

    // If loading is in progress, wait for it
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading the model
    this.loadingPromise = new Promise<boolean>((resolve) => {
      workspaceService.log(`Loading vision model ${modelId}...`, 'vision.log');

      // For Ollama models, check if Ollama is connected
      if (modelId.startsWith('ollama-')) {
        ollamaService.checkConnection().then(connected => {
          if (!connected) {
            workspaceService.log('Ollama not connected, cannot load model', 'vision.log');
            toast.error('Ollama not connected', {
              description: 'Please make sure Ollama is running'
            });
            resolve(false);
            return;
          }

          // Ollama is connected, model should be available
          this.modelLoaded = true;
          workspaceService.log(`Ollama vision model ${modelId} ready`, 'vision.log');
          resolve(true);
        });
      } else {
        // Simulate model loading time for local models
        setTimeout(() => {
          this.modelLoaded = true;
          workspaceService.log('Vision model loaded successfully', 'vision.log');
          resolve(true);
        }, 1500);
      }
    });

    return this.loadingPromise;
  }

  /**
   * Analyze an image using Ollama vision model
   */
  private async analyzeWithOllama(modelId: string, imageUrl: string, prompt: string): Promise<string> {
    try {
      // Check if Ollama is connected
      const isConnected = await ollamaService.checkConnection();
      if (!isConnected) {
        throw new Error('Ollama is not connected');
      }

      // For now, we'll simulate the response since the actual API integration would depend on
      // how Ollama exposes vision capabilities
      workspaceService.log(`Analyzing image with Ollama model ${modelId}`, 'vision.log');

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a simulated response based on the image URL
      // In a real implementation, this would call the Ollama API
      let response = "";

      if (imageUrl.includes('nature') || imageUrl.includes('landscape')) {
        response = "The image shows a beautiful natural landscape with mountains and trees. Classifications: nature, outdoor, landscape, scenic, daytime.";
      } else if (imageUrl.includes('person') || imageUrl.includes('people')) {
        response = "I can see one or more people in this image. It appears to be a portrait or group photo. Classifications: person, portrait, human, indoor.";
      } else if (imageUrl.includes('city') || imageUrl.includes('urban')) {
        response = "This is an urban cityscape with buildings and infrastructure. Classifications: city, urban, buildings, architecture, man-made.";
      } else if (imageUrl.includes('food')) {
        response = "The image contains food items, possibly a prepared meal or ingredients. Classifications: food, culinary, edible, indoor.";
      } else if (imageUrl.includes('animal') || imageUrl.includes('pet')) {
        response = "I can see an animal in this image, possibly a pet or wildlife. Classifications: animal, living being, fauna.";
      } else if (imageUrl.includes('cyberpunk')) {
        response = "This image has a cyberpunk aesthetic with neon lights and futuristic elements. Classifications: cyberpunk, sci-fi, futuristic, digital, neon, urban.";
      } else {
        // Generic response for other images
        response = "The image contains various elements that I can identify. Classifications: object, scene, visual content, photograph.";
      }

      return response;
    } catch (error) {
      console.error('Error analyzing with Ollama:', error);
      throw error;
    }
  }

  /**
   * Parse Ollama vision response into classification format
   */
  private parseOllamaVisionResponse(response: string): ImageClassification[] {
    try {
      // Extract classifications from the response text
      const classifications: ImageClassification[] = [];

      // Look for the "Classifications:" section
      const classificationMatch = response.match(/Classifications:\s*([^\.]*)/);
      if (classificationMatch && classificationMatch[1]) {
        // Split by commas and clean up
        const classLabels = classificationMatch[1].split(',').map(label => label.trim());

        // Convert to classification objects with confidence scores
        classLabels.forEach((label, index) => {
          if (label) {
            // Assign decreasing confidence to items in the list
            const confidence = Math.max(0.95 - (index * 0.05), 0.6);
            classifications.push({
              label,
              confidence
            });
          }
        });
      }

      // If no classifications were found, extract key terms from the response
      if (classifications.length === 0) {
        // Split the response into words and find potential objects/subjects
        const words = response.split(/\s+/);
        const potentialLabels = words.filter(word =>
          word.length > 3 &&
          !['this', 'that', 'with', 'have', 'from', 'there', 'their', 'what', 'when', 'where'].includes(word.toLowerCase())
        );

        // Take up to 5 unique words as classifications
        const uniqueLabels = [...new Set(potentialLabels)].slice(0, 5);
        uniqueLabels.forEach((label, index) => {
          classifications.push({
            label: label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
            confidence: 0.8 - (index * 0.1)
          });
        });
      }

      // Add a classification for the overall description
      classifications.push({
        label: 'description',
        confidence: 1.0
      });

      // Store the full response as a special classification
      classifications.push({
        label: '_full_response',
        confidence: 1.0
      });

      return classifications;
    } catch (error) {
      console.error('Error parsing Ollama response:', error);
      return [
        { label: 'parsing_error', confidence: 1.0 },
        { label: '_full_response', confidence: 1.0 }
      ];
    }
  }
}

export const visionService = new VisionService();
