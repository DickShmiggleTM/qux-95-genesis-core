
/**
 * Recommendation Service
 * 
 * Provides content recommendation capabilities based on user preferences
 */
import { BaseService } from '../base/BaseService';
import { v4 as uuidv4 } from 'uuid';
import { workspaceService } from '../workspaceService';
import { SavedState } from '../saveSystem';

export interface UserProfile {
  id: string;
  preferences: Record<string, number>;
  recentInteractions: {
    itemId: string;
    timestamp: number;
    interactionType: 'view' | 'like' | 'save' | 'share';
  }[];
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  createdAt: number;
  popularity: number;
  features: Record<string, number>;
}

export interface RecommendationResult {
  userId: string;
  recommendedItems: {
    item: ContentItem;
    score: number;
    reason: string;
  }[];
  timestamp: number;
}

export class RecommendationService extends BaseService {
  private users: Map<string, UserProfile> = new Map();
  private contentItems: Map<string, ContentItem> = new Map();
  private recommendations: Map<string, RecommendationResult> = new Map();
  
  constructor() {
    super();
    this.loadSavedState();
    this.initializeWithDummyData();
  }
  
  /**
   * Load saved state from storage
   */
  private loadSavedState(): void {
    const savedState = this.loadState<{
      users: UserProfile[];
      contentItems: ContentItem[];
      recommendations: RecommendationResult[];
    }>('recommendations');
    
    if (savedState) {
      // Convert arrays to maps
      savedState.users.forEach(user => {
        this.users.set(user.id, user);
      });
      
      savedState.contentItems.forEach(item => {
        this.contentItems.set(item.id, item);
      });
      
      savedState.recommendations.forEach(rec => {
        this.recommendations.set(rec.userId, rec);
      });
      
      workspaceService.log(`Recommendation service loaded ${this.users.size} users and ${this.contentItems.size} items`, 'recommendation.log');
    }
  }
  
  /**
   * Save current state to storage
   */
  private persistState(): void {
    const state = {
      users: Array.from(this.users.values()),
      contentItems: Array.from(this.contentItems.values()),
      recommendations: Array.from(this.recommendations.values())
    };
    
    this.saveState('recommendations', state);
  }
  
