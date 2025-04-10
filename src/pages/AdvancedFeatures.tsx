
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NLPAnalysis from '@/components/NLPAnalysis';
import ComputerVision from '@/components/ComputerVision';
import RecommendationSystem from '@/components/RecommendationSystem';
import { BookCopy, ChevronLeft, ChevronRight, Cpu, Eye, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AdvancedFeatures = () => {
  const [activeFeature, setActiveFeature] = useState<string>('nlp');
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/')}
          className="flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
        
        <h1 className="text-2xl font-bold">Advanced AI Features</h1>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/')}
          className="invisible" // For symmetry
        >
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <Tabs 
            defaultValue="nlp"
            value={activeFeature} 
            onValueChange={setActiveFeature}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="nlp" className="flex items-center gap-2">
                <BookCopy className="h-4 w-4" />
                <span className="hidden md:inline">Natural Language</span>
                <span className="md:hidden">NLP</span>
              </TabsTrigger>
              <TabsTrigger value="vision" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden md:inline">Computer Vision</span>
                <span className="md:hidden">Vision</span>
              </TabsTrigger>
              <TabsTrigger value="recommendation" className="flex items-center gap-2">
                <BookMarked className="h-4 w-4" />
                <span className="hidden md:inline">Recommendation</span>
                <span className="md:hidden">Recs</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="nlp" className="mt-0">
                <NLPAnalysis />
              </TabsContent>
              
              <TabsContent value="vision" className="mt-0">
                <ComputerVision />
              </TabsContent>
              
              <TabsContent value="recommendation" className="mt-0">
                <RecommendationSystem />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="mt-8 bg-muted rounded-md p-4">
        <div className="flex items-start gap-3">
          <Cpu className="h-5 w-5 text-primary mt-1" />
          <div>
            <h3 className="font-medium">About Advanced AI Features</h3>
            <p className="text-sm text-muted-foreground mt-1">
              These features demonstrate the integration of advanced technologies into the application.
              The NLP module uses Hugging Face transformers for text analysis, the Computer Vision module 
              processes images for classification and object detection, and the Recommendation System provides 
              personalized content suggestions based on user preferences and behaviors.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              All processing happens directly in your browser using WebGPU acceleration when available, 
              ensuring privacy and responsive performance without sending data to external services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFeatures;
