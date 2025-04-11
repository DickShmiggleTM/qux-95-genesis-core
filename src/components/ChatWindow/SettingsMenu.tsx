
import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon } from 'lucide-react';

interface SettingsMenuProps {
  autoRespond: boolean;
  setAutoRespond: (value: boolean) => void;
  autoRespondDelay: number;
  setAutoRespondDelay: (value: number) => void;
  useStreaming: boolean;
  setUseStreaming: (value: boolean) => void;
  useReasoning: boolean;
  setUseReasoning: (value: boolean) => void;
  contextRetrieval: boolean;
  setContextRetrieval: (value: boolean) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  maxTokens: number;
  setMaxTokens: (value: number) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  autoRespond,
  setAutoRespond,
  autoRespondDelay,
  setAutoRespondDelay,
  useStreaming,
  setUseStreaming,
  useReasoning,
  setUseReasoning,
  contextRetrieval,
  setContextRetrieval,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
        >
          <SettingsIcon className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-cyberpunk-dark-blue border-cyberpunk-neon-green text-cyberpunk-neon-green w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Chat Settings</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-respond">Auto-respond</Label>
              <Switch 
                id="auto-respond" 
                checked={autoRespond}
                onCheckedChange={setAutoRespond}
                className="data-[state=checked]:bg-cyberpunk-neon-green"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="use-streaming">Stream responses</Label>
              <Switch 
                id="use-streaming" 
                checked={useStreaming}
                onCheckedChange={setUseStreaming}
                className="data-[state=checked]:bg-cyberpunk-neon-green"
              />
            </div>
            
            {autoRespond && (
              <div className="grid gap-2">
                <Label htmlFor="auto-respond-delay">Response delay (seconds)</Label>
                <Slider
                  id="auto-respond-delay"
                  value={[autoRespondDelay]}
                  min={1}
                  max={30}
                  step={1}
                  onValueChange={([value]) => setAutoRespondDelay(value)}
                />
                <div className="text-xs text-right">{autoRespondDelay}s</div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Model Settings</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="use-reasoning">Use reasoning</Label>
              <Switch 
                id="use-reasoning" 
                checked={useReasoning}
                onCheckedChange={setUseReasoning}
                className="data-[state=checked]:bg-cyberpunk-neon-green"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="context-retrieval">Context retrieval</Label>
              <Switch 
                id="context-retrieval" 
                checked={contextRetrieval}
                onCheckedChange={setContextRetrieval}
                className="data-[state=checked]:bg-cyberpunk-neon-green"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Slider
                id="temperature"
                value={[temperature * 100]}
                min={1}
                max={100}
                step={1}
                onValueChange={([value]) => setTemperature(value / 100)}
              />
              <div className="text-xs text-right">{temperature.toFixed(2)}</div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Slider
                id="max-tokens"
                value={[maxTokens]}
                min={256}
                max={4096}
                step={256}
                onValueChange={([value]) => setMaxTokens(value)}
              />
              <div className="text-xs text-right">{maxTokens}</div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SettingsMenu;
