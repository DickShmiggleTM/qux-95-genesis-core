
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  description: string;
  parameters?: string;
  status: 'available' | 'downloading' | 'error';
  progress?: number;
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

  const handleModelSelect = (model: Model) => {
    if (model.status === 'available') {
      setSelectedModel(model.id);
      if (onModelSelect) {
        onModelSelect(model);
      }
    }
  };

  const uploadModel = () => {
    // Simulate file upload - in a real app, this would open a file dialog
    const newModel: Model = {
      id: 'custom-' + Date.now().toString(),
      name: 'Custom Model',
      description: 'Uploaded user model',
      status: 'downloading',
      progress: 0
    };
    
    setModels([...models, newModel]);
    
    // Simulate download process
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress <= 100) {
        setModels(prev => prev.map(m => 
          m.id === newModel.id ? { ...m, progress } : m
        ));
      } else {
        setModels(prev => prev.map(m => 
          m.id === newModel.id ? { ...m, status: 'available', progress: undefined } : m
        ));
        clearInterval(interval);
      }
    }, 500);
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
                <h3 className="font-bold text-cyberpunk-neon-blue">
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
                    <span className="text-cyberpunk-neon-pink">● ERROR</span>
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
        
        <Button 
          variant="outline"
          className="mt-2 border border-dashed border-cyberpunk-neon-blue text-cyberpunk-neon-blue hover:bg-cyberpunk-dark-blue"
          onClick={uploadModel}
        >
          + UPLOAD GGUF MODEL
        </Button>
      </div>
    </div>
  );
};

export default ModelSelector;
