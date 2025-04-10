
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw } from 'lucide-react';
import { toast } from "sonner";
import { ollamaService, OllamaModel } from '@/services/ollama/index';
import ModelList from './ModelList';
import ModelUploader from './ModelUploader';

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
        <ModelList 
          models={models}
          selectedModelId={selectedModel}
          isLoading={isLoading}
          onModelSelect={handleModelSelect}
          onRefresh={loadModels}
        />
        
        <ModelUploader onUploadComplete={loadModels} />
      </div>
    </div>
  );
};

export default ModelSelector;
