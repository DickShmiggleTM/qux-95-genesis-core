
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Image, Loader, RefreshCcw, Download, Copy, Server, Cpu, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { ollamaService } from '@/services/ollama';

interface ImageGenerationProps {
  className?: string;
}

const ImageGeneration: React.FC<ImageGenerationProps> = ({ className }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [model, setModel] = useState('stable-diffusion-xl');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [steps, setSteps] = useState(30);
  const [cfgScale, setCfgScale] = useState(7);
  const [seed, setSeed] = useState(-1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<{id: string, name: string}[]>([]);

  // Check Ollama connection and load models
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const connected = await ollamaService.checkConnection();
        setOllamaConnected(connected);

        if (connected) {
          // Load available models
          const models = await ollamaService.loadAvailableModels();

          // Filter for image generation models
          // For now, we'll consider models with 'sd', 'diffusion', or 'image' in their name
          const imageModels = models.filter(model => {
            const modelName = model.name.toLowerCase();
            return (
              modelName.includes('sd') ||
              modelName.includes('diffusion') ||
              modelName.includes('image') ||
              modelName.includes('stable')
            );
          });

          setOllamaModels(imageModels.map(model => ({
            id: model.id,
            name: model.name
          })));
        }
      } catch (error) {
        console.error('Error checking Ollama connection:', error);
      }
    };

    checkOllama();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Prompt is required", {
        description: "Please enter a description for the image you want to generate"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      // Check if using Ollama model
      if (model.startsWith('ollama-')) {
        // Check if Ollama is connected
        if (!ollamaConnected) {
          toast.error("Ollama not connected", {
            description: "Please make sure Ollama is running"
          });
          setIsGenerating(false);
          return;
        }

        // Extract the actual model ID
        const ollamaModelId = model.replace('ollama-', '');

        // Generate image using Ollama
        const options = {
          negativePrompt,
          width,
          height,
          steps,
          cfgScale,
          seed: seed === -1 ? Math.floor(Math.random() * 1000000) : seed
        };

        // Call Ollama service to generate image
        const imageUrl = await ollamaService.generateImage(prompt, options);
        setGeneratedImage(imageUrl);

        toast.success("Image generated with Ollama", {
          description: `Created using ${ollamaModelId}`
        });
      } else {
        // Simulate image generation for built-in models
        // In a real app, we would call an API to generate the image
        await new Promise(resolve => setTimeout(resolve, 3000));

        // For now, we'll just use a placeholder
        setGeneratedImage('https://source.unsplash.com/random/512x512/?cyberpunk');

        toast.success("Image generated", {
          description: `Created using ${model}`
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error("Failed to generate image", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
    toast.info("New random seed generated", {
      description: `Seed value: ${seed}`
    });
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `qux-95-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Image downloaded", {
      description: "Saved to your downloads folder"
    });
  };

  const handleCopyImage = () => {
    if (!generatedImage) return;

    // In a real app, we would copy the image to clipboard
    // For now, just show a toast
    toast.success("Image URL copied to clipboard", {
      description: "Ready to paste elsewhere"
    });
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-pink rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-pink h-5 flex items-center px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">IMAGE GENERATION</div>
      </div>

      <div className="p-4 pt-6 h-full">
        <div className="grid grid-cols-2 h-full gap-4">
          {/* Settings Panel */}
          <div className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-cyberpunk-dark-blue">
                <TabsTrigger value="basic" className="text-xs">BASIC</TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs">ADVANCED</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={model}
                    onValueChange={setModel}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="model" className="bg-cyberpunk-dark-blue border-cyberpunk-neon-pink text-cyberpunk-neon-green">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="bg-cyberpunk-dark-blue border-cyberpunk-neon-pink text-cyberpunk-neon-green">
                      {ollamaModels.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="flex items-center gap-2 text-cyberpunk-neon-purple">
                            <Server className="h-4 w-4" /> Ollama Models
                          </SelectLabel>
                          {ollamaModels.map(model => (
                            <SelectItem
                              key={`ollama-${model.id}`}
                              value={`ollama-${model.id}`}
                            >
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}

                      <SelectGroup>
                        <SelectLabel className="flex items-center gap-2 text-cyberpunk-neon-green">
                          <Cpu className="h-4 w-4" /> Built-in Models
                        </SelectLabel>
                        <SelectItem value="stable-diffusion-xl">Stable Diffusion XL</SelectItem>
                        <SelectItem value="stable-diffusion-3">Stable Diffusion 3</SelectItem>
                        <SelectItem value="dall-e-3">DALL-E 3 (Remote)</SelectItem>
                        <SelectItem value="midjourney">Midjourney (Remote)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {/* Model status indicator */}
                  {model.startsWith('ollama-') && (
                    <div className="mt-1 text-xs flex items-center gap-1">
                      {ollamaConnected ? (
                        <Badge variant="outline" className="text-green-500 border-green-500 bg-cyberpunk-dark">
                          <Server className="h-3 w-3 mr-1" />
                          Ollama connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-500 border-red-500 bg-cyberpunk-dark">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Ollama not connected
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <Input
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="bg-cyberpunk-dark-blue border-cyberpunk-neon-pink text-cyberpunk-neon-green"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="negative-prompt">Negative Prompt</Label>
                  <Input
                    id="negative-prompt"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Elements to avoid in the generated image..."
                    className="bg-cyberpunk-dark-blue border-cyberpunk-neon-pink text-cyberpunk-neon-green"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim() || (model.startsWith('ollama-') && !ollamaConnected)}
                    className="w-full bg-cyberpunk-neon-pink text-cyberpunk-dark hover:bg-pink-500"
                  >
                    {isGenerating ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        GENERATING...
                      </>
                    ) : (
                      <>
                        <Image className="h-4 w-4 mr-2" />
                        GENERATE IMAGE
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Width: {width}px</Label>
                    <Slider
                      id="width"
                      value={[width]}
                      min={256}
                      max={1024}
                      step={64}
                      onValueChange={(value) => setWidth(value[0])}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height: {height}px</Label>
                    <Slider
                      id="height"
                      value={[height]}
                      min={256}
                      max={1024}
                      step={64}
                      onValueChange={(value) => setHeight(value[0])}
                      className="py-4"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="steps">Steps: {steps}</Label>
                  <Slider
                    id="steps"
                    value={[steps]}
                    min={10}
                    max={50}
                    step={1}
                    onValueChange={(value) => setSteps(value[0])}
                    className="py-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cfg-scale">CFG Scale: {cfgScale}</Label>
                  <Slider
                    id="cfg-scale"
                    value={[cfgScale]}
                    min={1}
                    max={15}
                    step={0.5}
                    onValueChange={(value) => setCfgScale(value[0])}
                    className="py-4"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="seed">Seed</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRandomSeed}
                      className="h-6 text-cyberpunk-neon-pink"
                    >
                      <RefreshCcw className="h-3 w-3 mr-1" />
                      <span className="text-xs">Random</span>
                    </Button>
                  </div>
                  <Input
                    id="seed"
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                    placeholder="-1 for random"
                    className="bg-cyberpunk-dark-blue border-cyberpunk-neon-pink text-cyberpunk-neon-green"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="flex flex-col h-full">
            <div className="text-sm text-cyberpunk-neon-pink mb-2">OUTPUT PREVIEW</div>

            <div className="flex-1 border border-cyberpunk-neon-pink bg-cyberpunk-dark-blue flex items-center justify-center relative">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader className="h-10 w-10 animate-spin text-cyberpunk-neon-pink" />
                  <div className="mt-4 text-cyberpunk-neon-pink text-sm">Generating image...</div>
                </div>
              ) : generatedImage ? (
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-cyberpunk-neon-pink text-opacity-50">
                  <Image className="h-16 w-16 mb-4" />
                  <div className="text-center">
                    <p>No image generated yet</p>
                    <p className="text-xs mt-2">Fill in the prompt and click Generate</p>
                  </div>
                </div>
              )}
            </div>

            {generatedImage && (
              <div className="flex items-center justify-end space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyImage}
                  className="border-cyberpunk-neon-pink text-cyberpunk-neon-pink"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={handleDownload}
                  size="sm"
                  className="bg-cyberpunk-neon-pink text-cyberpunk-dark hover:bg-pink-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGeneration;
