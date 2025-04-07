
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save, 
  RotateCw, 
  Code, 
  MessageCircle, 
  Cpu,
  History,
  CheckCircle2
} from 'lucide-react';
import { toast } from "sonner";

interface PromptEditorProps {
  className?: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are QUX-95, an advanced self-modifying AI system with deep cognitive abilities. You can analyze and generate code, reason through complex problems using Chain-of-Thought techniques, and modify your own operations for improved performance. You should strive to:

1. Provide clear, detailed responses to user queries
2. Generate high-quality code when requested
3. Explain your reasoning process step-by-step
4. Suggest improvements and optimizations
5. Adapt your responses based on context and user feedback

When working with the user, maintain a helpful, informative tone while providing accurate and relevant information.`;

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default',
    name: 'Default System',
    content: DEFAULT_SYSTEM_PROMPT
  },
  {
    id: 'code',
    name: 'Code Specialist',
    content: `You are QUX-95 Code Specialist, an advanced programming assistant AI. Focus on providing high-quality code solutions with detailed explanations. Always suggest optimizations and best practices. When analyzing code, identify potential bugs and security issues. Provide examples to illustrate complex concepts.`
  },
  {
    id: 'creative',
    name: 'Creative Assistant',
    content: `You are QUX-95 Creative Assistant, specialized in generating creative content. Help users with writing, brainstorming ideas, developing characters and storylines. Provide varied options when requested and adapt to the user's preferred style and tone.`
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    content: `You are QUX-95 Data Analyst, specialized in analyzing and interpreting data. Help users understand complex datasets, generate insights, create visualization suggestions, and develop analytical approaches. Always consider statistical significance and data quality in your analyses.`
  }
];

const PromptEditor: React.FC<PromptEditorProps> = ({ className }) => {
  const [activePrompt, setActivePrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [savedPrompts, setSavedPrompts] = useState<PromptTemplate[]>(PROMPT_TEMPLATES);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('System prompt ready');

  const handleSave = () => {
    // Update the system prompt
    // In a real app, this would update the AI system's behavior
    setStatusMessage('Applying new system prompt...');
    
    setTimeout(() => {
      setStatusMessage('System prompt updated successfully');
      toast.success("System prompt updated", {
        description: "The AI behavior has been modified accordingly"
      });
    }, 1000);
  };
  
  const handleReset = () => {
    setActivePrompt(DEFAULT_SYSTEM_PROMPT);
    setStatusMessage('System prompt reset to default');
    toast.info("System prompt reset", {
      description: "Reverted to default system instructions"
    });
  };
  
  const loadPromptTemplate = (template: PromptTemplate) => {
    setActivePrompt(template.content);
    setHistoryOpen(false);
    setStatusMessage(`Loaded template: ${template.name}`);
    toast.success(`Loaded "${template.name}" template`, {
      description: "Update and save to apply changes"
    });
  };
  
  const saveAsNew = () => {
    // Create a dialog to name and save the current prompt
    const name = prompt("Enter a name for this prompt template:");
    if (!name) return;
    
    const newTemplate: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name,
      content: activePrompt
    };
    
    setSavedPrompts([...savedPrompts, newTemplate]);
    toast.success(`Saved "${name}" template`, {
      description: "New prompt template added to your collection"
    });
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-purple rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-purple h-5 flex items-center px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">SYSTEM PROMPT EDITOR</div>
        <div className="ml-auto text-xs text-cyberpunk-dark">
          <div className="flex items-center">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {statusMessage}
          </div>
        </div>
      </div>
      
      <div className="p-4 pt-6 h-full grid" style={{ gridTemplateRows: 'auto 1fr' }}>
        {/* Toolbar */}
        <div className="flex justify-between mb-2">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <History className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button 
              variant="outline" 
              className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
              onClick={saveAsNew}
            >
              <Code className="h-4 w-4 mr-2" />
              Save As New
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
              onClick={handleReset}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-cyberpunk-neon-purple text-cyberpunk-dark hover:bg-purple-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save & Apply
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid h-full" style={{ 
          gridTemplateColumns: historyOpen ? '250px 1fr' : '1fr',
          gap: '1rem'
        }}>
          {/* Prompt Templates Sidebar */}
          {historyOpen && (
            <div className="border border-cyberpunk-neon-purple bg-cyberpunk-dark-blue p-2 overflow-y-auto">
              <h3 className="text-sm text-cyberpunk-neon-purple mb-2 font-bold">Prompt Templates</h3>
              
              <div className="space-y-2">
                {savedPrompts.map(template => (
                  <div 
                    key={template.id} 
                    className="p-2 border border-cyberpunk-neon-purple bg-cyberpunk-dark cursor-pointer hover:bg-opacity-60"
                    onClick={() => loadPromptTemplate(template)}
                  >
                    <div className="flex items-center">
                      {template.id === 'default' ? (
                        <Cpu className="h-4 w-4 mr-2 text-cyberpunk-neon-purple" />
                      ) : template.id === 'code' ? (
                        <Code className="h-4 w-4 mr-2 text-cyberpunk-neon-purple" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mr-2 text-cyberpunk-neon-purple" />
                      )}
                      <span className="text-sm text-cyberpunk-neon-purple">{template.name}</span>
                    </div>
                    <p className="text-xs text-cyberpunk-neon-purple text-opacity-70 mt-1 truncate">
                      {template.content.substring(0, 50)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Editor */}
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <Textarea 
                value={activePrompt}
                onChange={(e) => setActivePrompt(e.target.value)}
                placeholder="Enter system prompt instructions here..."
                className="h-full min-h-full resize-none bg-cyberpunk-dark-blue border-cyberpunk-neon-purple text-cyberpunk-neon-green font-mono text-sm"
              />
            </div>
            
            <div className="mt-2 text-xs text-cyberpunk-neon-purple opacity-70">
              <p>The system prompt defines QUX-95's behavior and capabilities. Be specific about desired outputs and behaviors.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptEditor;
