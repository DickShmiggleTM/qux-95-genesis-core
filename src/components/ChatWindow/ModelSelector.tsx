import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  availableModels: string[];
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  availableModels = ['QUX-95', 'llama2', 'mistral', 'codellama', 'vicuna']
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[120px] h-4 text-xs bg-cyberpunk-dark text-cyberpunk-neon-green border-cyberpunk-neon-green">
        <SelectValue placeholder="Model" />
      </SelectTrigger>
      <SelectContent
        className="bg-cyberpunk-dark text-cyberpunk-neon-green border-cyberpunk-neon-green"
      >
        {availableModels.map((model) => (
          <SelectItem key={model} value={model} className="text-xs py-1">
            {model}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;