  /**
   * Initialize with sample data for demonstration
   */
  private initializeWithDummyData(): void {
    // Only populate dummy data if storage is empty
    if (this.contentItems.size === 0) {
      // Sample content items
      const contentItems: ContentItem[] = [
        {
          id: uuidv4(),
          title: 'Getting Started with React',
          description: 'Learn the basics of React development',
          categories: ['programming', 'web development'],
          tags: ['react', 'javascript', 'frontend'],
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
          popularity: 0.85,
          features: { beginner: 0.9, practical: 0.8, tutorial: 0.95 }
        },
        {
          id: uuidv4(),
          title: 'Advanced TypeScript Techniques',
          description: 'Master TypeScript for large-scale applications',
          categories: ['programming', 'web development'],
          tags: ['typescript', 'javascript', 'advanced'],
          createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
          popularity: 0.75,
          features: { advanced: 0.9, practical: 0.7, tutorial: 0.6 }
        },
        {
          id: uuidv4(),
          title: 'Building Microservices with Node.js',
          description: 'Learn to build scalable microservices architecture',
          categories: ['programming', 'backend', 'architecture'],
          tags: ['node.js', 'microservices', 'backend'],
          createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000, // 45 days ago
          popularity: 0.8,
          features: { intermediate: 0.7, practical: 0.9, architecture: 0.95 }
        },
        {
          id: uuidv4(),
          title: 'Introduction to Machine Learning',
          description: 'Get started with machine learning concepts',
          categories: ['data science', 'machine learning'],
          tags: ['ml', 'data science', 'python'],
          createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
          popularity: 0.9,
          features: { beginner: 0.8, theoretical: 0.7, tutorial: 0.6 }
        },
        {
          id: uuidv4(),
          title: 'Deep Learning for Computer Vision',
          description: 'Apply deep learning techniques to computer vision problems',
          categories: ['data science', 'machine learning', 'computer vision'],
          tags: ['deep learning', 'computer vision', 'python'],
          createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000, // 20 days ago
          popularity: 0.85,
          features: { advanced: 0.9, practical: 0.8, specialized: 0.95 }
        },
        {
          id: uuidv4(),
          title: 'Fullstack Development with Next.js',
          description: 'Build modern web applications with Next.js',
          categories: ['programming', 'web development', 'fullstack'],
          tags: ['next.js', 'react', 'fullstack'],
          createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
          popularity: 0.95,
          features: { intermediate: 0.8, practical: 0.9, trending: 0.95 }
        },
        {
          id: uuidv4(),
          title: 'DevOps Automation Strategies',
          description: 'Streamline your development workflow with DevOps',
          categories: ['devops', 'automation', 'cloud'],
          tags: ['devops', 'ci/cd', 'automation'],
          createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000, // 35 days ago
          popularity: 0.7,
          features: { intermediate: 0.7, practical: 0.85, specialized: 0.8 }
        },
        {
          id: uuidv4(),
          title: 'UI/UX Design Principles',
          description: 'Learn fundamental principles of good UI/UX design',
          categories: ['design', 'user experience'],
          tags: ['ui', 'ux', 'design'],
          createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000, // 25 days ago
          popularity: 0.8,
          features: { beginner: 0.7, creative: 0.9, principles: 0.85 }
        },
        {
          id: uuidv4(),
          title: 'Mobile App Development with Flutter',
          description: 'Build cross-platform mobile apps with Flutter',
          categories: ['programming', 'mobile development'],
          tags: ['flutter', 'dart', 'mobile'],
          createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
          popularity: 0.85,
          features: { intermediate: 0.75, practical: 0.9, trending: 0.8 }
        },
        {
          id: uuidv4(),
          title: 'Data Visualization with D3.js',
          description: 'Create interactive data visualizations for the web',
          categories: ['data visualization', 'web development'],
          tags: ['d3.js', 'visualization', 'javascript'],
          createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000, // 40 days ago
          popularity: 0.75,
          features: { intermediate: 0.8, creative: 0.75, specialized: 0.85 }
        }
      ];
      
      // Add all content items to the map
      contentItems.forEach(item => {
        this.contentItems.set(item.id, item);
      });
      
      // Create a default user
      const defaultUser: UserProfile = {
        id: 'default-user',
        preferences: {
          'programming': 0.8,
          'web development': 0.9,
          'react': 0.7,
          'machine learning': 0.5,
          'beginner': 0.6,
          'practical': 0.8
        },
        recentInteractions: []
      };
      
      this.users.set(defaultUser.id, defaultUser);
      
      // Save the initial state
      this.persistState();
      
      workspaceService.log(`Recommendation service initialized with ${contentItems.length} content items`, 'recommendation.log');
    }
  }
  
  /**
   * Create or update a user profile
   */
  addOrUpdateUser(userId: string, preferences?: Record<string, number>): UserProfile {
    let user = this.users.get(userId);
    
    if (!user) {
      // Create new user
      user = {
        id: userId,
        preferences: preferences || {},
        recentInteractions: []
      };
    } else if (preferences) {
      // Update existing user preferences
      user.preferences = {
        ...user.preferences,
        ...preferences
      };
    }
    
    this.users.set(userId, user);
    this.persistState();
    
    return user;
  }
  
  /**
   * Record a user interaction with a content item
   */
  recordInteraction(
    userId: string,
    itemId: string,
    interactionType: 'view' | 'like' | 'save' | 'share'
  ): boolean {
    const user = this.users.get(userId);
    const item = this.contentItems.get(itemId);
    
    if (!user || !item) {
      return false;
    }
    
    // Add interaction to user's history
    user.recentInteractions.push({
      itemId,
      interactionType,
      timestamp: Date.now()
    });
    
    // Limit to most recent 20 interactions
    if (user.recentInteractions.length > 20) {
      user.recentInteractions = user.recentInteractions.slice(-20);
    }
    
    // Update user preferences based on interaction
    item.categories.forEach(category => {
      user.preferences[category] = (user.preferences[category] || 0) + 0.1;
    });
    
    item.tags.forEach(tag => {
      user.preferences[tag] = (user.preferences[tag] || 0) + 0.05;
    });
    
    // Update popularity of the item based on interaction
    let popularityBoost = 0;
    switch (interactionType) {
      case 'view': popularityBoost = 0.01; break;
      case 'like': popularityBoost = 0.03; break;
      case 'save': popularityBoost = 0.05; break;
      case 'share': popularityBoost = 0.1; break;
    }
    
    item.popularity = Math.min(1, item.popularity + popularityBoost);
    
    this.persistState();
    return true;
  }
  
