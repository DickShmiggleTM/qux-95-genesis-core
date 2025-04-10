import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { BookMarked, RefreshCw, ThumbsUp, Save, Share2, Book, ChevronRight, Loader2 } from 'lucide-react';
import { recommendationService, ContentItem, RecommendationResult } from '@/services/recommendation/RecommendationService';

const ContentCard: React.FC<{
  item: ContentItem;
  reason?: string;
  onInteraction: (itemId: string, type: 'view' | 'like' | 'save' | 'share') => void;
}> = ({ item, reason, onInteraction }) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">{item.title}</CardTitle>
          <div className="flex gap-1">
            {item.categories.map((category, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>
        </div>
        <CardDescription className="text-xs">{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs bg-muted">
              {tag}
            </Badge>
          ))}
        </div>
        {reason && (
          <p className="text-xs italic text-muted-foreground mt-2">{reason}</p>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <div className="text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()}
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => onInteraction(item.id, 'like')}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => onInteraction(item.id, 'save')}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => onInteraction(item.id, 'share')}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const RecommendationSystem: React.FC = () => {
  const [userId, setUserId] = useState<string>('default-user');
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('recommendations');

  // Load content and recommendations on mount
  useEffect(() => {
    setAllContent(recommendationService.getAllContentItems());
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);
    
    try {
      // Check for cached recommendations first
      let recs = recommendationService.getCachedRecommendations(userId);
      
      // If no cached recommendations or they're older than 5 minutes, get new ones
      if (!recs || (Date.now() - recs.timestamp > 5 * 60 * 1000)) {
        recs = recommendationService.getRecommendations(userId);
      }
      
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInteraction = (itemId: string, type: 'view' | 'like' | 'save' | 'share') => {
    // Record the interaction
    const success = recommendationService.recordInteraction(userId, itemId, type);
    
    if (success) {
      // Show a toast based on the interaction type
      switch (type) {
        case 'like':
          toast.success('Content liked');
          break;
        case 'save':
          toast.success('Content saved to your library');
          break;
        case 'share':
          toast.success('Content shared');
          break;
      }
      
      // Refresh recommendations after a short delay
      setTimeout(loadRecommendations, 500);
    }
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    
    // If viewing the "browse" tab, record view interactions for all visible content
    if (tab === 'browse') {
      // Just simulate viewing the first 3 items to keep it simple
      allContent.slice(0, 3).forEach(item => {
        recommendationService.recordInteraction(userId, item.id, 'view');
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-primary" />
          <CardTitle>Recommendation System</CardTitle>
        </div>
        <CardDescription>
          Personalized content recommendations based on your preferences
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button 
              onClick={loadRecommendations} 
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
          
          <Tabs 
            defaultValue="recommendations" 
            value={currentTab} 
            onValueChange={handleTabChange}
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="recommendations">For You</TabsTrigger>
              <TabsTrigger value="browse">Browse All</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recommendations" className="pt-4">
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recommendations && recommendations.recommendedItems.length > 0 ? (
                <ScrollArea className="h-[400px] pr-4">
                  {recommendations.recommendedItems.map((rec) => (
                    <ContentCard 
                      key={rec.item.id} 
                      item={rec.item} 
                      reason={rec.reason}
                      onInteraction={handleInteraction}
                    />
                  ))}
                </ScrollArea>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-center">
                  <Book className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No recommendations yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browse some content to help us understand your preferences
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => setCurrentTab('browse')}
                  >
                    Browse Content
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="browse" className="pt-4">
              <ScrollArea className="h-[400px] pr-4">
                {allContent.map((item) => (
                  <ContentCard 
                    key={item.id} 
                    item={item}
                    onInteraction={handleInteraction}
                  />
                ))}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground">
        {recommendations ? (
          <div className="w-full flex justify-between items-center">
            <span>
              Last updated: {new Date(recommendations.timestamp).toLocaleTimeString()}
            </span>
            <span>
              {recommendations.recommendedItems.length} items recommended
            </span>
          </div>
        ) : (
          "Personalized recommendations will appear here"
        )}
      </CardFooter>
    </Card>
  );
};

export default RecommendationSystem;
