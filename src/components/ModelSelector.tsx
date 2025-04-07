
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Upload, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";

interface Model {
  id: string;
  name: string;
  description: string;
  parameters?: string;
  status: 'available' | 'downloading' | 'error';
  progress?: number;
  local?: boolean;
}

interface ModelSelectorProps {
  className?: string;
  onModelSelect?: (model: Model) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  className,
  onModelSelect 
}) => {
  // Demo models
  const [models, setModels] = useState<Model[]>([
    {
      id: 'llama2',
      name: 'Llama 2',
      description: 'Meta AI\'s open LLM suitable for dialogue and text generation',
      parameters: '7B',
      status: 'available'
    },
    {
      id: 'codellama',
      name: 'CodeLlama',
      description: 'Code specialized model with improved programming abilities',
      parameters: '13B',
      status: 'available'
    },
    {
      id: 'mistral',
      name: 'Mistral',
      description: 'Efficient open-weight model with strong reasoning capabilities',
      parameters: '7B',
      status: 'available'
    },
    {
      id: 'qux-aux',
      name: 'QUX-AUX',
      description: 'Self-modifying auxiliary system with CoT reasoning',
      parameters: 'Unknown',
      status: 'downloading',
      progress: 45
    }
  ]);

  const [selectedModel, setSelectedModel] = useState<string | null>('llama2');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModelSelect = (model: Model) => {
    if (model.status === 'available') {
      setSelectedModel(model.id);
      if (onModelSelect) {
        onModelSelect(model);
      }
    } else {
      toast.info(`Model ${model.name} is not ready yet`, {
        description: model.status === 'downloading' 
          ? `Download progress: ${model.progress}%` 
          : "Model is currently unavailable"
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    
    const file = event.target.files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension !== 'gguf') {
      toast.error("Invalid file format", {
        description: "Only .gguf files are supported for model uploads"
      });
      return;
    }
    
    // Create a new model entry
    const newModelId = `custom-${Date.now()}`;
    const newModel: Model = {
      id: newModelId,
      name: file.name.replace('.gguf', ''),
      description: 'Custom uploaded model',
      status: 'downloading',
      progress: 0,
      local: true
    };
    
    setModels(prev => [...prev, newModel]);
    toast.success("Model upload started", {
      description: `Preparing ${file.name}`
    });
    
    // Simulate upload and processing
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 5) + 3; // Random progress increase between 3-7%
      
      if (progress >= 100) {
        clearInterval(interval);
        progress = 100;
        
        setModels(prev => prev.map(m => 
          m.id === newModelId 
            ? { ...m, status: 'available', progress: undefined } 
            : m
        ));
        
        toast.success("Model upload complete", {
          description: `${file.name} is now ready to use`
        });
      } else {
        setModels(prev => prev.map(m => 
          m.id === newModelId ? { ...m, progress } : m
        ));
      }
    }, 500);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleModelError = (modelId: string) => {
    setModels(prev => prev.map(m => 
      m.id === modelId ? { ...m, status: 'error' } : m
    ));
    
    const model = models.find(m => m.id === modelId);
    if (model) {
      toast.error(`Failed to load ${model.name}`, {
        description: "Check console for details or try again"
      });
    }
  };

  return (
    <div className={cn("relative font-terminal", className)}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-purple h-5 flex items-center px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">MODEL SELECTION</div>
      </div>
      
      <div className="pt-6 p-2 grid gap-3 max-h-[500px] overflow-y-auto">
        {models.map(model => (
          <Card 
            key={model.id}
            className={cn(
              "cursor-pointer border transition-all duration-200",
              "bg-cyberpunk-dark-blue hover:bg-opacity-80 pixel-corners",
              selectedModel === model.id 
                ? "border-cyberpunk-neon-purple purple-glow" 
                : "border-cyberpunk-neon-blue opacity-80",
              model.status !== 'available' && "opacity-70 cursor-not-allowed"
            )}
            onClick={() => handleModelSelect(model)}
          >
            <div className="p-3 text-sm">
              <div className="flex items-center justify-between">
                <h3 className={cn(
                  "font-bold",
                  model.local ? "text-cyberpunk-neon-purple" : "text-cyberpunk-neon-blue" 
                )}>
                  {model.name}
                  {model.parameters && <span className="ml-2 text-xs opacity-80">{model.parameters}</span>}
                </h3>
                <div className="text-xs">
                  {model.status === 'available' && (
                    <span className="text-cyberpunk-neon-green">● ONLINE</span>
                  )}
                  {model.status === 'downloading' && (
                    <span className="text-yellow-400 animate-pulse">● DOWNLOADING</span>
                  )}
                  {model.status === 'error' && (
                    <span className="text-cyberpunk-neon-pink flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" /> ERROR
                    </span>
                  )}
                </div>
              </div>
              <p className="text-cyberpunk-neon-blue text-opacity-80 mt-1">{model.description}</p>
              
              {model.status === 'downloading' && model.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full h-2 bg-cyberpunk-dark">
                    <div 
                      className="h-full bg-yellow-400" 
                      style={{ width: `${model.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-right mt-1 text-yellow-400">{model.progress}%</div>
                </div>
              )}
            </div>
          </Card>
        ))}
        
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
