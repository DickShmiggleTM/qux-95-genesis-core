
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from "sonner";
import { ollamaService, OllamaModel } from '@/services/ollamaService';

interface ModelSelectorProps {
  className?: string;
  onModelSelect?: (model: OllamaModel) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  className,
  onModelSelect 
}) => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch models on component mount
  useEffect(() => {
    loadModels();
  }, []);
  
  const loadModels = async () => {
    setIsLoading(true);
    try {
      // Check if Ollama is connected
      const isConnected = await ollamaService.checkConnection();
      
      if (isConnected) {
        // Load models from Ollama
        const ollamaModels = await ollamaService.loadAvailableModels();
        setModels(ollamaModels);
        
        // Set first model as selected if none selected
        if (ollamaModels.length > 0 && !selectedModel) {
          setSelectedModel(ollamaModels[0].id);
          ollamaService.setCurrentModel(ollamaModels[0].id);
          
          if (onModelSelect) {
            onModelSelect(ollamaModels[0]);
          }
        }
      } else {
        // If not connected, use demo models
        setModels([
          {
            id: 'llama2',
            name: 'Llama 2',
            modelfile: '',
            size: 0,
            parameters: '7B',
            format: 'gguf'
          },
          {
            id: 'codellama',
            name: 'CodeLlama',
            modelfile: '',
            size: 0,
            parameters: '13B',
            format: 'gguf'
          },
          {
            id: 'mistral',
            name: 'Mistral',
            modelfile: '',
            size: 0,
            parameters: '7B',
            format: 'gguf'
          }
        ]);
      }
    } catch (error) {
      console.error("Error loading models:", error);
      toast.error("Failed to load models", {
        description: "Check if Ollama is running properly"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelSelect = (model: OllamaModel) => {
    setSelectedModel(model.id);
    ollamaService.setCurrentModel(model.id);
    
    if (onModelSelect) {
      onModelSelect(model);
    }
    
    toast.success(`Model ${model.name} selected`, {
      description: `${model.parameters} parameters loaded`
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    
    const file = event.target.files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension !== 'gguf') {
      toast.error("Invalid file format", {
        description: "Only .gguf files are supported for model uploads"
      });
      return;
    }
    
    // Create a new model entry for UI feedback
    const newModelId = `custom-${Date.now()}`;
    const newModel: OllamaModel = {
      id: newModelId,
      name: file.name.replace('.gguf', ''),
      modelfile: '',
      size: file.size,
      parameters: 'Custom',
      format: 'gguf'
    };
    
    setModels(prev => [...prev, {...newModel, size: 0}]);
    
    // Start upload process via Ollama service
    try {
      await ollamaService.uploadModel(file);
      
      // Refresh model list
      loadModels();
    } catch (error) {
      console.error("Error uploading model:", error);
      
      // Remove the temporary model entry
      setModels(prev => prev.filter(m => m.id !== newModelId));
      
      toast.error("Failed to upload model", {
        description: "There was an error processing your model file"
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative font-terminal", className)}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-purple h-5 flex items-center justify-between px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">MODEL SELECTION</div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
          onClick={loadModels}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        </Button>
      </div>
      
      <div className="pt-6 p-2 grid gap-3 max-h-[500px] overflow-y-auto">
        {models.length === 0 ? (
          <div className="text-center text-cyberpunk-neon-purple p-4">
            {isLoading ? (
              <div className="animate-pulse">Loading models...</div>
            ) : (
              <div>
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>No models available</p>
                <p className="text-xs mt-2">
                  Make sure Ollama is running and connected
                </p>
                <Button
                  variant="outline"
                  className="mt-4 border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
                  onClick={loadModels}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Models
                </Button>
              </div>
            )}
          </div>
        ) : (
          models.map(model => (
            <Card 
              key={model.id}
              className={cn(
                "cursor-pointer border transition-all duration-200",
                "bg-cyberpunk-dark-blue hover:bg-opacity-80 pixel-corners",
                selectedModel === model.id 
                  ? "border-cyberpunk-neon-purple purple-glow" 
                  : "border-cyberpunk-neon-blue opacity-80"
              )}
              onClick={() => handleModelSelect(model)}
            >
              <div className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-cyberpunk-neon-blue font-bold">
                    {model.name}
                    {model.parameters && (
                      <span className="ml-2 text-xs opacity-80">{model.parameters}</span>
                    )}
                  </h3>
                  <div className="text-xs">
                    <span className="text-cyberpunk-neon-green">● ONLINE</span>
                  </div>
                </div>
                
                <p className="text-cyberpunk-neon-blue text-opacity-80 mt-1">
                  {model.size > 0 
                    ? `Size: ${(model.size / 1024 / 1024 / 1024).toFixed(1)} GB` 
                    : `Format: ${model.format || 'GGUF'}`}
                </p>
              </div>
            </Card>
          ))
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          onChange={handleFileUpload}
          accept=".gguf"
        />
        
        <div className="relative">
          <Button 
            variant="outline"
            className="w-full mt-2 border border-dashed border-cyberpunk-neon-purple text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue flex items-center justify-center"
            onClick={openFileDialog}
          >
            <Upload className="h-4 w-4 mr-2" />
            UPLOAD GGUF MODEL
          </Button>
          <div className="text-xs text-cyberpunk-neon-purple opacity-70 mt-1 text-center">
            Supports local quantized models in GGUF format
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelector;
