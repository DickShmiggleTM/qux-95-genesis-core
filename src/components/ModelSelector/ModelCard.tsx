
import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OllamaModel } from '@/services/ollama/types';

interface ModelCardProps {
  model: OllamaModel;
  isSelected: boolean;
  onSelect: (model: OllamaModel) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, isSelected, onSelect }) => {
  return (
    <Card 
      key={model.id}
      className={cn(
        "cursor-pointer border transition-all duration-200",
        "bg-cyberpunk-dark-blue hover:bg-opacity-80 pixel-corners",
        isSelected 
          ? "border-cyberpunk-neon-purple purple-glow" 
          : "border-cyberpunk-neon-blue opacity-80"
      )}
      onClick={() => onSelect(model)}
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
  );
};

export default ModelCard;
