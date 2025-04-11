
/**
 * NLPService - Provides Natural Language Processing capabilities
 */
import { BaseService } from '../base/BaseService';
import { workspaceService } from '../workspaceService';
import { isWebGPUSupported } from '@/utils/browserCapabilities';

// NLP Analysis types
export interface SentimentAnalysis {
  score: number;        // -1 to 1, negative to positive
  label: 'negative' | 'neutral' | 'positive';
  confidence: number;   // 0 to 1
}

export interface EntityRecognition {
  text: string;
  type: string;
  startPos: number;
  endPos: number;
  confidence: number;
}

export interface TextClassification {
  label: string;
  confidence: number;
}

export interface KeywordExtraction {
  keyword: string;
  relevance: number; // 0 to 1
}

export interface TextSummary {
  original: string;
  summary: string;
  compressionRatio: number;
}

export class NLPService extends BaseService {
  private hasGPUAcceleration: boolean;
  private modelLoaded: boolean = false;
  private loadingPromise: Promise<boolean> | null = null;
  
  constructor() {
    super();
    // Check for WebGPU support
    this.hasGPUAcceleration = isWebGPUSupported();
    workspaceService.log(`NLP Service initialized. GPU acceleration: ${this.hasGPUAcceleration ? 'available' : 'unavailable'}`, 'nlp.log');
  }
  
  /**
   * Analyze the sentiment of a text passage
   */
  public async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    await this.ensureModelLoaded();
    