  /**
   * Add a new content item
   */
  addContentItem(item: Omit<ContentItem, 'id' | 'createdAt' | 'popularity'>): ContentItem {
    const newItem: ContentItem = {
      ...item,
      id: uuidv4(),
      createdAt: Date.now(),
      popularity: 0.5
    };
    
    this.contentItems.set(newItem.id, newItem);
    this.persistState();
    
    return newItem;
  }
  
  /**
   * Get content recommendations for a user
   */
  getRecommendations(userId: string, count: number = 5): RecommendationResult {
    const user = this.users.get(userId) || this.users.get('default-user');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Score each content item for this user
    const scoredItems = Array.from(this.contentItems.values()).map(item => {
      // Calculate content-based similarity score
      let contentScore = 0;
      let matchCount = 0;
      
      // Score based on categories
      item.categories.forEach(category => {
        if (user.preferences[category]) {
          contentScore += user.preferences[category];
          matchCount++;
        }
      });
      
      // Score based on tags
      item.tags.forEach(tag => {
        if (user.preferences[tag]) {
          contentScore += user.preferences[tag] * 0.8;
          matchCount++;
        }
      });
      
      // Score based on features
      Object.entries(item.features).forEach(([feature, value]) => {
        if (user.preferences[feature]) {
          contentScore += user.preferences[feature] * value;
          matchCount++;
        }
      });
      
      // Normalize content score
      const normalizedContentScore = matchCount > 0 ? contentScore / matchCount : 0;
      
      // Add recency and popularity factors
      const recencyScore = Math.exp(-(Date.now() - item.createdAt) / (30 * 24 * 60 * 60 * 1000)); // Decay over 30 days
      const popularityScore = item.popularity;
      
      // Recent interactions (avoid recommending recently viewed items)
      const recentInteraction = user.recentInteractions.find(i => i.itemId === item.id);
      const interactionPenalty = recentInteraction ? 0.5 : 1;
      
      // Combine scores with appropriate weights
      const finalScore = (
        normalizedContentScore * 0.6 + 
        recencyScore * 0.2 + 
        popularityScore * 0.2
      ) * interactionPenalty;
      
      // Generate explanation for recommendation
      let reason = '';
      const topMatches = [];
      
      // Find top matching categories
      item.categories.forEach(category => {
        if (user.preferences[category] && user.preferences[category] > 0.5) {
          topMatches.push({ type: 'category', name: category, score: user.preferences[category] });
        }
      });
      
      // Find top matching tags
      item.tags.forEach(tag => {
        if (user.preferences[tag] && user.preferences[tag] > 0.5) {
          topMatches.push({ type: 'tag', name: tag, score: user.preferences[tag] });
        }
      });
      
      // Sort and get top 2 matches
      topMatches.sort((a, b) => b.score - a.score);
      const top2Matches = topMatches.slice(0, 2);
      
      if (top2Matches.length > 0) {
        reason = `Matches your interest in ${top2Matches.map(m => m.name).join(' and ')}`;
      } else if (recencyScore > 0.8) {
        reason = 'Recently added content';
      } else if (popularityScore > 0.8) {
        reason = 'Popular with other users';
      } else {
        reason = 'Recommended based on your profile';
      }
      
      return {
        item,
        score: finalScore,
        reason
      };
    });
    
    // Sort by score and take top 'count'
    scoredItems.sort((a, b) => b.score - a.score);
    const topRecommendations = scoredItems.slice(0, count);
    
    // Create and store recommendation result
    const result: RecommendationResult = {
      userId,
      recommendedItems: topRecommendations,
      timestamp: Date.now()
    };
    
    this.recommendations.set(userId, result);
    this.persistState();
    
    return result;
  }
  
  /**
   * Get a specific content item
   */
  getContentItem(itemId: string): ContentItem | null {
    return this.contentItems.get(itemId) || null;
  }
  
  /**
   * Get all content items
   */
  getAllContentItems(): ContentItem[] {
    return Array.from(this.contentItems.values());
  }
  
  /**
   * Get a user profile
   */
  getUserProfile(userId: string): UserProfile | null {
    return this.users.get(userId) || this.users.get('default-user') || null;
  }
  
  /**
   * Get most recent recommendations for a user (without recalculating)
   */
  getCachedRecommendations(userId: string): RecommendationResult | null {
    return this.recommendations.get(userId) || null;
  }
}

export const recommendationService = new RecommendationService();
