import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { ollamaService } from '@/services/ollamaService';
import { enhancedMemoryManager } from '@/services/memory/EnhancedMemoryManager';
import { MemoryOptions } from '@/services/memory/MemoryTypes';

interface SettingsProps {
  className?: string;
  onSave?: (settings: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ className, onSave }) => {
  const { theme, setTheme, animationsEnabled, setAnimationsEnabled } = useTheme();
  
  const [settings, setSettings] = useState({
    // Connection settings
    ollamaEndpoint: 'http://localhost:11434/api',
    connectionTimeout: 30,
    
    // Model settings
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
    
    // System settings
    enableSelfModification: true,
    enableWebSearch: true,
    enableVision: false,
    enableImageGeneration: false,
    enableRagCapability: true,
    
    // UI settings
    theme: theme,
    enableAnimations: animationsEnabled,
    logLevel: 'info',
    
    // Chat settings
    autoRespond: false,
    autoRespondDelay: 5,
    chatMaxLength: 100,
    
    // Memory settings
    shortTermCapacity: 50,
    longTermCapacity: 1000,
    contextWindowSize: 10,
    adaptiveContextSize: true,
    enableMemorySummarization: true,
    memoryDecayFactor: 0.95,
    memoryPersistenceMode: 'local',
    enableVectorSearch: true,
    autoPruneThreshold: 0.2
  });

  // Load memory settings on init
  useEffect(() => {
    try {
      const memoryOptions = enhancedMemoryManager.getOptions();
      setSettings(prev => ({
        ...prev,
        shortTermCapacity: memoryOptions.shortTermCapacity,
        longTermCapacity: memoryOptions.longTermCapacity,
        contextWindowSize: memoryOptions.contextWindowSize,
        adaptiveContextSize: memoryOptions.adaptiveMode,
        memoryDecayFactor: memoryOptions.decayFactor,
        memoryPersistenceMode: memoryOptions.persistenceMode,
        enableVectorSearch: memoryOptions.vectorDimensions > 0,
        autoPruneThreshold: memoryOptions.autoPruneThreshold
      }));
    } catch (error) {
      console.error('Failed to load memory settings:', error);
    }
  }, []);

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: theme,
      enableAnimations: animationsEnabled
    }));
  }, [theme, animationsEnabled]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply theme and animation changes immediately
    if (key === 'theme') {
      setTheme(value);
    } else if (key === 'enableAnimations') {
      setAnimationsEnabled(value);
    }
  };

  const handleSaveSettings = () => {
    // Update Ollama endpoint
    if (settings.ollamaEndpoint && settings.ollamaEndpoint.trim() !== '') {
      (window as any).OLLAMA_BASE_URL = settings.ollamaEndpoint.trim();
    }

    // Apply theme settings
    setTheme(settings.theme as 'cyberpunk' | 'terminal' | 'hacker');
    setAnimationsEnabled(settings.enableAnimations);
    
    // Update memory settings
    try {
      const memoryOptions: Partial<MemoryOptions> = {
        shortTermCapacity: settings.shortTermCapacity,
        longTermCapacity: settings.longTermCapacity,
        contextWindowSize: settings.contextWindowSize,
        adaptiveMode: settings.adaptiveContextSize,
        decayFactor: settings.memoryDecayFactor,
        persistenceMode: settings.memoryPersistenceMode as 'local' | 'indexed-db' | 'file' | 'sqlite',
        vectorDimensions: settings.enableVectorSearch ? 384 : 0,
        autoPruneThreshold: settings.autoPruneThreshold
      };
      
      enhancedMemoryManager.setOptions(memoryOptions);
    } catch (error) {
      console.error('Failed to update memory settings:', error);
      toast.error('Failed to update memory settings', {
        description: 'Some memory options could not be applied'
      });
    }
    
    if (onSave) {
      onSave(settings);
    }
    
    toast.success("Settings saved successfully", {
      description: "Your preferences have been updated"
    });
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-purple rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-purple h-5 flex items-center px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">SYSTEM SETTINGS</div>
      </div>
      
      <div className="p-4 pt-6 h-full overflow-y-auto text-cyberpunk-neon-purple">
        <div className="grid gap-6">
          {/* Connection Settings */}
          <div>
            <h3 className="text-cyberpunk-neon-purple font-bold mb-3">CONNECTION SETTINGS</h3>
            
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="ollamaEndpoint">Ollama API Endpoint</Label>
                <Input
                  id="ollamaEndpoint"
                  value={settings.ollamaEndpoint}
                  onChange={(e) => handleSettingChange('ollamaEndpoint', e.target.value)}
                  className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple text-cyberpunk-neon-blue"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="connectionTimeout">Connection Timeout (seconds)</Label>
                <Slider
                  id="connectionTimeout"
                  value={[settings.connectionTimeout]}
                  min={5}
                  max={60}
                  step={1}
                  onValueChange={(value) => handleSettingChange('connectionTimeout', value[0])}
                  className="py-4"
                />
                <div className="text-right text-xs">{settings.connectionTimeout} sec</div>
              </div>
            </div>
          </div>
          
          {/* Model Settings */}
          <div>
            <h3 className="text-cyberpunk-neon-purple font-bold mb-3">MODEL PARAMETERS</h3>
            
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Slider
                  id="temperature"
                  value={[settings.temperature * 100]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(value) => handleSettingChange('temperature', value[0] / 100)}
                  className="py-4"
                />
                <div className="text-right text-xs">{settings.temperature.toFixed(2)}</div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Slider
                  id="maxTokens"
                  value={[settings.maxTokens]}
                  min={256}
                  max={4096}
                  step={256}
                  onValueChange={(value) => handleSettingChange('maxTokens', value[0])}
                  className="py-4"
                />
                <div className="text-right text-xs">{settings.maxTokens}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="topP">Top P</Label>
                  <Slider
                    id="topP"
                    value={[settings.topP * 100]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={(value) => handleSettingChange('topP', value[0] / 100)}
                    className="py-4"
                  />
                  <div className="text-right text-xs">{settings.topP.toFixed(2)}</div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="presencePenalty">Presence Penalty</Label>
                  <Slider
                    id="presencePenalty"
                    value={[settings.presencePenalty * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => handleSettingChange('presencePenalty', value[0] / 100)}
                    className="py-4"
                  />
                  <div className="text-right text-xs">{settings.presencePenalty.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat Settings */}
          <div>
            <h3 className="text-cyberpunk-neon-purple font-bold mb-3">CHAT SETTINGS</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoRespond">Enable Auto-Response</Label>
                <Switch
                  id="autoRespond"
                  checked={settings.autoRespond}
                  onCheckedChange={(checked) => handleSettingChange('autoRespond', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
              
              {settings.autoRespond && (
                <div className="grid gap-2">
                  <Label htmlFor="autoRespondDelay">Auto-Response Delay (seconds)</Label>
                  <Slider
                    id="autoRespondDelay"
                    value={[settings.autoRespondDelay]}
                    min={1}
                    max={30}
                    step={1}
                    onValueChange={(value) => handleSettingChange('autoRespondDelay', value[0])}
                    className="py-4"
                  />
                  <div className="text-right text-xs">{settings.autoRespondDelay} sec</div>
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="chatMaxLength">Max Chat History Length</Label>
                <Slider
                  id="chatMaxLength"
                  value={[settings.chatMaxLength]}
                  min={10}
                  max={500}
                  step={10}
                  onValueChange={(value) => handleSettingChange('chatMaxLength', value[0])}
                  className="py-4"
                />
                <div className="text-right text-xs">{settings.chatMaxLength} messages</div>
              </div>
            </div>
          </div>
          
          {/* System Settings */}
          <div>
            <h3 className="text-cyberpunk-neon-purple font-bold mb-3">SYSTEM CAPABILITIES</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableSelfModification">Enable Self-Modification</Label>
                <Switch
                  id="enableSelfModification"
                  checked={settings.enableSelfModification}
                  onCheckedChange={(checked) => handleSettingChange('enableSelfModification', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableWebSearch">Enable Web Search</Label>
                <Switch
                  id="enableWebSearch"
                  checked={settings.enableWebSearch}
                  onCheckedChange={(checked) => handleSettingChange('enableWebSearch', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableVision">Enable Vision Capabilities</Label>
                <Switch
                  id="enableVision"
                  checked={settings.enableVision}
                  onCheckedChange={(checked) => handleSettingChange('enableVision', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableImageGeneration">Enable Image Generation</Label>
                <Switch
                  id="enableImageGeneration"
                  checked={settings.enableImageGeneration}
                  onCheckedChange={(checked) => handleSettingChange('enableImageGeneration', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableRagCapability">Enable RAG Capability</Label>
                <Switch
                  id="enableRagCapability"
                  checked={settings.enableRagCapability}
                  onCheckedChange={(checked) => handleSettingChange('enableRagCapability', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
            </div>
          </div>
          
          {/* UI Settings */}
          <div>
            <h3 className="text-cyberpunk-neon-purple font-bold mb-3">UI SETTINGS</h3>
            
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="theme">Theme</Label>
                <Select 
                  value={settings.theme}
                  onValueChange={(value) => handleSettingChange('theme', value)}
                >
                  <SelectTrigger className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple text-cyberpunk-neon-blue">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple text-cyberpunk-neon-blue">
                    <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                    <SelectItem value="terminal">Terminal</SelectItem>
                    <SelectItem value="hacker">Hacker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableAnimations">Enable Animations</Label>
                <Switch
                  id="enableAnimations"
                  checked={settings.enableAnimations}
                  onCheckedChange={(checked) => handleSettingChange('enableAnimations', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="logLevel">Log Level</Label>
                <Select 
                  value={settings.logLevel}
                  onValueChange={(value) => handleSettingChange('logLevel', value)}
                >
                  <SelectTrigger className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple text-cyberpunk-neon-blue">
                    <SelectValue placeholder="Select log level" />
                  </SelectTrigger>
                  <SelectContent className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple text-cyberpunk-neon-blue">
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Memory Settings - New Section */}
          <div>
            <h3 className="text-cyberpunk-neon-purple font-bold mb-3">MEMORY MANAGEMENT</h3>
            
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="contextWindowSize">Context Window Size</Label>
                <Slider
                  id="contextWindowSize"
                  value={[settings.contextWindowSize]}
                  min={5}
                  max={30}
                  step={1}
                  onValueChange={(value) => handleSettingChange('contextWindowSize', value[0])}
                  className="py-4"
                />
                <div className="text-right text-xs">{settings.contextWindowSize} items</div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="adaptiveContextSize">Adaptive Context Size</Label>
                <Switch
                  id="adaptiveContextSize"
                  checked={settings.adaptiveContextSize}
                  onCheckedChange={(checked) => handleSettingChange('adaptiveContextSize', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="shortTermCapacity">Short-Term Memory Capacity</Label>
                <Slider
                  id="shortTermCapacity"
                  value={[settings.shortTermCapacity]}
                  min={10}
                  max={200}
                  step={10}
                  onValueChange={(value) => handleSettingChange('shortTermCapacity', value[0])}
                  className="py-4"
                />
                <div className="text-right text-xs">{settings.shortTermCapacity} items</div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="longTermCapacity">Long-Term Memory Capacity</Label>
                <Slider
                  id="longTermCapacity"
                  value={[settings.longTermCapacity]}
                  min={100}
                  max={5000}
                  step={100}
                  onValueChange={(value) => handleSettingChange('longTermCapacity', value[0])}
                  className="py-4"
                />
                <div className="text-right text-xs">{settings.longTermCapacity} items</div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="memoryDecayFactor">Memory Decay Factor</Label>
                <Slider
                  id="memoryDecayFactor"
                  value={[settings.memoryDecayFactor * 100]}
                  min={80}
                  max={99}
                  step={1}
                  onValueChange={(value) => handleSettingChange('memoryDecayFactor', value[0] / 100)}
                  className="py-4"
                />
                <div className="text-right text-xs">{settings.memoryDecayFactor.toFixed(2)}</div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableVectorSearch">Enable Vector Search</Label>
                <Switch
                  id="enableVectorSearch"
                  checked={settings.enableVectorSearch}
                  onCheckedChange={(checked) => handleSettingChange('enableVectorSearch', checked)}
                  className="data-[state=checked]:bg-cyberpunk-neon-purple"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="memoryPersistenceMode">Persistence Mode</Label>
                <Select
                  value={settings.memoryPersistenceMode}
                  onValueChange={(value) => handleSettingChange('memoryPersistenceMode', value)}
                >
                  <SelectTrigger id="memoryPersistenceMode" className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple text-cyberpunk-neon-blue">
                    <SelectValue placeholder="Select storage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Storage</SelectItem>
                    <SelectItem value="indexed-db">Indexed DB</SelectItem>
                    <SelectItem value="sqlite">SQLite</SelectItem>
                    <SelectItem value="file">File System</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-cyberpunk-neon-blue">Determines how memory is stored between sessions</div>
              </div>
              
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    enhancedMemoryManager.clearMemory();
                    toast.success('Memory cleared', {
                      description: 'All memory items have been removed'
                    });
                  }}
                  className="border-red-500 text-red-500 hover:bg-red-950 hover:text-red-400"
                >
                  Clear Memory
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    enhancedMemoryManager.applyMemoryDecay();
                    toast.success('Memory decay applied', {
                      description: 'Importance of older memories has been reduced'
                    });
                  }}
                  className="border-yellow-500 text-yellow-500 hover:bg-yellow-950 hover:text-yellow-400"
                >
                  Apply Decay
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    enhancedMemoryManager.backupMemory('memory_backup.json');
                    toast.success('Memory backed up', {
                      description: 'Memory data has been backed up'
                    });
                  }}
                  className="border-cyberpunk-neon-blue text-cyberpunk-neon-blue hover:bg-blue-950"
                >
                  Backup
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSaveSettings}
            className="bg-cyberpunk-neon-purple text-cyberpunk-dark hover:bg-cyberpunk-neon-pink"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
