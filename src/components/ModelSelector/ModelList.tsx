
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { OllamaModel } from '@/services/ollama/types';
import ModelCard from './ModelCard';

interface ModelListProps {
  models: OllamaModel[];
  selectedModelId: string | null;
  isLoading: boolean;
  onModelSelect: (model: OllamaModel) => void;
  onRefresh: () => void;
}

const ModelList: React.FC<ModelListProps> = ({
  models,
  selectedModelId,
  isLoading,
  onModelSelect,
  onRefresh
}) => {
  if (models.length === 0) {
    return (
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
              onClick={onRefresh}
            >
              <svg 
                className="h-4 w-4 mr-2" 
                fill="none" 
                height="24" 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                viewBox="0 0 24 24" 
                width="24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M8 16H3v5"/>
              </svg>
              Refresh Models
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {models.map(model => (
        <ModelCard
          key={model.id}
          model={model}
          isSelected={model.id === selectedModelId}
          onSelect={onModelSelect}
        />
      ))}
    </div>
  );
};

export default ModelList;
