
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  BarChart, 
  Book, 
  Pencil, 
  Check, 
  X, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCcw,
  Plus,
  Save
} from 'lucide-react';
import { learningService } from '@/services/learningService';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface LearningSystemProps {
  className?: string;
}

const LearningSystem: React.FC<LearningSystemProps> = ({ className }) => {
  const [isEnabled, setIsEnabled] = useState(learningService.isEnabled());
  const [stats, setStats] = useState(learningService.getStats());
  const [activeModel, setActiveModel] = useState(learningService.getActiveModel());
  const [models, setModels] = useState(learningService.getModels());
  const [examples, setExamples] = useState(learningService.getExamples());
  const [filterTag, setFilterTag] = useState('');
  const [filterFeedback, setFilterFeedback] = useState<'positive' | 'negative' | 'neutral' | ''>('');
  const [isRecording, setIsRecording] = useState(false);
  const [newExample, setNewExample] = useState({ input: '', output: '', tags: '' });
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', description: '', learningRate: '0.01' });
  const [isLoading, setIsLoading] = useState(false);

  // Refresh data when enabled state changes
  useEffect(() => {
    if (isEnabled) {
      refreshData();
    }
  }, [isEnabled]);

  const refreshData = () => {
    setStats(learningService.getStats());
    setActiveModel(learningService.getActiveModel());
    setModels(learningService.getModels());
    
    // Apply filters if any
    if (filterTag || filterFeedback) {
      const filter: { tags?: string[], feedback?: 'positive' | 'negative' | 'neutral' } = {};
      if (filterTag) filter.tags = [filterTag];
      if (filterFeedback) filter.feedback = filterFeedback as 'positive' | 'negative' | 'neutral';
      setExamples(learningService.getExamples(filter));
    } else {
      setExamples(learningService.getExamples());
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    if (enabled) {
      learningService.enable();
    } else {
      learningService.disable();
    }
    
    setIsEnabled(enabled);
    
    toast.success(enabled ? 'Learning system enabled' : 'Learning system disabled', {
      description: enabled 
        ? 'The system will now learn from interactions' 
        : 'Learning has been paused'
    });
  };

  const handleStartLearning = async () => {
    setIsLoading(true);
    
    try {
      const success = await learningService.learn();
      
      if (success) {
        toast.success('Learning process completed', {
          description: 'The system has learned from examples'
        });
        refreshData();
      } else {
        toast.error('Learning failed', {
          description: 'Failed to complete learning process'
        });
      }
    } catch (error) {
      toast.error('Learning error', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActiveModel = (modelId: string) => {
    const success = learningService.setActiveModel(modelId);
    
    if (success) {
      toast.success('Model activated', {
        description: 'The selected model is now active'
      });
      
      setActiveModel(learningService.getActiveModel());
    } else {
      toast.error('Activation failed', {
        description: 'Failed to activate the model'
      });
    }
  };

  const handleCreateModel = () => {
    if (!newModel.name || !newModel.description) {
      toast.error('Invalid input', {
        description: 'Please enter a name and description'
      });
      return;
    }
    
    try {
      const modelId = learningService.createModel(
        newModel.name,
        newModel.description,
        { learningRate: parseFloat(newModel.learningRate) || 0.01 }
      );
      
      if (modelId) {
        toast.success('Model created', {
          description: `${newModel.name} created successfully`
        });
        
        setNewModel({ name: '', description: '', learningRate: '0.01' });
        setIsCreatingModel(false);
        refreshData();
      }
    } catch (error) {
      toast.error('Creation failed', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  const handleRecordExample = () => {
    if (!newExample.input || !newExample.output) {
      toast.error('Invalid input', {
        description: 'Please enter both input and output'
      });
      return;
    }
    
    try {
      const tags = newExample.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      const exampleId = learningService.recordExample(
        newExample.input,
        newExample.output,
        tags
      );
      
      if (exampleId) {
        toast.success('Example recorded', {
          description: 'Learning example recorded successfully'
        });
        
        setNewExample({ input: '', output: '', tags: '' });
        setIsRecording(false);
        refreshData();
      }
    } catch (error) {
      toast.error('Recording failed', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  const handleProvideFeedback = (exampleId: string, feedback: 'positive' | 'negative' | 'neutral') => {
    const success = learningService.provideFeedback(exampleId, feedback);
    
    if (success) {
      toast.success('Feedback recorded', {
        description: `${feedback.charAt(0).toUpperCase() + feedback.slice(1)} feedback recorded`
      });
      
      refreshData();
    } else {
      toast.error('Feedback failed', {
        description: 'Failed to record feedback'
      });
    }
  };

  const handleFilterChange = () => {
    refreshData();
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-pink rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-pink h-5 flex items-center justify-between px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">LEARNING SYSTEM</div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4"
          onClick={refreshData}
        >
          <RefreshCcw size={10} className="text-cyberpunk-dark" />
        </Button>
      </div>
      
      <div className="p-4 pt-6 h-full overflow-auto">
        {/* System Control */}
        <div className="flex items-center justify-between mb-4 bg-cyberpunk-dark-blue p-3 rounded">
          <div className="flex items-center">
            <Brain className="mr-2 text-cyberpunk-neon-pink" size={18} />
            <div>
              <h3 className="font-bold">Self-Learning System</h3>
              <p className="text-xs text-cyberpunk-neon-blue">
                Autonomous improvement through experience
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="learningEnabled">Enabled</Label>
            <Switch
              id="learningEnabled"
              checked={isEnabled}
              onCheckedChange={handleToggleEnabled}
              className="data-[state=checked]:bg-cyberpunk-neon-pink"
            />
          </div>
        </div>
        
        {!isEnabled ? (
          <div className="text-center py-8">
            <Brain size={48} className="mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-bold text-cyberpunk-neon-pink mb-2">Learning System Disabled</h3>
            <p className="text-cyberpunk-neon-blue">
              Enable the learning system to allow the AI to improve through experience.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stats Panel */}
            <div className="bg-cyberpunk-dark-blue p-3 rounded">
              <div className="flex items-center mb-3">
                <BarChart className="mr-2 text-cyberpunk-neon-pink" size={16} />
                <h3 className="font-bold">Learning Statistics</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-cyberpunk-neon-blue">Total Examples</div>
                  <div>{stats.totalExamples}</div>
                </div>
                
                <div>
                  <div className="text-xs text-cyberpunk-neon-blue">Last Learning</div>
                  <div>
                    {stats.lastLearnedAt 
                      ? new Date(stats.lastLearnedAt).toLocaleString() 
                      : 'Never'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-cyberpunk-neon-blue">Improvement Rate</div>
                  <div className="flex items-center">
                    <Progress 
                      value={stats.improvementRate} 
                      max={10}
                      className="h-2 w-32 mr-2 bg-cyberpunk-dark border-cyberpunk-neon-pink"
                    />
                    {stats.improvementRate.toFixed(2)}%
                  </div>
                </div>
                
                {activeModel && (
                  <>
                    <div className="pt-1">
                      <div className="text-xs text-cyberpunk-neon-pink">Active Model</div>
                      <div>{activeModel.name}</div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-cyberpunk-neon-blue">Model Accuracy</div>
                      <div className="flex items-center">
                        <Progress 
                          value={activeModel.performance.accuracy * 100} 
                          className="h-2 w-32 mr-2 bg-cyberpunk-dark border-cyberpunk-neon-pink"
                        />
                        {(activeModel.performance.accuracy * 100).toFixed(2)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-cyberpunk-neon-blue">Iterations</div>
                      <div>{activeModel.performance.iterations}</div>
                    </div>
                  </>
                )}
              </div>
              
              <Button
                size="sm"
                onClick={handleStartLearning}
                disabled={isLoading}
                className="w-full mt-3 bg-cyberpunk-neon-pink text-cyberpunk-dark hover:bg-pink-600"
              >
                <Brain className="mr-2 h-4 w-4" />
                Start Learning Process
              </Button>
            </div>
            
            {/* Models Panel */}
            <div className="bg-cyberpunk-dark-blue p-3 rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Book className="mr-2 text-cyberpunk-neon-pink" size={16} />
                  <h3 className="font-bold">Learning Models</h3>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsCreatingModel(true)}
                >
                  <Plus size={14} className="text-cyberpunk-neon-pink" />
                </Button>
              </div>
              
              {isCreatingModel ? (
                <div className="mb-4 space-y-2">
                  <Input
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    placeholder="Model Name"
                    className="bg-cyberpunk-dark border-cyberpunk-neon-pink text-xs"
                  />
                  
                  <Input
                    value={newModel.description}
                    onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                    placeholder="Description"
                    className="bg-cyberpunk-dark border-cyberpunk-neon-pink text-xs"
                  />
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="learningRate" className="text-xs whitespace-nowrap">Learning Rate</Label>
                    <Input
                      id="learningRate"
                      value={newModel.learningRate}
                      onChange={(e) => setNewModel({ ...newModel, learningRate: e.target.value })}
                      className="bg-cyberpunk-dark border-cyberpunk-neon-pink text-xs"
                    />
                  </div>
                  
                  <div className="flex space-x-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsCreatingModel(false)}
                      className="text-xs"
                    >
                      <X size={12} className="mr-1" />
                      Cancel
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={handleCreateModel}
                      className="bg-cyberpunk-neon-pink text-cyberpunk-dark hover:bg-pink-600 text-xs"
                    >
                      <Save size={12} className="mr-1" />
                      Create
                    </Button>
                  </div>
                </div>
              ) : null}
              
              <div className="space-y-2 max-h-40 overflow-auto">
                {models.map(model => (
                  <div 
                    key={model.id} 
                    className={cn(
                      "p-2 border rounded text-sm",
                      activeModel?.id === model.id 
                        ? "border-cyberpunk-neon-pink bg-cyberpunk-dark" 
                        : "border-cyberpunk-dark"
                    )}
                  >
                    <div className="flex justify-between">
                      <div className="font-medium">{model.name}</div>
                      {activeModel?.id !== model.id && (
                        <Button
                          variant="link"
                          className="h-5 p-0 text-xs text-cyberpunk-neon-pink"
                          onClick={() => handleSetActiveModel(model.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-xs text-cyberpunk-neon-blue">
                      Accuracy: {(model.performance.accuracy * 100).toFixed(2)}%
                    </div>
                    
                    <div className="text-xs text-cyberpunk-neon-blue">
                      Iterations: {model.performance.iterations}
                    </div>
                  </div>
                ))}
                
                {models.length === 0 && (
                  <div className="text-center py-3 text-xs text-cyberpunk-neon-blue">
                    No models available
                  </div>
                )}
              </div>
            </div>
            
            {/* Examples Panel */}
            <div className="bg-cyberpunk-dark-blue p-3 rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Pencil className="mr-2 text-cyberpunk-neon-pink" size={16} />
                  <h3 className="font-bold">Learning Examples</h3>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsRecording(true)}
                >
                  <Plus size={14} className="text-cyberpunk-neon-pink" />
                </Button>
              </div>
              
              {/* Example Recording Form */}
              {isRecording && (
                <div className="mb-4 space-y-2">
                  <Input
                    value={newExample.input}
                    onChange={(e) => setNewExample({ ...newExample, input: e.target.value })}
                    placeholder="Input"
                    className="bg-cyberpunk-dark border-cyberpunk-neon-pink text-xs"
                  />
                  
                  <Textarea
                    value={newExample.output}
                    onChange={(e) => setNewExample({ ...newExample, output: e.target.value })}
                    placeholder="Output"
                    className="bg-cyberpunk-dark border-cyberpunk-neon-pink text-xs h-16 min-h-[4rem]"
                  />
                  
                  <Input
                    value={newExample.tags}
                    onChange={(e) => setNewExample({ ...newExample, tags: e.target.value })}
                    placeholder="Tags (comma separated)"
                    className="bg-cyberpunk-dark border-cyberpunk-neon-pink text-xs"
                  />
                  
                  <div className="flex space-x-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsRecording(false)}
                      className="text-xs"
                    >
                      <X size={12} className="mr-1" />
                      Cancel
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={handleRecordExample}
                      className="bg-cyberpunk-neon-pink text-cyberpunk-dark hover:bg-pink-600 text-xs"
                    >
                      <Save size={12} className="mr-1" />
                      Record
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Examples Filter */}
              <div className="flex space-x-2 mb-2">
                <Input
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  placeholder="Filter by tag"
                  className="bg-cyberpunk-dark border-cyberpunk-neon-blue text-xs flex-1"
                />
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFilterChange}
                  className="text-xs"
                >
                  Filter
                </Button>
              </div>
              
              {/* Examples List */}
              <div className="space-y-2 max-h-40 overflow-auto">
                {examples.map(example => (
                  <div 
                    key={example.id} 
                    className="p-2 border border-cyberpunk-dark rounded text-xs"
                  >
                    <div className="font-medium truncate">{example.input}</div>
                    <div className="text-cyberpunk-neon-blue truncate">{example.output}</div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex gap-1">
                        {example.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] h-4 bg-cyberpunk-dark">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-5 w-5",
                            example.feedback === 'positive' && "text-green-500"
                          )}
                          onClick={() => handleProvideFeedback(example.id, 'positive')}
                        >
                          <ThumbsUp size={10} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-5 w-5",
                            example.feedback === 'negative' && "text-red-500"
                          )}
                          onClick={() => handleProvideFeedback(example.id, 'negative')}
                        >
                          <ThumbsDown size={10} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {examples.length === 0 && (
                  <div className="text-center py-3 text-xs text-cyberpunk-neon-blue">
                    No examples found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningSystem;