    // Simulate NLP processing with basic sentiment rules
    // In a real app, this would use a trained model
    const words = text.toLowerCase().split(/\s+/);
    
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'best', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'sad', 'hate', 'worst', 'horrible', 'disappointed'];
    
    let score = 0;
    const totalWords = words.length;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    // Normalize score between -1 and 1
    const normalizedScore = totalWords > 0 ? score / Math.sqrt(totalWords) : 0;
    const clampedScore = Math.max(-1, Math.min(1, normalizedScore));
    
    // Determine label based on score
    let label: 'negative' | 'neutral' | 'positive';
    if (clampedScore < -0.3) label = 'negative';
    else if (clampedScore > 0.3) label = 'positive';
    else label = 'neutral';
    
    // Calculate confidence (higher for extreme values, lower for values near 0)
    const confidence = Math.min(0.9, Math.abs(clampedScore) + 0.4);
    
    return {
      score: clampedScore,
      label,
      confidence
    };
  }
  
  /**
   * Extract named entities from text
   */
  public async extractEntities(text: string): Promise<EntityRecognition[]> {
    await this.ensureModelLoaded();
    
    const entities: EntityRecognition[] = [];
    
    // Extremely simplified NER (Named Entity Recognition)
    // In a real app, this would use a properly trained model
    
    // Look for potential person names (capitalized words not at the start of sentences)
    const nameRegex = /(?<!\. |\n|^)([A-Z][a-z]+\s[A-Z][a-z]+)/g;
    let nameMatch;
    while ((nameMatch = nameRegex.exec(text)) !== null) {
      entities.push({
        text: nameMatch[0],
        type: 'PERSON',
        startPos: nameMatch.index,
        endPos: nameMatch.index + nameMatch[0].length,
        confidence: 0.7
      });
    }
    
    // Look for potential locations (preceded by "in", "at", "from", etc.)
    const locationRegex = /(?:in|at|from|to)\s([A-Z][a-z]+)/g;
    let locationMatch;
    while ((locationMatch = locationRegex.exec(text)) !== null) {
      entities.push({
        text: locationMatch[1],
        type: 'LOCATION',
        startPos: locationMatch.index + locationMatch[0].indexOf(locationMatch[1]),
        endPos: locationMatch.index + locationMatch[0].length,
        confidence: 0.6
      });
    }
    
    // Look for dates
    const dateRegex = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/g;
    let dateMatch;
    while ((dateMatch = dateRegex.exec(text)) !== null) {
      entities.push({
        text: dateMatch[0],
        type: 'DATE',
        startPos: dateMatch.index,
        endPos: dateMatch.index + dateMatch[0].length,
        confidence: 0.85
      });
    }
    
    return entities;
  }
  
  /**
   * Classify text into categories
   */
  public async classifyText(text: string): Promise<TextClassification[]> {
    await this.ensureModelLoaded();
    
    const lowerText = text.toLowerCase();
    const classifications: TextClassification[] = [];
    
    // Map of keywords to categories with relevance weights
    const categoryKeywords: Record<string, Record<string, number>> = {
      'Technology': {
        'computer': 0.8, 'software': 0.9, 'hardware': 0.9, 'app': 0.7, 
        'tech': 0.9, 'coding': 0.8, 'programming': 0.9, 'digital': 0.6,
        'ai': 0.9, 'artificial intelligence': 1.0, 'machine learning': 0.9
      },
      'Business': {
        'market': 0.7, 'finance': 0.9, 'sales': 0.8, 'revenue': 0.9,
        'profit': 0.8, 'business': 0.9, 'company': 0.7, 'industry': 0.7
      },
      'Health': {
        'health': 0.9, 'medical': 0.9, 'doctor': 0.8, 'patient': 0.8,
        'disease': 0.7, 'treatment': 0.8, 'hospital': 0.8, 'wellness': 0.6
      },
      'Education': {
        'education': 0.9, 'school': 0.8, 'university': 0.8, 'student': 0.8,
        'learn': 0.7, 'teaching': 0.8, 'academic': 0.7, 'study': 0.7
      },
      'Entertainment': {
        'movie': 0.8, 'music': 0.8, 'game': 0.7, 'play': 0.6,
        'entertainment': 0.9, 'actor': 0.7, 'film': 0.8, 'tv': 0.7
      }
    };
    
    // Calculate relevance score for each category
    const categoryScores: Record<string, number> = {};
    
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      let score = 0;
      let matches = 0;
      
      Object.entries(keywords).forEach(([keyword, weight]) => {
        const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
        const matches = (lowerText.match(regex) || []).length;
        if (matches > 0) {
          score += weight * matches;
          matches += matches;
        }
      });
      
      if (matches > 0) {
        // Normalize by the text length to avoid bias towards longer texts
        const normalizedScore = score / Math.sqrt(text.length);
        categoryScores[category] = Math.min(0.95, normalizedScore);
      }
    });
    
    // Convert scores to classifications
    Object.entries(categoryScores)
      .filter(([_, score]) => score > 0.2) // Only include categories with sufficient confidence
      .sort(([_, scoreA], [_, scoreB]) => scoreB - scoreA) // Sort by score descending
      .forEach(([category, score]) => {
        classifications.push({
          label: category,
          confidence: score
        });
      });
    
    // If no categories were found, return "General" as a fallback
    if (classifications.length === 0) {
      classifications.push({
        label: 'General',
        confidence: 0.3
      });
    }
    
    return classifications;
  }
  
  /**
   * Extract keywords from text
   */
  public async extractKeywords(text: string): Promise<KeywordExtraction[]> {
    await this.ensureModelLoaded();
    
    const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    const wordFreq: Record<string, number> = {};
    
    // Count word occurrences
    words.forEach(word => {
      // Skip common words (very simplified stopwords list)
      const stopwords = ['this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
                        'were', 'would', 'could', 'should', 'their', 'about', 'there'];
      if (stopwords.includes(word)) return;
      
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Convert to array and sort by frequency
    const keywords = Object.entries(wordFreq)
      .map(([keyword, count]) => ({
        keyword,
        relevance: Math.min(0.95, count / Math.sqrt(words.length))
      }))
      .filter(kw => kw.relevance > 0.2)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10); // Return top 10 keywords
    
    return keywords;
  }
  
  /**
   * Generate a summary of the text
   */
  public async summarizeText(text: string): Promise<TextSummary> {
    await this.ensureModelLoaded();
    
    // For demonstration, we'll use a very simple extractive summarization approach
    // In a real app, this would use a more sophisticated model
    
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length <= 3) {
      // Text is already short, no summarization needed
      return {
        original: text,
        summary: text,
        compressionRatio: 1.0
      };
    }
    
    // Score each sentence based on position and keyword frequency
    const wordFreq: Record<string, number> = {};
    sentences.forEach(sentence => {
      const words = sentence.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
    });
    
    // Get top keywords
    const topKeywords = Object.entries(wordFreq)
      .sort(([_, countA], [_, countB]) => countB - countA)
      .slice(0, 10)
      .map(([word]) => word);
    
    // Score sentences based on keyword presence and position
    const sentenceScores = sentences.map((sentence, index) => {
      const words = sentence.toLowerCase().split(/\W+/);
      
      // Score based on keyword matches
      const keywordScore = topKeywords.reduce((score, keyword) => {
        return score + (words.includes(keyword) ? 1 : 0);
      }, 0) / topKeywords.length;
      
      // Score based on position (first and last sentences are often important)
      const positionScore = 
        index === 0 || index === sentences.length - 1 ? 0.3 : 
        index <= Math.floor(sentences.length * 0.2) ? 0.2 : 0.1;
      
      return {
        index,
        text: sentence,
        score: keywordScore + positionScore
      };
    });
    
    // Sort by score and take top X%
    const sortedSentences = [...sentenceScores].sort((a, b) => b.score - a.score);
    const summaryLength = Math.max(1, Math.ceil(sentences.length * 0.3)); // Take top 30%
    
    // Get top sentences and sort them by original order
    const topSentences = sortedSentences
      .slice(0, summaryLength)
      .sort((a, b) => a.index - b.index)
      .map(s => s.text);
    
    const summary = topSentences.join(' ').trim();
    
    return {
      original: text,
      summary,
      compressionRatio: summary.length / text.length
    };
  }
  
  /**
   * Ensure the NLP model is loaded before processing
   */
  private async ensureModelLoaded(): Promise<boolean> {
    // If model is already loaded, return immediately
    if (this.modelLoaded) return true;
    
    // If loading is in progress, wait for it
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    
    // Start loading the model
    this.loadingPromise = new Promise<boolean>((resolve) => {
      workspaceService.log('Loading NLP model...', 'nlp.log');
      
      // Simulate model loading time
      setTimeout(() => {
        this.modelLoaded = true;
        workspaceService.log('NLP model loaded successfully', 'nlp.log');
        resolve(true);
      }, 1000);
    });
    
    return this.loadingPromise;
  }
}

export const nlpService = new NLPService();
