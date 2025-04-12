/**
 * NLPProcessor - Advanced Natural Language Processing capabilities
 * 
 * This module provides enhanced NLP capabilities beyond the basic NLPService,
 * including advanced text analysis, semantic understanding, and language generation.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { vectorEmbeddingService } from '../memory/VectorEmbeddingService';
import { ollamaService } from '../ollama/OllamaService';
import { ollamaMemoryEnhanced } from '../ollama/OllamaMemoryEnhanced';
import { workspaceService } from '../workspaceService';
import { optimizationSystem } from '../../core/optimization/OptimizationSystem';

// Types for NLP processing
export interface TextSegment {
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'sentence' | 'paragraph' | 'phrase' | 'token';
  metadata?: Record<string, any>;
}

export interface NamedEntity {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface Intent {
  name: string;
  confidence: number;
  entities: NamedEntity[];
  slots?: Record<string, any>;
}

export interface SemanticRole {
  role: 'subject' | 'action' | 'object' | 'location' | 'time' | 'manner' | 'purpose' | 'other';
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface SyntaxTree {
  type: string;
  text: string;
  children: SyntaxTree[];
  startIndex: number;
  endIndex: number;
}

export interface TextAnalysisResult {
  text: string;
  language: string;
  segments: TextSegment[];
  entities?: NamedEntity[];
  sentiment?: {
    score: number;
    label: string;
    confidence: number;
  };
  intents?: Intent[];
  topics?: Array<{
    name: string;
    confidence: number;
  }>;
  semanticRoles?: SemanticRole[];
  syntaxTree?: SyntaxTree;
  embedding?: number[];
  processingTime: number;
}

export interface TextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  model?: string;
}

export interface TextGenerationResult {
  generatedText: string;
  model: string;
  processingTime: number;
  tokenCount: number;
}

export interface TextSimilarityResult {
  similarity: number;
  method: string;
}

export interface KeyPhrase {
  text: string;
  score: number;
  startIndex: number;
  endIndex: number;
}

export class NLPProcessor extends EventEmitter {
  private isInitialized: boolean = false;
  private defaultModel: string = 'llama2';
  private embeddingModel: string = 'all-minilm';
  private languageDetector: any = null;
  private sentenceTokenizer: any = null;
  private wordTokenizer: any = null;
  private stopWords: Set<string> = new Set();
  
  // Self-learning and optimization related properties
  private learningEnabled: boolean = true;
  private selfModificationEnabled: boolean = true;
  private learningRate: number = 0.05;
  private usageStatistics: Map<string, number> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();
  private modelPerformance: Map<string, {
    accuracy: number;
    latency: number;
    usageCount: number;
  }> = new Map();
  private optContextId: string | null = null;
  
  // Configuration for self-learning
  private config = {
    adaptationInterval: 5000, // ms between adaptation cycles
    minSamplesForAdaptation: 10, // Minimum samples before adapting
    performanceWeight: 0.6, // Weight for performance in model selection
    latencyWeight: 0.4, // Weight for latency in model selection
    maxTemperature: 0.9, // Maximum temperature for generation
    minTemperature: 0.1, // Minimum temperature for generation
    defaultTemperature: 0.7, // Starting temperature
    temperatureAdaptationRate: 0.05, // How quickly to adapt temperature
    contextRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 1 week in ms
    selfEvaluationThreshold: 0.85, // Confidence threshold for self-evaluation
    improveModelsInterval: 24 * 60 * 60 * 1000, // 1 day in ms
    userFeedbackWeight: 0.8 // Weight given to explicit user feedback
  };
  
  // Available models and their capabilities
  private availableModels: {
    name: string;
    capabilities: string[];
    defaultForTasks?: string[];
    contextSize: number;
    lastEvaluation?: Date;
    evaluationScore?: number;
  }[] = [
    {
      name: 'llama2',
      capabilities: ['text-generation', 'summarization', 'sentiment-analysis', 'intent-recognition'],
      defaultForTasks: ['text-generation', 'intent-recognition'],
      contextSize: 4096
    },
    {
      name: 'all-minilm',
      capabilities: ['embedding', 'semantic-similarity'],
      defaultForTasks: ['embedding'],
      contextSize: 512
    },
    {
      name: 'bertsquad',
      capabilities: ['question-answering', 'entity-extraction'],
      contextSize: 512
    },
    {
      name: 'mistral',
      capabilities: ['text-generation', 'summarization', 'code-generation'],
      contextSize: 8192
    }
  ];
  
  constructor() {
    super();
    // Initialize basic NLP components
    this.initializeStopWords();
  }
  
  /**
   * Initialize the NLP processor
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      // Verify services are available
      if (!vectorEmbeddingService || !ollamaService) {
        console.error('Required services not available for NLPProcessor');
        return false;
      }
      
      // Initialize basic NLP models
      await this.initializeModels();
      
      // Setup self-learning capabilities
      this.setupSelfLearning();
      
      // Initialize model performance metrics
      this.initializeModelPerformance();
      
      this.isInitialized = true;
      console.log('NLPProcessor initialized successfully with self-learning capabilities');
      workspaceService.log('NLPProcessor initialized', 'nlp-system.log');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize NLPProcessor:', error);
      return false;
    }
  }
  
  /**
   * Initialize NLP models required for processing
   */
  private async initializeModels(): Promise<void> {
    try {
      // Initialize embeddings model for vector embeddings
      // Using type assertion since the interface may not be fully defined
      await (vectorEmbeddingService as any).loadEmbeddingModel(this.embeddingModel);
      
      // Initialize LLM for text generation and analysis
      // Using type assertion since the interface may not be fully defined
      await (ollamaService as any).ensureModelLoaded(this.defaultModel);
      
      console.log(`NLP models initialized: ${this.embeddingModel}, ${this.defaultModel}`);
    } catch (error) {
      console.error('Error initializing NLP models:', error);
      throw error;
    }
  }
  
  /**
   * Set up self-learning capabilities
   */
  private setupSelfLearning(): void {
    if (!this.learningEnabled) {
      console.log('Self-learning disabled for NLPProcessor');
      return;
    }
    
    // Start adaptation cycle
    setInterval(() => {
      this.adaptParameters();
    }, this.config.adaptationInterval);
    
    // Start model improvement cycle
    setInterval(() => {
      this.improveModelsInternal();
    }, this.config.improveModelsInterval);
    
    // Connect to optimization system for parameter tuning
    this.startParameterOptimization();
    
    console.log('Self-learning capabilities initialized for NLPProcessor');
  }
  
  /**
   * Initialize performance metrics for each model
   */
  private initializeModelPerformance(): void {
    for (const model of this.availableModels) {
      this.modelPerformance.set(model.name, {
        accuracy: 0.7, // Initial assumed accuracy
        latency: 500, // Initial assumed latency in ms
        usageCount: 0
      });
    }
  }
  
  /**
   * Analyze text with comprehensive NLP processing
   */
  public async analyzeText(text: string, options: {
    includeEntities?: boolean;
    includeSentiment?: boolean;
    includeIntents?: boolean;
    includeTopics?: boolean;
    includeSemanticRoles?: boolean;
    includeSyntaxTree?: boolean;
    includeEmbedding?: boolean;
  } = {}): Promise<TextAnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    // Default all options to true if not specified
    const opts = {
      includeEntities: true,
      includeSentiment: true,
      includeIntents: true,
      includeTopics: true,
      includeSemanticRoles: false,
      includeSyntaxTree: false,
      includeEmbedding: true,
      ...options
    };
    
    // Detect language
    const language = this.detectLanguage(text);
    
    // Segment text into sentences and tokens
    const segments = this.segmentText(text);
    
    // Create result object
    const result: TextAnalysisResult = {
      text,
      language,
      segments,
      processingTime: 0
    };
    
    // Process requested analyses in parallel
    const tasks: Promise<any>[] = [];
    
    if (opts.includeEntities) {
      tasks.push(this.extractEntities(text).then(entities => {
        result.entities = entities;
      }));
    }
    
    if (opts.includeSentiment) {
      tasks.push(this.analyzeSentiment(text).then(sentiment => {
        result.sentiment = sentiment;
      }));
    }
    
    if (opts.includeIntents) {
      tasks.push(this.recognizeIntents(text).then(intents => {
        result.intents = intents;
      }));
    }
    
    if (opts.includeTopics) {
      tasks.push(this.extractTopics(text).then(topics => {
        result.topics = topics;
      }));
    }
    
    if (opts.includeSemanticRoles) {
      tasks.push(this.extractSemanticRoles(text).then(roles => {
        result.semanticRoles = roles;
      }));
    }
    
    if (opts.includeSyntaxTree) {
      tasks.push(this.generateSyntaxTree(text).then(tree => {
        result.syntaxTree = tree;
      }));
    }
    
    if (opts.includeEmbedding) {
      tasks.push(vectorEmbeddingService.generateEmbedding(text).then(embedding => {
        result.embedding = embedding;
      }));
    }
    
    // Wait for all tasks to complete
    await Promise.all(tasks);
    
    // Calculate processing time
    result.processingTime = performance.now() - startTime;
    
    return result;
  }
  
  /**
   * Generate text based on a prompt
   */
  public async generateText(
    prompt: string,
    options: TextGenerationOptions = {}
  ): Promise<TextGenerationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    // Select the best model for text generation
    const model = options.model || this.getTaskModel('text-generation');
    
    // Apply adaptive temperature if not specified
    const temperature = options.temperature !== undefined 
      ? options.temperature 
      : this.config.defaultTemperature;
    
    try {
      // Make API call to generate text
      const result = await (ollamaService as any).generateText(prompt, {
        model,
        temperature,
        maxTokens: options.maxTokens || 1024,
        topP: options.topP || 0.9,
        frequencyPenalty: options.frequencyPenalty || 0.0,
        presencePenalty: options.presencePenalty || 0.0,
        stopSequences: options.stopSequences
      });
      
      const processingTime = Date.now() - startTime;
      
      // Track model latency
      this.trackLatency(model, processingTime);
      
      // Evaluate generation quality (simplified)
      // In a real system, this would use more sophisticated metrics
      const qualityScore = this.evaluateGenerationQuality(result.text, prompt);
      this.trackPerformance('text-generation', qualityScore);
      
      return {
        generatedText: result.text,
        model,
        processingTime,
        tokenCount: result.tokenCount || Math.floor(result.text.length / 4)
      };
    } catch (error) {
      console.error('Error generating text:', error);
      
      // Track failure
      this.trackPerformance('text-generation', 0.1);
      
      throw error;
    }
  }
  
  /**
   * Calculate semantic similarity between two texts
   */
  public async calculateTextSimilarity(
    textA: string,
    textB: string,
    method: 'cosine' | 'jaccard' | 'hybrid' = 'cosine'
  ): Promise<TextSimilarityResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    let similarity = 0;
    
    switch (method) {
      case 'cosine':
        // Use vector embeddings for cosine similarity
        const embeddingA = await vectorEmbeddingService.generateEmbedding(textA);
        const embeddingB = await vectorEmbeddingService.generateEmbedding(textB);
        
        if (embeddingA && embeddingB) {
          similarity = vectorEmbeddingService.calculateSimilarity(embeddingA, embeddingB);
        }
        break;
        
      case 'jaccard':
        // Use token sets for Jaccard similarity
        similarity = this.calculateJaccardSimilarity(textA, textB);
        break;
        
      case 'hybrid':
        // Combine both methods
        const embeddingSimPromise = (async () => {
          const embA = await vectorEmbeddingService.generateEmbedding(textA);
          const embB = await vectorEmbeddingService.generateEmbedding(textB);
          return embA && embB ? vectorEmbeddingService.calculateSimilarity(embA, embB) : 0;
        })();
        
        const jaccardSim = this.calculateJaccardSimilarity(textA, textB);
        const embeddingSim = await embeddingSimPromise;
        
        // Weight embedding similarity higher as it's more semantic
        similarity = (embeddingSim * 0.7) + (jaccardSim * 0.3);
        break;
    }
    
    return {
      similarity,
      method
    };
  }
  
  /**
   * Extract key phrases from text
   */
  public async extractKeyPhrases(text: string, maxPhrases: number = 10): Promise<KeyPhrase[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Tokenize text into sentences
    const sentences = this.tokenizeSentences(text);
    
    // Extract candidate phrases (noun phrases and verb phrases)
    const candidatePhrases: KeyPhrase[] = [];
    
    for (const sentence of sentences) {
      const sentenceStart = text.indexOf(sentence);
      if (sentenceStart === -1) continue;
      
      // Extract noun phrases (simplified approach)
      const nounPhrases = this.extractNounPhrases(sentence);
      
      for (const phrase of nounPhrases) {
        const phraseStart = sentence.indexOf(phrase);
        if (phraseStart === -1) continue;
        
        const startIndex = sentenceStart + phraseStart;
        const endIndex = startIndex + phrase.length;
        
        candidatePhrases.push({
          text: phrase,
          score: 0, // Will be calculated later
          startIndex,
          endIndex
        });
      }
    }
    
    // Score phrases based on:
    // 1. Term frequency
    // 2. Position in text (earlier = more important)
    // 3. Length of phrase (longer phrases often more informative)
    
    // Calculate term frequency
    const wordCounts = this.countWords(text);
    const totalWords = Object.values(wordCounts).reduce((sum, count) => sum + count, 0);
    
    // Score each phrase
    for (const phrase of candidatePhrases) {
      const words = this.tokenizeWords(phrase.text);
      
      // Calculate average term frequency of words in phrase
      let tfScore = 0;
      for (const word of words) {
        if (!this.stopWords.has(word.toLowerCase())) {
          tfScore += (wordCounts[word.toLowerCase()] || 0) / totalWords;
        }
      }
      tfScore = words.length > 0 ? tfScore / words.length : 0;
      
      // Position score (0-1, higher for phrases appearing earlier)
      const positionScore = 1 - (phrase.startIndex / text.length);
      
      // Length score (longer phrases get slightly higher scores, up to a point)
      const lengthScore = Math.min(phrase.text.length / 20, 1);
      
      // Combine scores (weighted)
      phrase.score = (tfScore * 0.5) + (positionScore * 0.3) + (lengthScore * 0.2);
    }
    
    // Sort by score and take top phrases
    return candidatePhrases
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPhrases);
  }
  
  /**
   * Summarize text to a specified length
   */
  public async summarizeText(
    text: string, 
    options: {
      maxLength?: number;
      method?: 'extractive' | 'abstractive';
      ratio?: number;
    } = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const opts = {
      maxLength: 200,
      method: 'extractive' as const,
      ratio: 0.3,
      ...options
    };
    
    if (opts.method === 'abstractive') {
      // Use LLM for abstractive summarization
      const prompt = `Please summarize the following text in ${opts.maxLength} characters or less:\n\n${text}`;
      
      const result = await this.generateText(prompt, {
        maxTokens: Math.floor(opts.maxLength / 4), // Rough estimate of tokens to characters
        temperature: 0.3 // Lower temperature for more focused summary
      });
      
      return result.generatedText;
    } else {
      // Extractive summarization
      return this.extractiveSummarize(text, opts.ratio, opts.maxLength);
    }
  }
  
  /**
   * Detect language of text
   */
  private detectLanguage(text: string): string {
    // Simplified language detection
    // In a real implementation, this would use a proper language detection library
    
    // Check for common English words
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'it', 'that', 'was', 'for', 'on'];
    const words = text.toLowerCase().split(/\s+/);
    
    let englishCount = 0;
    for (const word of words) {
      if (englishWords.includes(word)) {
        englishCount++;
      }
    }
    
    const englishRatio = englishCount / words.length;
    
    // Very simple heuristic - in a real system this would be much more sophisticated
    if (englishRatio > 0.1) {
      return 'en';
    }
    
    // Check for Spanish
    const spanishWords = ['el', 'la', 'los', 'las', 'es', 'en', 'y', 'que', 'de', 'por'];
    let spanishCount = 0;
    for (const word of words) {
      if (spanishWords.includes(word)) {
        spanishCount++;
      }
    }
    
    const spanishRatio = spanishCount / words.length;
    
    if (spanishRatio > 0.1) {
      return 'es';
    }
    
    // Default to English if we can't determine
    return 'en';
  }
  
  /**
   * Segment text into sentences, paragraphs, and tokens
   */
  private segmentText(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    let currentIndex = 0;
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        currentIndex += paragraph.length + 2; // +2 for the newlines
        continue;
      }
      
      const paragraphStart = currentIndex;
      const paragraphEnd = paragraphStart + paragraph.length;
      
      segments.push({
        text: paragraph,
        startIndex: paragraphStart,
        endIndex: paragraphEnd,
        type: 'paragraph'
      });
      
      // Split paragraph into sentences
      const sentences = this.tokenizeSentences(paragraph);
      let sentenceIndex = paragraphStart;
      
      for (const sentence of sentences) {
        // Find the actual start of this sentence in the paragraph
        const sentenceStart = paragraph.indexOf(sentence, sentenceIndex - paragraphStart) + paragraphStart;
        if (sentenceStart === -1 + paragraphStart) continue;
        
        sentenceIndex = sentenceStart;
        const sentenceEnd = sentenceStart + sentence.length;
        
        segments.push({
          text: sentence,
          startIndex: sentenceStart,
          endIndex: sentenceEnd,
          type: 'sentence'
        });
        
        // Split sentence into tokens (words)
        const words = this.tokenizeWords(sentence);
        let wordIndex = sentenceStart;
        
        for (const word of words) {
          // Find the actual start of this word in the sentence
          const wordStart = sentence.indexOf(word, wordIndex - sentenceStart) + sentenceStart;
          if (wordStart === -1 + sentenceStart) continue;
          
          wordIndex = wordStart;
          const wordEnd = wordStart + word.length;
          
          segments.push({
            text: word,
            startIndex: wordStart,
            endIndex: wordEnd,
            type: 'token'
          });
          
          wordIndex = wordEnd;
        }
        
        sentenceIndex = sentenceEnd;
      }
      
      currentIndex = paragraphEnd + 2; // +2 for the newlines
    }
    
    return segments;
  }
  
  /**
   * Extract named entities from text
   */
  private async extractEntities(text: string): Promise<NamedEntity[]> {
    // In a real implementation, this would use a proper NER model
    // For now, we'll use a rule-based approach with regex patterns
    
    const entities: NamedEntity[] = [];
    
    // Person names (simplified pattern)
    const namePattern = /(?<!\w)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?!\w)/g;
    let match;
    while ((match = namePattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'PERSON',
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.7
      });
    }
    
    // Organizations (simplified pattern)
    const orgPattern = /(?<!\w)([A-Z][a-z]*(?:\s+[A-Z][a-z]*)+\s+(?:Inc|Corp|LLC|Ltd|Company|Association|Organization))(?!\w)/g;
    while ((match = orgPattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'ORGANIZATION',
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.8
      });
    }
    
    // Locations (simplified pattern)
    const locationPattern = /(?<!\w)(?:in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?!\w)/g;
    while ((match = locationPattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'LOCATION',
        startIndex: match.index + match[0].indexOf(match[1]),
        endIndex: match.index + match[0].indexOf(match[1]) + match[1].length,
        confidence: 0.6
      });
    }
    
    // Dates (simplified pattern)
    const datePattern = /(?<!\w)(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})(?!\w)/g;
    while ((match = datePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'DATE',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9
      });
    }
    
    // Email addresses
    const emailPattern = /(?<!\w)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?!\w)/g;
    while ((match = emailPattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'EMAIL',
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.95
      });
    }
    
    // URLs
    const urlPattern = /(?<!\w)(https?:\/\/[^\s]+)(?!\w)/g;
    while ((match = urlPattern.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'URL',
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.95
      });
    }
    
    // Phone numbers (simplified pattern)
    const phonePattern = /(?<!\w)(?:\+\d{1,3}\s?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}(?!\w)/g;
    while ((match = phonePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'PHONE_NUMBER',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9
      });
    }
    
    // For more advanced entity recognition, we would use the LLM
    // This is a simplified approach for demonstration
    
    return entities;
  }
  
  /**
   * Analyze sentiment of text
   */
  private async analyzeSentiment(text: string): Promise<{
    score: number;
    label: string;
    confidence: number;
  }> {
    // In a real implementation, this would use a proper sentiment analysis model
    // For now, we'll use a lexicon-based approach
    
    const words = this.tokenizeWords(text.toLowerCase());
    
    // Simple sentiment lexicon
    const positiveWords = new Set([
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'happy', 'joy', 'love', 'like', 'best', 'better', 'positive',
      'awesome', 'outstanding', 'superb', 'perfect', 'brilliant',
      'delighted', 'pleased', 'satisfied', 'impressive', 'exceptional'
    ]);
    
    const negativeWords = new Set([
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor',
      'sad', 'unhappy', 'hate', 'dislike', 'negative', 'disappointed',
      'frustrating', 'annoying', 'unpleasant', 'mediocre', 'inadequate',
      'failure', 'problem', 'trouble', 'difficult', 'wrong', 'mistake'
    ]);
    
    // Intensifiers and their weights
    const intensifiers: Record<string, number> = {
      'very': 1.5,
      'extremely': 2.0,
      'really': 1.3,
      'absolutely': 1.8,
      'completely': 1.7,
      'totally': 1.6,
      'utterly': 1.9,
      'quite': 1.2,
      'somewhat': 0.7,
      'slightly': 0.5,
      'barely': 0.3,
      'hardly': 0.4,
      'not': -1.0, // Negation
      "don't": -1.0,
      "doesn't": -1.0,
      "didn't": -1.0,
      "won't": -1.0,
      "can't": -1.0,
      "cannot": -1.0,
      "isn't": -1.0,
      "aren't": -1.0,
      "wasn't": -1.0,
      "weren't": -1.0
    };
    
    let score = 0;
    let wordCount = 0;
    let intensifierMultiplier = 1.0;
    let negationActive = false;
    
    // Process each word
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check if this is an intensifier
      if (intensifiers[word] !== undefined) {
        if (intensifiers[word] < 0) {
          // This is a negation
          negationActive = true;
        } else {
          // This is an intensifier
          intensifierMultiplier = intensifiers[word];
        }
        continue;
      }
      
      // Check sentiment
      if (positiveWords.has(word)) {
        const wordScore = 1 * intensifierMultiplier;
        score += negationActive ? -wordScore : wordScore;
        wordCount++;
        
        // Reset modifiers
        intensifierMultiplier = 1.0;
        negationActive = false;
      } else if (negativeWords.has(word)) {
        const wordScore = -1 * intensifierMultiplier;
        score += negationActive ? -wordScore : wordScore;
        wordCount++;
        
        // Reset modifiers
        intensifierMultiplier = 1.0;
        negationActive = false;
      }
      
      // Negation typically affects only the next sentiment word
      if (i > 0 && negationActive && (positiveWords.has(word) || negativeWords.has(word))) {
        negationActive = false;
      }
    }
    
    // Normalize score between -1 and 1
    const normalizedScore = wordCount > 0 ? score / Math.sqrt(wordCount) : 0;
    const clampedScore = Math.max(-1, Math.min(1, normalizedScore));
    
    // Determine label
    let label: string;
    if (clampedScore < -0.3) label = 'negative';
    else if (clampedScore > 0.3) label = 'positive';
    else label = 'neutral';
    
    // Calculate confidence (higher for extreme values)
    const confidence = Math.min(0.95, 0.5 + Math.abs(clampedScore) * 0.5);
    
    return {
      score: clampedScore,
      label,
      confidence
    };
  }
  
  /**
   * Recognize intents from text
   */
  private async recognizeIntents(text: string): Promise<Intent[]> {
    // In a real implementation, this would use a proper intent recognition model
    // For now, we'll use a simple pattern matching approach
    
    const intents: Intent[] = [];
    const lowerText = text.toLowerCase();
    
    // Define some simple intent patterns
    const intentPatterns: Record<string, RegExp[]> = {
      'greeting': [
        /^(?:hi|hello|hey|greetings|good morning|good afternoon|good evening)(?:\s|$)/i,
        /^(?:how are you|how's it going|how are things)(?:\s|$)/i
      ],
      'farewell': [
        /^(?:bye|goodbye|see you|talk to you later|until next time)(?:\s|$)/i
      ],
      'search': [
        /(?:search for|find|look up|show me)\s+(.+?)(?:$|\?)/i,
        /(?:what is|who is|tell me about)\s+(.+?)(?:$|\?)/i
      ],
      'help': [
        /(?:help|assist|support|guide)(?:\s+me)?(?:\s+with)?(?:\s+(.+?))?(?:$|\?)/i,
        /(?:how do I|how can I|how to)\s+(.+?)(?:$|\?)/i
      ],
      'create': [
        /(?:create|make|build|generate|develop)\s+(?:a|an)?\s*(.+?)(?:$|\?)/i
      ],
      'delete': [
        /(?:delete|remove|eliminate|get rid of)\s+(?:the|this|that)?\s*(.+?)(?:$|\?)/i
      ],
      'update': [
        /(?:update|modify|change|edit)\s+(?:the|this|that)?\s*(.+?)(?:$|\?)/i
      ]
    };
    
    // Check each intent pattern
    for (const [intentName, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        const match = lowerText.match(pattern);
        if (match) {
          // Extract entities from the match
          const entities: NamedEntity[] = [];
          
          // If there's a capture group, it's likely an entity
          if (match[1]) {
            entities.push({
              text: match[1],
              type: 'ENTITY',
              startIndex: match.index! + match[0].indexOf(match[1]),
              endIndex: match.index! + match[0].indexOf(match[1]) + match[1].length,
              confidence: 0.8
            });
          }
          
          // Create intent object
          intents.push({
            name: intentName,
            confidence: 0.8,
            entities
          });
        }
      }
    }
    
    return intents;
  }
  
  /**
   * Adapt NLP parameters based on usage statistics and performance metrics
   */
  private adaptParameters(): void {
    if (!this.learningEnabled || this.usageStatistics.size < this.config.minSamplesForAdaptation) {
      return;
    }
    
    try {
      // Adjust temperature based on generation performance
      const generationPerformance = this.performanceMetrics.get('text-generation') || [];
      if (generationPerformance.length >= this.config.minSamplesForAdaptation) {
        const avgPerformance = generationPerformance.reduce((sum, value) => sum + value, 0) / generationPerformance.length;
        
        // If performance is good, increase temperature to encourage creativity
        // If performance is poor, decrease temperature for more conservative outputs
        const currentTemp = this.config.defaultTemperature;
        const newTemp = avgPerformance > 0.8 
          ? Math.min(this.config.maxTemperature, currentTemp + this.config.temperatureAdaptationRate)
          : Math.max(this.config.minTemperature, currentTemp - this.config.temperatureAdaptationRate);
        
        this.config.defaultTemperature = newTemp;
        console.log(`Adapted generation temperature to ${newTemp.toFixed(2)} based on performance`);
      }
      
      // Adjust learning rate based on recent adaptation success
      this.adaptLearningRate();
      
      // Update model selection based on performance
      this.selectOptimalModels();
      
      // Log adaptation event
      this.emit('parameters_adapted', {
        id: uuidv4(),
        source: 'NLPProcessor',
        type: 'PARAMETERS_ADAPTED',
        timestamp: new Date(),
        data: {
          learningRate: this.learningRate,
          temperature: this.config.defaultTemperature,
          models: Array.from(this.modelPerformance.entries())
            .map(([name, metrics]) => ({ name, ...metrics }))
        }
      });
      
      workspaceService.log(`NLPProcessor adapted parameters: temperature=${this.config.defaultTemperature}, learningRate=${this.learningRate}`, 'nlp-system.log');
    } catch (error) {
      console.error('Error during parameter adaptation:', error);
    }
  }
  
  /**
   * Adapt learning rate based on recent performance changes
   */
  private adaptLearningRate(): void {
    const performanceHistory = Array.from(this.performanceMetrics.values())
      .flat()
      .slice(-10); // Look at last 10 performance measurements
      
    if (performanceHistory.length < 5) return;
    
    // Calculate trend in performance metrics
    const recentAvg = performanceHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const prevAvg = performanceHistory.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const trend = recentAvg - prevAvg;
    
    // Adjust learning rate based on trend
    if (trend > 0.05) {
      // Performance improving - increase learning rate slightly
      this.learningRate = Math.min(0.2, this.learningRate * 1.1);
    } else if (trend < -0.05) {
      // Performance degrading - decrease learning rate
      this.learningRate = Math.max(0.01, this.learningRate * 0.9);
    }
    
    console.log(`Adapted learning rate to ${this.learningRate.toFixed(3)} based on performance trend: ${trend.toFixed(3)}`);
  }
  
  /**
   * Select optimal models for each task based on performance metrics
   */
  private selectOptimalModels(): void {
    const tasks = new Set(this.availableModels.flatMap(m => m.capabilities));
    
    for (const task of tasks) {
      const modelScores = this.availableModels
        .filter(model => model.capabilities.includes(task))
        .map(model => {
          const performance = this.modelPerformance.get(model.name);
          if (!performance) return { model, score: 0 };
          
          // Score is weighted combination of accuracy and inverse latency
          const score = (performance.accuracy * this.config.performanceWeight) + 
                       ((1000 / performance.latency) * this.config.latencyWeight);
          return { model, score };
        })
        .sort((a, b) => b.score - a.score);
      
      if (modelScores.length > 0) {
        // Set the best model as default for this task
        const bestModel = modelScores[0].model;
        this.availableModels = this.availableModels.map(model => {
          if (model.name === bestModel.name) {
            const defaultTasks = model.defaultForTasks || [];
            if (!defaultTasks.includes(task)) {
              defaultTasks.push(task);
            }
            return { ...model, defaultForTasks: defaultTasks };
          } else {
            // Remove this task from defaultForTasks if it exists
            const defaultTasks = model.defaultForTasks?.filter(t => t !== task) || [];
            return { ...model, defaultForTasks: defaultTasks };
          }
        });
        
        console.log(`Selected ${bestModel.name} as optimal model for ${task} (score: ${modelScores[0].score.toFixed(2)})`);
      }
    }
  }
  
  /**
   * Connect to optimization system for parameter tuning
   */
  private startParameterOptimization(): void {
    // Create optimization context
    if (!optimizationSystem) {
      console.warn('Optimization system not available, skipping parameter optimization');
      return;
    }
    
    try {
      // Create optimization context with NLP objective function
      // Using type assertion since the interface may not match exactly
      this.optContextId = (optimizationSystem as any).createOptimizationContext({
        objectiveName: 'nlp_parameter_optimization',
        objective: this.nlpObjectiveFunction.bind(this),
        parameters: [
          { name: 'defaultTemperature', min: 0.1, max: 0.9, step: 0.05 },
          { name: 'learningRate', min: 0.01, max: 0.2, step: 0.01 },
          { name: 'performanceWeight', min: 0.3, max: 0.8, step: 0.05 },
          { name: 'minSamplesForAdaptation', min: 5, max: 20, step: 1 }
        ],
        method: 'bayesian',
        maxIterations: 30,
        enableCaching: true
      });
      
      console.log(`Started parameter optimization with context ID: ${this.optContextId}`);
      
      // Schedule periodic optimization runs
      setInterval(() => {
        if (this.optContextId && this.performanceMetrics.size > 0) {
          // Using type assertion for optimization system call
          (optimizationSystem as any).runOptimization(this.optContextId, {
            maxIterations: 5,
            earlyStoppingEnabled: true
          });
        }
      }, 3600000); // Run every hour
    } catch (error) {
      console.error('Failed to start parameter optimization:', error);
    }
  }
  
  /**
   * Track performance metrics for a specific NLP task
   */
  public trackPerformance(task: string, performanceScore: number): void {
    if (!this.learningEnabled) return;
    
    // Update usage statistics
    const usageCount = this.usageStatistics.get(task) || 0;
    this.usageStatistics.set(task, usageCount + 1);
    
    // Update performance metrics
    const metrics = this.performanceMetrics.get(task) || [];
    metrics.push(performanceScore);
    
    // Keep only last 100 metrics
    while (metrics.length > 100) {
      metrics.shift();
    }
    
    this.performanceMetrics.set(task, metrics);
    
    // Update model performance
    const model = this.getTaskModel(task);
    if (model) {
      const modelPerf = this.modelPerformance.get(model) || {
        accuracy: 0.7,
        latency: 500,
        usageCount: 0
      };
      
      // Weighted update of accuracy
      const newAccuracy = (modelPerf.accuracy * 0.9) + (performanceScore * 0.1);
      this.modelPerformance.set(model, {
        ...modelPerf,
        accuracy: newAccuracy,
        usageCount: modelPerf.usageCount + 1
      });
    }
    
    // Log performance tracking
    if (performanceScore < 0.5) {
      console.warn(`Low performance detected for task '${task}': ${performanceScore.toFixed(2)}`);
    }
  }
  
  /**
   * Get the best model for a specific task
   */
  private getTaskModel(task: string): string {
    // Find models that support this task
    const supportingModels = this.availableModels.filter(
      model => model.capabilities.includes(task)
    );
    
    if (supportingModels.length === 0) {
      return this.defaultModel;
    }
    
    // Find default model for this task if available
    const defaultModel = supportingModels.find(
      model => model.defaultForTasks?.includes(task)
    );
    
    if (defaultModel) {
      return defaultModel.name;
    }
    
    // Otherwise return the first supporting model
    return supportingModels[0].name;
  }
  
  /**
   * Track latency for a specific model
   */
  private trackLatency(model: string, latencyMs: number): void {
    if (!this.learningEnabled) return;
    
    const performance = this.modelPerformance.get(model);
    if (performance) {
      // Exponential moving average for latency
      const newLatency = (performance.latency * 0.9) + (latencyMs * 0.1);
      this.modelPerformance.set(model, {
        ...performance,
        latency: newLatency
      });
    }
  }
  
  /**
   * Process user feedback on NLP output
   */
  public processFeedback(task: string, feedbackScore: number, metadata?: any): void {
    if (!this.learningEnabled) return;
    
    // Apply user feedback with higher weight than automatic metrics
    const existingMetrics = this.performanceMetrics.get(task) || [];
    const weightedScore = feedbackScore * this.config.userFeedbackWeight;
    
    // Add weighted user feedback to metrics
    for (let i = 0; i < 3; i++) {  // Add multiple times to increase weight
      existingMetrics.push(weightedScore);
    }
    
    // Keep only last 100 metrics
    while (existingMetrics.length > 100) {
      existingMetrics.shift();
    }
    
    this.performanceMetrics.set(task, existingMetrics);
    
    // Log feedback
    console.log(`Processed user feedback for task '${task}': ${feedbackScore.toFixed(2)}`);
    workspaceService.log(`NLP Feedback: task=${task}, score=${feedbackScore.toFixed(2)}`, 'nlp-system.log');
    
    // Emit feedback event
    this.emit('feedback_processed', {
      id: uuidv4(),
      source: 'NLPProcessor',
      type: 'FEEDBACK_PROCESSED',
      timestamp: new Date(),
      data: {
        task,
        feedbackScore,
        metadata
      }
    });
  }
  
  /**
   * Improve models through training and fine-tuning
   */
  private async improveModelsInternal(): Promise<void> {
    if (!this.selfModificationEnabled) {
      return;
    }
    
    try {
      // Find models due for improvement
      const modelsToImprove = this.availableModels.filter(model => {
        // Check if model has been evaluated recently
        const lastEval = model.lastEvaluation || new Date(0);
        const daysSinceEval = (Date.now() - lastEval.getTime()) / (24 * 60 * 60 * 1000);
        
        // Check if performance is below threshold
        const performance = this.modelPerformance.get(model.name);
        const poorPerformance = performance && performance.accuracy < 0.7;
        
        // Improve if either condition is true
        return daysSinceEval > 7 || poorPerformance;
      });
      
      for (const model of modelsToImprove) {
        console.log(`Scheduling improvement for model: ${model.name}`);
        
        // Evaluate current model performance
        const evalScore = await this.evaluateModel(model.name);
        model.evaluationScore = evalScore;
        model.lastEvaluation = new Date();
        
        // If performance is poor, attempt to improve
        if (evalScore < this.config.selfEvaluationThreshold) {
          await this.improveModel(model.name);
        }
      }
    } catch (error) {
      console.error('Error during model improvement cycle:', error);
    }
  }
  
  /**
   * Evaluate a model's performance
   */
  private async evaluateModel(modelName: string): Promise<number> {
    try {
      console.log(`Evaluating model: ${modelName}`);
      
      // Get model performance metrics
      const performance = this.modelPerformance.get(modelName);
      if (!performance) return 0;
      
      // For now, return the current accuracy metric
      // In a real implementation, this would run benchmark tests
      return performance.accuracy;
    } catch (error) {
      console.error(`Error evaluating model ${modelName}:`, error);
      return 0;
    }
  }
  
  /**
   * Improve a specific model through fine-tuning
   */
  private async improveModel(modelName: string): Promise<void> {
    try {
      console.log(`Attempting to improve model: ${modelName}`);
      
      // In a real implementation, this would collect training data and 
      // trigger fine-tuning through Ollama
      
      // Simulate improvement with immediate feedback
      const currentPerf = this.modelPerformance.get(modelName);
      if (currentPerf) {
        const improvedPerf = {
          ...currentPerf,
          accuracy: Math.min(0.95, currentPerf.accuracy + 0.05)
        };
        this.modelPerformance.set(modelName, improvedPerf);
        
        console.log(`Improved ${modelName} accuracy from ${currentPerf.accuracy.toFixed(2)} to ${improvedPerf.accuracy.toFixed(2)}`);
        
        // Emit self-modification event
        this.emit('model_improved', {
          id: uuidv4(),
          source: 'NLPProcessor',
          type: 'MODEL_IMPROVED',
          timestamp: new Date(),
          data: {
            model: modelName,
            previousAccuracy: currentPerf.accuracy,
            newAccuracy: improvedPerf.accuracy
          }
        });
      }
    } catch (error) {
      console.error(`Error improving model ${modelName}:`, error);
    }
  }
  
  /**
   * NLP objective function for optimization
   */
  private nlpObjectiveFunction(params: any): { value: number; gradients?: number[] } {
    const [temperature, learningRate, performanceWeight, minSamples] = [
      params.defaultTemperature,
      params.learningRate,
      params.performanceWeight,
      params.minSamplesForAdaptation
    ];
    
    // Calculate composite performance score from all tasks
    let totalScore = 0;
    let taskCount = 0;
    
    for (const [task, metrics] of this.performanceMetrics.entries()) {
      if (metrics.length >= minSamples) {
        const avgPerformance = metrics.reduce((a, b) => a + b, 0) / metrics.length;
        totalScore += avgPerformance;
        taskCount++;
      }
    }
    
    if (taskCount === 0) return { value: 0 };
    
    // Calculate average latency across models
    const avgLatency = Array.from(this.modelPerformance.values())
      .reduce((sum, perf) => sum + perf.latency, 0) / this.modelPerformance.size;
    
    // Normalize latency score (lower is better)
    const latencyScore = Math.max(0, 1 - (avgLatency / 2000));
    
    // Combined objective value
    const value = (totalScore / taskCount) * performanceWeight + 
                  latencyScore * (1 - performanceWeight);
    
    // Simple gradient approximation (optional)
    return { value };
  }
  
  /**
   * Evaluate the quality of generated text
   */
  private evaluateGenerationQuality(generatedText: string, prompt: string): number {
    // Simple heuristics for quality evaluation
    // In a real implementation, this would be more sophisticated
    
    // Length check - too short responses are likely poor quality
    if (generatedText.length < 20) {
      return 0.3;
    }
    
    // Repetition check - repeated phrases indicate lower quality
    const words = generatedText.split(/\s+/);
    const uniqueWords = new Set(words);
    const uniqueRatio = uniqueWords.size / words.length;
    
    // Relevance check - does it contain key terms from prompt
    const promptWords = new Set(prompt.toLowerCase().split(/\s+/));
    const foundPromptWords = Array.from(promptWords).filter(word => 
      generatedText.toLowerCase().includes(word)
    );
    const promptRelevance = foundPromptWords.length / promptWords.size;
    
    // Combined score
    return (
      (uniqueRatio * 0.4) + 
      (promptRelevance * 0.4) + 
      0.2  // Base score
    );
  }
  
  /**
   * Self-evaluation of NLP processor capabilities
   */
  public async evaluateCapabilities(): Promise<{
    capabilities: Record<string, number>;
    overallScore: number;
    recommendations: string[];
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const capabilities: Record<string, number> = {};
    const recommendations: string[] = [];
    
    // Evaluate each task based on performance metrics
    const tasks = Array.from(this.performanceMetrics.keys());
    let totalScore = 0;
    
    for (const task of tasks) {
      const metrics = this.performanceMetrics.get(task) || [];
      if (metrics.length === 0) {
        capabilities[task] = 0.5;  // Default score
        recommendations.push(`Gather more data for ${task} evaluation`);
        continue;
      }
      
      // Calculate average performance
      const avgPerformance = metrics.reduce((a, b) => a + b, 0) / metrics.length;
      capabilities[task] = avgPerformance;
      totalScore += avgPerformance;
      
      // Generate recommendations
      if (avgPerformance < 0.6) {
        recommendations.push(`Improve ${task} capabilities through additional training`);
      }
    }
    
    // Calculate overall score
    const overallScore = tasks.length > 0 
      ? totalScore / tasks.length 
      : 0.5;
    
    // Check model coverage
    const allTasks = new Set(this.availableModels.flatMap(m => m.capabilities));
    const missingTasks = Array.from(allTasks).filter(task => !tasks.includes(task));
    
    if (missingTasks.length > 0) {
      recommendations.push(`Activate and evaluate these capabilities: ${missingTasks.join(', ')}`);
    }
    
    return {
      capabilities,
      overallScore,
      recommendations
    };
  }
  
  /**
   * Initialize common stop words
   */
  private initializeStopWords(): void {
    const commonStopWords = [
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
      'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
      'that', 'the', 'to', 'was', 'were', 'will', 'with'
    ];
    
    this.stopWords = new Set(commonStopWords);
  }

  private async extractTopics(text: string): Promise<Array<{ name: string; confidence: number }>> {
    // Use LLM to extract topics
    const prompt = `Extract the main topics from the following text. Return only the topic names and confidence scores:\n\n${text}`;
    
    const result = await this.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 100
    });

    // Parse the response into topics
    const topics: Array<{ name: string; confidence: number }> = [];
    
    // Simple parsing of generated text into topics
    const lines = result.generatedText.split('\n');
    for (const line of lines) {
      const match = line.match(/(.+?)(?:\s*[-:]\s*(\d+(?:\.\d+)?%?)|$)/);
      if (match) {
        topics.push({
          name: match[1].trim(),
          confidence: match[2] ? parseFloat(match[2]) / 100 : 0.7
        });
      }
    }

    return topics;
  }

  /**
   * Extract semantic roles from text (subject, action, object, etc.)
   */
  private async extractSemanticRoles(text: string): Promise<SemanticRole[]> {
    // In a real implementation, this would use a dependency parser or SRL model
    // This is a simplified rule-based approach for demonstration purposes
    
    const roles: SemanticRole[] = [];
    const sentences = this.tokenizeSentences(text);
    
    for (const sentence of sentences) {
      const sentenceStart = text.indexOf(sentence);
      if (sentenceStart === -1) continue;
      
      // Very basic SVO (Subject-Verb-Object) extraction
      // This is a simplified approach and won't work well for complex sentences
      const words = this.tokenizeWords(sentence);
      
      // Simplified subject extraction (usually the first noun phrase)
      let subjectEnd = -1;
      for (let i = 0; i < words.length; i++) {
        if (this.isVerb(words[i])) {
          subjectEnd = i;
          break;
        }
      }
      
      if (subjectEnd > 0) {
        const subject = words.slice(0, subjectEnd).join(' ');
        const subjectStart = sentence.indexOf(subject);
        
        if (subjectStart !== -1) {
          roles.push({
            role: 'subject',
            text: subject,
            startIndex: sentenceStart + subjectStart,
            endIndex: sentenceStart + subjectStart + subject.length
          });
        }
        
        // Extract verb/action
        if (subjectEnd < words.length) {
          let verbEnd = -1;
          for (let i = subjectEnd + 1; i < words.length; i++) {
            if (!this.isVerb(words[i]) && !this.isAdverb(words[i])) {
              verbEnd = i;
              break;
            }
          }
          
          if (verbEnd === -1) verbEnd = words.length;
          
          const action = words.slice(subjectEnd, verbEnd).join(' ');
          const actionStart = sentence.indexOf(action, subjectStart + subject.length);
          
          if (actionStart !== -1) {
            roles.push({
              role: 'action',
              text: action,
              startIndex: sentenceStart + actionStart,
              endIndex: sentenceStart + actionStart + action.length
            });
          }
          
          // Extract object (anything after the verb)
          if (verbEnd < words.length) {
            const object = words.slice(verbEnd).join(' ');
            const objectStart = sentence.indexOf(object, actionStart + action.length);
            
            if (objectStart !== -1) {
              roles.push({
                role: 'object',
                text: object,
                startIndex: sentenceStart + objectStart,
                endIndex: sentenceStart + objectStart + object.length
              });
            }
          }
        }
      }
    }
    
    return roles;
  }
  
  /**
   * Generate syntax tree for text
   */
  private async generateSyntaxTree(text: string): Promise<SyntaxTree> {
    // In a real implementation, this would use a proper syntactic parser
    // For now, we'll create a very simplified syntax tree
    
    const sentences = this.tokenizeSentences(text);
    const children: SyntaxTree[] = [];
    
    let currentIndex = 0;
    for (const sentence of sentences) {
      const sentenceStart = text.indexOf(sentence, currentIndex);
      if (sentenceStart === -1) continue;
      
      currentIndex = sentenceStart + sentence.length;
      
      // Parse each sentence into a simple tree
      const sentenceTree = this.parseSentence(sentence, sentenceStart);
      children.push(sentenceTree);
    }
    
    return {
      type: 'DOCUMENT',
      text: text,
      children,
      startIndex: 0,
      endIndex: text.length
    };
  }
  
  /**
   * Parse a sentence into a syntax tree
   */
  private parseSentence(sentence: string, startOffset: number): SyntaxTree {
    const words = this.tokenizeWords(sentence);
    const children: SyntaxTree[] = [];
    
    let phraseStart = 0;
    let phraseType = 'NP'; // Start with assumption of a noun phrase
    let currentPhrase: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Simple phrase boundary detection based on parts of speech
      // (this is extremely simplified compared to real syntactic parsing)
      if (this.isVerb(word) && phraseType === 'NP') {
        // End of noun phrase, start of verb phrase
        if (currentPhrase.length > 0) {
          const phraseText = currentPhrase.join(' ');
          const phraseOffset = sentence.indexOf(phraseText, phraseStart);
          
          if (phraseOffset !== -1) {
            children.push({
              type: phraseType,
              text: phraseText,
              children: this.parsePhrase(phraseText, startOffset + phraseOffset),
              startIndex: startOffset + phraseOffset,
              endIndex: startOffset + phraseOffset + phraseText.length
            });
          }
        }
        
        phraseType = 'VP';
        currentPhrase = [word];
        phraseStart = sentence.indexOf(word, phraseStart);
      } else if ((this.isPreposition(word) || this.isSubordinator(word)) && phraseType === 'VP') {
        // End of verb phrase, start of prepositional or subordinate clause
        if (currentPhrase.length > 0) {
          const phraseText = currentPhrase.join(' ');
          const phraseOffset = sentence.indexOf(phraseText, phraseStart);
          
          if (phraseOffset !== -1) {
            children.push({
              type: phraseType,
              text: phraseText,
              children: this.parsePhrase(phraseText, startOffset + phraseOffset),
              startIndex: startOffset + phraseOffset,
              endIndex: startOffset + phraseOffset + phraseText.length
            });
          }
        }
        
        phraseType = this.isPreposition(word) ? 'PP' : 'SBAR';
        currentPhrase = [word];
        phraseStart = sentence.indexOf(word, phraseStart);
      } else {
        currentPhrase.push(word);
      }
    }
    
    // Add the final phrase
    if (currentPhrase.length > 0) {
      const phraseText = currentPhrase.join(' ');
      const phraseOffset = sentence.indexOf(phraseText, phraseStart);
      
      if (phraseOffset !== -1) {
        children.push({
          type: phraseType,
          text: phraseText,
          children: this.parsePhrase(phraseText, startOffset + phraseOffset),
          startIndex: startOffset + phraseOffset,
          endIndex: startOffset + phraseOffset + phraseText.length
        });
      }
    }
    
    return {
      type: 'S',
      text: sentence,
      children,
      startIndex: startOffset,
      endIndex: startOffset + sentence.length
    };
  }
  
  /**
   * Parse a phrase into a syntax tree
   */
  private parsePhrase(phrase: string, startOffset: number): SyntaxTree[] {
    const words = this.tokenizeWords(phrase);
    const trees: SyntaxTree[] = [];
    
    let currentPos = 0;
    for (const word of words) {
      const wordPos = phrase.indexOf(word, currentPos);
      if (wordPos === -1) continue;
      
      currentPos = wordPos + word.length;
      
      // Determine word type
      let type = 'N'; // Default assumption
      if (this.isVerb(word)) type = 'V';
      else if (this.isAdjective(word)) type = 'ADJ';
      else if (this.isAdverb(word)) type = 'ADV';
      else if (this.isDeterminer(word)) type = 'DET';
      else if (this.isPreposition(word)) type = 'P';
      else if (this.isConjunction(word)) type = 'CONJ';
      
      trees.push({
        type,
        text: word,
        children: [],
        startIndex: startOffset + wordPos,
        endIndex: startOffset + wordPos + word.length
      });
    }
    
    return trees;
  }
  
  /**
   * Calculate Jaccard similarity between two texts
   */
  private calculateJaccardSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(this.tokenizeWords(textA.toLowerCase()));
    const wordsB = new Set(this.tokenizeWords(textB.toLowerCase()));
    
    // Calculate intersection size
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    
    // Calculate union size
    const union = new Set([...wordsA, ...wordsB]);
    
    // Calculate Jaccard similarity (intersection size / union size)
    return intersection.size / union.size;
  }
  
  /**
   * Tokenize text into sentences
   */
  private tokenizeSentences(text: string): string[] {
    // Simple regex-based sentence splitting
    // This is a simplified approach and won't handle all cases correctly
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    // Handle cases where punctuation isn't followed by whitespace
    const result: string[] = [];
    for (const sentence of sentences) {
      if (sentence.trim().length === 0) continue;
      
      // Check if the sentence ends with a punctuation mark
      if (/[.!?]$/.test(sentence)) {
        result.push(sentence);
      } else {
        // Look for punctuation marks within the sentence
        const innerSentences = sentence.split(/(?<=[.!?])(?=[A-Z])/);
        for (const innerSentence of innerSentences) {
          if (innerSentence.trim().length > 0) {
            result.push(innerSentence);
          }
        }
      }
    }
    
    return result.length > 0 ? result : [text];
  }
  
  /**
   * Extract noun phrases from a sentence
   */
  private extractNounPhrases(sentence: string): string[] {
    const words = this.tokenizeWords(sentence);
    const phrases: string[] = [];
    
    let currentPhrase: string[] = [];
    let inNounPhrase = false;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check if this word can be part of a noun phrase
      if (this.isDeterminer(word) || this.isAdjective(word) || this.isNoun(word)) {
        if (!inNounPhrase) {
          inNounPhrase = true;
          currentPhrase = [word];
        } else {
          currentPhrase.push(word);
        }
      } else {
        // End of noun phrase
        if (inNounPhrase && currentPhrase.length > 0) {
          // Only add the phrase if it ends with a noun
          const lastWord = currentPhrase[currentPhrase.length - 1];
          if (this.isNoun(lastWord)) {
            phrases.push(currentPhrase.join(' '));
          }
          inNounPhrase = false;
        }
      }
    }
    
    // Check if there's a final noun phrase
    if (inNounPhrase && currentPhrase.length > 0) {
      const lastWord = currentPhrase[currentPhrase.length - 1];
      if (this.isNoun(lastWord)) {
        phrases.push(currentPhrase.join(' '));
      }
    }
    
    return phrases;
  }
  
  /**
   * Count word frequencies in text
   */
  private countWords(text: string): Record<string, number> {
    const words = this.tokenizeWords(text.toLowerCase());
    const counts: Record<string, number> = {};
    
    for (const word of words) {
      if (!this.stopWords.has(word)) {
        counts[word] = (counts[word] || 0) + 1;
      }
    }
    
    return counts;
  }
  
  /**
   * Tokenize text into words
   */
  private tokenizeWords(text: string): string[] {
    // Simple regex-based word tokenization
    return text.split(/\s+/).filter(word => word.length > 0);
  }
  
  /**
   * Extractive text summarization
   */
  private extractiveSummarize(text: string, ratio: number, maxLength?: number): string {
    const sentences = this.tokenizeSentences(text);
    if (sentences.length <= 1) return text;
    
    // Calculate number of sentences to include
    const numSentences = Math.max(1, Math.min(
      sentences.length,
      Math.ceil(sentences.length * ratio)
    ));
    
    // Score sentences based on importance
    const sentenceScores: { sentence: string; score: number; index: number }[] = [];
    
    // Count word frequencies
    const wordCounts = this.countWords(text);
    const totalWords = Object.values(wordCounts).reduce((sum, count) => sum + count, 0);
    
    // Calculate sentence scores
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const words = this.tokenizeWords(sentence.toLowerCase());
      
      // Score based on word frequency
      let score = 0;
      for (const word of words) {
        if (!this.stopWords.has(word) && wordCounts[word]) {
          score += wordCounts[word];
        }
      }
      
      // Normalize by sentence length (avoid bias toward longer sentences)
      if (words.length > 0) {
        score = score / words.length;
      }
      
      // Boost score for sentences that appear at the beginning
      if (i === 0) score *= 1.5;
      else if (i < sentences.length * 0.1) score *= 1.2;
      
      sentenceScores.push({ sentence, score, index: i });
    }
    
    // Sort sentences by score (highest first)
    sentenceScores.sort((a, b) => b.score - a.score);
    
    // Take top sentences up to the desired amount
    const topSentences = sentenceScores.slice(0, numSentences);
    
    // Re-order sentences based on original position
    topSentences.sort((a, b) => a.index - b.index);
    
    // Combine sentences to form summary
    let summary = topSentences.map(item => item.sentence).join(' ');
    
    // Respect maximum length if provided
    if (maxLength !== undefined && summary.length > maxLength) {
      let truncated = summary.substring(0, maxLength);
      
      // Try to end at sentence boundary
      const lastPeriod = truncated.lastIndexOf('.');
      if (lastPeriod > maxLength * 0.7) {
        truncated = truncated.substring(0, lastPeriod + 1);
      }
      
      summary = truncated;
    }
    
    return summary;
  }
  
  /**
   * Check if a word is likely a verb
   */
  private isVerb(word: string): boolean {
    // Very simplified verb detection based on common endings
    const verbEndings = ['ed', 'ing', 'ate', 'ify', 'ize', 'ise', 's'];
    const commonVerbs = new Set(['be', 'am', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'go', 'went', 'gone', 'get', 'got', 'make', 'made', 'say', 'said',
      'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'need',
      'take', 'took', 'come', 'came', 'see', 'saw', 'seem', 'look', 'like', 'want', 'feel',
      'think', 'thought', 'know', 'knew', 'time', 'try', 'tell', 'ask', 'work', 'call',
      'use', 'find', 'give', 'follow', 'put', 'bring', 'keep', 'hold', 'turn', 'show']);
    
    const lowerWord = word.toLowerCase();
    
    // Check if it's a common verb
    if (commonVerbs.has(lowerWord)) return true;
    
    // Check for common verb endings
    for (const ending of verbEndings) {
      if (lowerWord.endsWith(ending) && lowerWord.length > ending.length + 1) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a word is likely a noun
   */
  private isNoun(word: string): boolean {
    // Very simplified noun detection based on common endings
    const nounEndings = ['ism', 'ist', 'ment', 'ness', 'ship', 'ity', 'ance', 'ence', 'sion', 'tion', 'age'];
    
    const lowerWord = word.toLowerCase();
    
    // Check for proper noun (capitalized)
    if (word.length > 0 && word[0] === word[0].toUpperCase() && !this.isSentenceStart(word)) {
      return true;
    }
    
    // Check for common noun endings
    for (const ending of nounEndings) {
      if (lowerWord.endsWith(ending) && lowerWord.length > ending.length + 1) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a word is likely an adjective
   */
  private isAdjective(word: string): boolean {
    // Very simplified adjective detection based on common endings
    const adjectiveEndings = ['able', 'ible', 'al', 'ial', 'ical', 'ful', 'ious', 'ous', 'ive', 'less', 'y'];
    const commonAdjectives = new Set(['good', 'bad', 'new', 'old', 'big', 'small', 'high', 'low',
      'long', 'short', 'great', 'little', 'own', 'same', 'right', 'left', 'best',
      'better', 'worst', 'more', 'most', 'least', 'last', 'next', 'first', 'second',
      'third', 'few', 'many', 'some', 'all', 'any', 'each', 'every', 'other', 'such',
      'very', 'sure', 'main', 'major', 'minor', 'whole', 'free', 'full', 'half', 'real']);
    
    const lowerWord = word.toLowerCase();
    
    // Check if it's a common adjective
    if (commonAdjectives.has(lowerWord)) return true;
    
    // Check for common adjective endings
    for (const ending of adjectiveEndings) {
      if (lowerWord.endsWith(ending) && lowerWord.length > ending.length + 1) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a word is likely an adverb
   */
  private isAdverb(word: string): boolean {
    // Very simplified adverb detection based on common endings
    const lowerWord = word.toLowerCase();
    
    // Check for -ly adverbs
    if (lowerWord.endsWith('ly') && lowerWord.length > 3) {
      return true;
    }
    
    // Common adverbs
    const commonAdverbs = new Set(['very', 'really', 'quite', 'simply', 'just', 'now', 'then',
      'here', 'there', 'always', 'never', 'often', 'sometimes', 'soon', 'already',
      'too', 'so', 'also', 'even', 'still', 'rather', 'only', 'again', 'ever',
      'yet', 'away', 'almost', 'especially', 'certainly', 'particularly', 'usually']);
    
    return commonAdverbs.has(lowerWord);
  }
  
  /**
   * Check if a word is a determiner
   */
  private isDeterminer(word: string): boolean {
    const determiners = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'whose',
      'each', 'every', 'all', 'some', 'any', 'many', 'few', 'no', 'both', 'either', 'neither',
      'enough', 'much', 'more', 'most', 'less', 'least']);
    
    return determiners.has(word.toLowerCase());
  }
  
  /**
   * Check if a word is a preposition
   */
  private isPreposition(word: string): boolean {
    const prepositions = new Set(['in', 'on', 'at', 'to', 'from', 'with', 'by', 'for', 'of', 'about',
      'against', 'between', 'among', 'through', 'during', 'until', 'before', 'after',
      'above', 'below', 'over', 'under', 'up', 'down', 'off', 'near', 'since', 'into',
      'onto', 'upon', 'within', 'without', 'throughout', 'despite', 'beside', 'besides']);
    
    return prepositions.has(word.toLowerCase());
  }
  
  /**
   * Check if a word is a conjunction
   */
  private isConjunction(word: string): boolean {
    const conjunctions = new Set(['and', 'but', 'or', 'yet', 'for', 'nor', 'so',
      'while', 'whereas', 'although', 'though', 'because', 'since', 'unless', 'if']);
    
    return conjunctions.has(word.toLowerCase());
  }
  
  /**
   * Check if a word is a subordinator
   */
  private isSubordinator(word: string): boolean {
    const subordinators = new Set(['that', 'which', 'who', 'whom', 'whose',
      'when', 'where', 'why', 'how', 'if', 'whether', 'because', 'since', 'while',
      'although', 'though']);
    
    return subordinators.has(word.toLowerCase());
  }
  
  /**
   * Check if a word is likely to be at the start of a sentence
   * (simplified, used for proper noun detection)
   */
  private isSentenceStart(word: string): boolean {
    return false; // Simplified - in reality would need context
  }
}

export const nlpProcessor = new NLPProcessor();
