import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Camera, Eye, FileImage, Loader2, Upload, Zap, Scan } from 'lucide-react';
import { visionService, VisionModel, VisionAnalysisResult } from '@/services/vision/VisionService';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const ComputerVision: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<VisionModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('image-classification-model');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<VisionAnalysisResult | null>(null);
  const [webGPUSupported, setWebGPUSupported] = useState(false);
  
  // Initialize Vision service
  useEffect(() => {
    const initVision = async () => {
      const initialized = await visionService.initialize();
      if (initialized) {
        setIsInitialized(true);
        setModels(visionService.getAvailableModels());
        setWebGPUSupported(visionService.isWebGPUSupported());
      } else {
        toast.error('Failed to initialize Vision service');
      }
    };
    
    initVision();
  }, []);
  
  // Handle model selection
  const handleModelSelect = async (modelId: string) => {
    setSelectedModel(modelId);
    
    // Check if model is loaded, if not, load it
    if (!visionService.isModelLoaded(modelId)) {
      setIsLoading(true);
      await visionService.loadModel(modelId);
      setIsLoading(false);
    }
  };
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
    }
  };
  
  // Handle URL input
  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(event.target.value);
    setSelectedFile(null);
  };
  
  // Handle image analysis
  const analyzeImage = async () => {
    if (!imageUrl) {
      toast.warning('Please select an image or enter a URL');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Pass the URL string directly, the service will now handle it
      const analysisResult = await visionService.analyzeImage(imageUrl, selectedModel);
      
      if (analysisResult) {
        setResult(analysisResult);
      } else {
        toast.error('Analysis failed');
      }
    } catch (error) {
      console.error('Error during image analysis:', error);
      toast.error('Error analyzing image');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Use sample image
  const useSampleImage = useCallback((sampleUrl: string) => {
    setImageUrl(sampleUrl);
    setSelectedFile(null);
  }, []);
  
  // Render the results based on task type
  const renderResults = () => {
    if (!result) return null;
    
    const model = models.find(m => m.id === selectedModel);
    if (!model) return null;
    
    switch (model.task) {
      case 'image-classification':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Classification Results:</h3>
            <div className="space-y-2">
              {Array.isArray(result.result) && result.result.slice(0, 5).map((prediction, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{prediction.label}</span>
                  <div className="flex items-center">
                    <div className="w-40 bg-muted h-2 rounded-full overflow-hidden mr-3">
                      <div 
                        className="h-full bg-primary"
                        style={{ width: `${prediction.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'object-detection':
        // Use the image URL from the result or fall back to the current imageUrl state
        const displayUrl = result.imageUrl || imageUrl;
        
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Objects Detected:</h3>
            <div className="relative mb-4">
              <AspectRatio ratio={1} className="bg-muted">
                <img 
                  src={displayUrl} 
                  alt="Analyzed" 
                  className="rounded-md object-cover"
                />
                {Array.isArray(result.result) && result.result.map((obj, idx) => (
                  <div 
                    key={idx}
                    className="absolute border-2 border-red-500 flex items-center justify-center"
                    style={{
                      left: `${obj.boundingBox.x * 100}%`,
                      top: `${obj.boundingBox.y * 100}%`,
                      width: `${obj.boundingBox.width * 100}%`,
                      height: `${obj.boundingBox.height * 100}%`
                    }}
                  >
                    <span className="text-xs bg-red-500 text-white px-1 absolute -top-6 left-0">
                      {obj.label} ({Math.round(obj.confidence * 100)}%)
                    </span>
                  </div>
                ))}
              </AspectRatio>
            </div>
            
            <div className="space-y-2">
              {Array.isArray(result.result) && result.result.map((obj, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {obj.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Confidence: {(obj.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
              
              {(!Array.isArray(result.result) || result.result.length === 0) && (
                <p className="text-sm text-muted-foreground">No objects detected</p>
              )}
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

  // Sample images for demonstration
  const sampleImages = [
    "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg",
    "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/classroom.jpg",
    "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers-js/dog-toy.jpg"
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle>Computer Vision</CardTitle>
          </div>
          {webGPUSupported && (
            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-200">
              <Zap className="h-3 w-3 mr-1" />
              WebGPU Accelerated
            </Badge>
          )}
        </div>
        <CardDescription>
          Analyze images using computer vision models
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isInitialized ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="mt-4 text-sm text-muted-foreground">Initializing Vision service...</p>
          </div>
        ) : (
          <>
            <Tabs
              defaultValue="image-classification-model"
              value={selectedModel}
              onValueChange={handleModelSelect}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2">
                {models.map((model) => (
                  <TabsTrigger
                    key={model.id}
                    value={model.id}
                    disabled={isLoading}
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
            
            <div className="grid gap-4">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-1 w-full space-y-4">
                  <div className="grid gap-2">
                    <label htmlFor="image-url" className="text-sm font-medium">Image URL</label>
                    <Input
                      id="image-url"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={handleUrlChange}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label htmlFor="image-upload" className="text-sm font-medium">Upload Image</label>
                    <div className="flex gap-2">
                      <Input
                        id="image-upload"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        disabled={isLoading}
                      >
                        <Upload className="h-4 w-4 mr-1" /> Upload
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sample Images</label>
                    <div className="flex gap-2 overflow-x-auto py-2">
                      {sampleImages.map((url, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="h-auto p-1"
                          onClick={() => useSampleImage(url)}
                          disabled={isLoading}
                        >
                          <img
                            src={url}
                            alt={`Sample ${idx + 1}`}
                            className="h-16 w-16 object-cover rounded-sm"
                          />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-1/2 space-y-2">
                  <label className="text-sm font-medium">Preview</label>
                  <AspectRatio ratio={1} className="bg-muted rounded-md">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="rounded-md object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <FileImage className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">
                          No image selected
                        </p>
                      </div>
                    )}
                  </AspectRatio>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <Scan className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {visionService.isModelLoaded(selectedModel) 
                    ? "Model loaded and ready" 
                    : "Model will be loaded on first analysis"}
                </p>
              </div>
              <Button onClick={analyzeImage} disabled={isLoading || !imageUrl}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
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

export default ComputerVision;
