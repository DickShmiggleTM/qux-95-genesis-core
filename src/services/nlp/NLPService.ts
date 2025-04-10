/**
 * Natural Language Processing Service
 * 
 * Provides text analysis capabilities using Hugging Face transformers library
 */
import { BaseService } from '../base/BaseService';
import { pipeline, env } from '@huggingface/transformers';
import { toast } from 'sonner';
import { workspaceService } from '../workspaceService';

// Configure Hugging Face to use WebGPU when available
env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;

export type NLPTask = 'sentiment-analysis' | 'text-classification' | 'token-classification' | 'text-generation' | 'summarization' | 'feature-extraction';
export type NLPModel = {
  id: string;
  name: string;
  task: NLPTask;
  description: string;
  size: string; // Small, medium, large
  languages: string[];
};

export type NLPAnalysisResult = {
  task: NLPTask;
  result: any;
  processingTime: number;
  timestamp: number;
};

export class NLPService extends BaseService {
  private models: NLPModel[] = [];
  private pipelines: Map<string, any> = new Map();
  private recentResults: NLPAnalysisResult[] = [];
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
        workspaceService.log('WebGPU is supported', 'nlp.log');
      } else {
        workspaceService.log('WebGPU is not supported, using CPU backend', 'nlp.log');
      }
    } catch (error) {
      console.error('Error checking WebGPU support:', error);
      this.webGPUSupported = false;
    }
  }
  
  /**
   * Initialize available NLP models
   */
  private initializeModels(): void {
    // Default set of models (lightweight for browser use)
    this.models = [
      {
        id: 'sentiment-model',
        name: 'Sentiment Analysis',
        task: 'sentiment-analysis',
        description: 'Analyze sentiment of text as positive, negative, or neutral',
        size: 'small',
        languages: ['en']
      },
      {
        id: 'summarization-model',
        name: 'Text Summarization',
        task: 'summarization',
        description: 'Generate concise summaries of longer texts',
        size: 'medium',
        languages: ['en']
      },
      {
        id: 'ner-model',
        name: 'Named Entity Recognition',
        task: 'token-classification',
        description: 'Identify entities like people, organizations, locations in text',
        size: 'small',
        languages: ['en']
      },
      {
        id: 'embeddings-model',
        name: 'Text Embeddings',
        task: 'feature-extraction',
        description: 'Generate vector embeddings for text',
        size: 'small',
        languages: ['en', 'fr', 'de', 'es', 'zh']
      },
    ];
  }
  
  /**
   * Initialize the NLP service and load a default model
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      // Start with a lightweight model - sentiment analysis
      const sentimentPipeline = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        { 
          device: this.webGPUSupported ? 'webgpu' : 'cpu'
        }
      );
      
      this.pipelines.set('sentiment-model', sentimentPipeline);
      this.isInitialized = true;
      
      workspaceService.log('NLP Service initialized successfully', 'nlp.log');
      return true;
    } catch (error) {
      console.error('Failed to initialize NLP service:', error);
      workspaceService.log(`NLP initialization error: ${error}`, 'nlp.log');
      return false;
    }
  }
  
  /**
   * Load a specific NLP model
   */
  async loadModel(modelId: string): Promise<boolean> {
    const model = this.models.find(m => m.id === modelId);
    
    if (!model) {
      console.error(`Model ${modelId} not found`);
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
        case 'sentiment-model':
          modelPath = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
          break;
        case 'summarization-model':
          modelPath = 'Xenova/distilbart-cnn-6-6';
          break;
        case 'ner-model':
          modelPath = 'Xenova/bert-base-NER';
          break;
        case 'embeddings-model':
          modelPath = 'mixedbread-ai/mxbai-embed-xsmall-v1';
          break;
        default:
          modelPath = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
      }
      
      toast.info(`Loading ${model.name}...`, {
        description: "This might take a moment",
        duration: 5000
      });
      
      const nlpPipeline = await pipeline(
        model.task,
        modelPath,
        { 
          device: this.webGPUSupported ? 'webgpu' : 'cpu'
        }
      );
      
      this.pipelines.set(modelId, nlpPipeline);
      
      toast.success(`${model.name} loaded successfully`);
      workspaceService.log(`Model ${modelId} loaded successfully`, 'nlp.log');
      
      return true;
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      
      toast.error(`Failed to load model`, {
        description: `${model.name} could not be loaded`
      });
      
      workspaceService.log(`Error loading model ${modelId}: ${error}`, 'nlp.log');
      return false;
    }
  }
  
  /**
   * Analyze text using the specified model
   */
  async analyzeText(text: string, modelId: string): Promise<NLPAnalysisResult | null> {
    if (!text || !modelId) {
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
      
      // Process text based on the model's task
      let result;
      
      switch (model.task) {
        case 'sentiment-analysis':
          result = await pipeline(text);
          break;
        case 'summarization':
          result = await pipeline(text, { max_length: 150, min_length: 30 });
          break;
        case 'token-classification':
          result = await pipeline(text);
          break;
        case 'feature-extraction':
          result = await pipeline(text, { pooling: "mean", normalize: true });
          break;
        default:
          result = await pipeline(text);
      }
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Save result
      const analysisResult: NLPAnalysisResult = {
        task: model.task,
        result,
        processingTime,
        timestamp: Date.now()
      };
      
      this.recentResults.push(analysisResult);
      
      // Keep only recent 10 results
      if (this.recentResults.length > 10) {
        this.recentResults.shift();
      }
      
      workspaceService.log(`Text analyzed with ${model.id}: ${processingTime.toFixed(2)}ms`, 'nlp.log');
      return analysisResult;
    } catch (error) {
      console.error(`Error analyzing text with model ${modelId}:`, error);
      workspaceService.log(`Analysis error with ${modelId}: ${error}`, 'nlp.log');
      return null;
    }
  }
  
  /**
   * Get all available models
   */
  getAvailableModels(): NLPModel[] {
    return [...this.models];
  }
  
  /**
   * Get recent analysis results
   */
  getRecentResults(): NLPAnalysisResult[] {
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

export const nlpService = new NLPService();
