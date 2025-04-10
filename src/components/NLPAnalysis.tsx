
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Brain, Cpu, Dices, FileTerminal, Loader2, Zap } from 'lucide-react';
import { nlpService, NLPModel, NLPAnalysisResult } from '@/services/nlp/NLPService';

const NLPAnalysis: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<NLPModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('sentiment-model');
  const [inputText, setInputText] = useState<string>('');
  const [result, setResult] = useState<NLPAnalysisResult | null>(null);
  const [webGPUSupported, setWebGPUSupported] = useState(false);
  
  // Initialize NLP service
  useEffect(() => {
    const initNLP = async () => {
      const initialized = await nlpService.initialize();
      if (initialized) {
        setIsInitialized(true);
        setModels(nlpService.getAvailableModels());
        setWebGPUSupported(nlpService.isWebGPUSupported());
      } else {
        toast.error('Failed to initialize NLP service');
      }
    };
    
    initNLP();
  }, []);
  
  // Handle model selection
  const handleModelSelect = async (modelId: string) => {
    setSelectedModel(modelId);
    
    // Check if model is loaded, if not, load it
    if (!nlpService.isModelLoaded(modelId)) {
      setIsLoading(true);
      await nlpService.loadModel(modelId);
      setIsLoading(false);
    }
  };
  
  // Handle text analysis
  const analyzeText = async () => {
    if (!inputText.trim()) {
      toast.warning('Please enter text to analyze');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const analysisResult = await nlpService.analyzeText(inputText, selectedModel);
      
      if (analysisResult) {
        setResult(analysisResult);
      } else {
        toast.error('Analysis failed');
      }
    } catch (error) {
      console.error('Error during analysis:', error);
      toast.error('Error analyzing text');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate sample text
  const generateSample = () => {
    const samples = [
      "The service at this restaurant was exceptional! The staff was friendly and attentive, and the food was absolutely delicious.",
      "I'm extremely disappointed with my recent purchase. The product arrived damaged and customer service has been unresponsive.",
      "The movie had an interesting concept, but the execution was average. Some scenes were engaging while others dragged on too long.",
      "Climate change is accelerating at an alarming rate, with rising sea levels and extreme weather events becoming more frequent across the globe.",
      "The new software update includes several security enhancements and performance optimizations that improve overall system stability."
    ];
    
    const randomSample = samples[Math.floor(Math.random() * samples.length)];
    setInputText(randomSample);
  };
  
  // Render the results based on task type
  const renderResults = () => {
    if (!result) return null;
    
    const model = models.find(m => m.id === selectedModel);
    if (!model) return null;
    
    switch (model.task) {
      case 'sentiment-analysis':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Sentiment:</h3>
              {Array.isArray(result.result) && result.result[0] && (
                <Badge 
                  className={`text-sm ${
                    result.result[0].label.includes('POSITIVE') ? 'bg-green-500' : 
                    result.result[0].label.includes('NEGATIVE') ? 'bg-red-500' : 'bg-gray-500'
                  }`}
                >
                  {result.result[0].label}
                </Badge>
              )}
            </div>
            {Array.isArray(result.result) && result.result[0] && (
              <Progress 
                value={result.result[0].score * 100} 
                className="h-2 w-full" 
              />
            )}
            <p className="text-sm text-gray-500">
              Confidence: {Array.isArray(result.result) && result.result[0] ? (result.result[0].score * 100).toFixed(2) : 0}%
            </p>
          </div>
        );
        
      case 'summarization':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Summary:</h3>
            <p className="text-sm p-3 bg-muted rounded-md">
              {Array.isArray(result.result) && result.result[0] ? result.result[0].summary_text : 'No summary generated'}
            </p>
          </div>
        );
        
      case 'token-classification':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Named Entities:</h3>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(result.result) && result.result.map((entity, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline"
                  className="text-xs"
                >
                  {entity.word}: {entity.entity}
                </Badge>
              ))}
            </div>
            {(!Array.isArray(result.result) || result.result.length === 0) && (
              <p className="text-sm text-gray-500">No entities detected</p>
            )}
          </div>
        );
        
      case 'feature-extraction':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Text Embeddings:</h3>
            <p className="text-sm text-gray-500">
              Generated {result.result && result.result.tolist ? result.result.tolist().length : 0} dimensional vector embedding
            </p>
            <div className="bg-muted p-2 rounded-md">
              <code className="text-xs overflow-hidden text-ellipsis block">
                {result.result && result.result.tolist 
                  ? JSON.stringify(result.result.tolist().slice(0, 5)) + '...' 
                  : 'No embeddings generated'}
              </code>
            </div>
          </div>
        );
        
      default:
        return (
          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[200px]">
            {JSON.stringify(result.result, null, 2)}
          </pre>
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>NLP Analysis</CardTitle>
          </div>
          {webGPUSupported && (
            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-200">
              <Zap className="h-3 w-3 mr-1" />
              WebGPU Accelerated
            </Badge>
          )}
        </div>
        <CardDescription>
          Analyze text using natural language processing models
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isInitialized ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="mt-4 text-sm text-muted-foreground">Initializing NLP service...</p>
          </div>
        ) : (
          <>
            <Tabs
              defaultValue="sentiment-model"
              value={selectedModel}
              onValueChange={handleModelSelect}
              className="w-full"
            >
              <TabsList className="w-full overflow-auto grid grid-cols-2 lg:grid-cols-4">
                {models.map((model) => (
                  <TabsTrigger
                    key={model.id}
                    value={model.id}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {model.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {models.map((model) => (
                <TabsContent key={model.id} value={model.id} className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">{model.description}</p>
                </TabsContent>
              ))}
            </Tabs>
            
            <div className="grid gap-4 my-4">
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <Textarea
                    placeholder="Enter text to analyze..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={5}
                    className="resize-none"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSample}
                  disabled={isLoading}
                >
                  <Dices className="h-4 w-4 mr-2" />
                  Sample
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileTerminal className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {nlpService.isModelLoaded(selectedModel) 
                    ? "Model loaded and ready" 
                    : "Model will be loaded on first analysis"}
                </p>
              </div>
              <Button onClick={analyzeText} disabled={isLoading || !inputText.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Cpu className="mr-2 h-4 w-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            
            {result && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Analysis Results</h3>
                    <p className="text-xs text-muted-foreground">
                      Processed in {result.processingTime.toFixed(2)}ms
                    </p>
                  </div>
                  {renderResults()}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <p>Powered by Hugging Face Transformers</p>
        <p>{webGPUSupported ? 'Using WebGPU acceleration' : 'Using CPU'}</p>
      </CardFooter>
    </Card>
  );
};

export default NLPAnalysis;
