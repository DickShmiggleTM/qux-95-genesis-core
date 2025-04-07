import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CodeDisplayProps {
  className?: string;
  code?: string;
  activeLines?: number[];
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({
  className,
  code = defaultCode,
  activeLines = [],
}) => {
  const [lines, setLines] = useState<string[]>([]);
  
  useEffect(() => {
    setLines(code.split('\n'));
  }, [code]);

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-blue rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-blue h-5 flex items-center px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">SYSTEM CODE</div>
      </div>
      
      <div className="p-2 pt-6 overflow-y-auto h-full text-sm">
        <pre className="flex flex-col">
          {lines.map((line, index) => (
            <div 
              key={index}
              className={cn(
                "flex",
                activeLines.includes(index + 1) && "bg-cyberpunk-neon-blue bg-opacity-20"
              )}
            >
              <div 
                className={cn(
                  "w-8 text-right flex-shrink-0 pr-2 select-none",
                  "text-cyberpunk-neon-blue opacity-50"
                )}
              >
                {index + 1}
              </div>
              <div 
                className={cn(
                  "pl-2 whitespace-pre-wrap break-all",
                  activeLines.includes(index + 1) 
                    ? "text-cyberpunk-neon-green" 
                    : "text-cyberpunk-neon-blue"
                )}
              >
                {line || ' '}
              </div>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

// Default code to display
const defaultCode = `async function initQuxSystem() {
  console.log("QUX-95 Genesis Core initializing...");
  
  // Initialize core modules
  await loadModule("cognitive_engine");
  await loadModule("self_modification");
  await loadModule("reasoning_framework");
  
  // Connect to Ollama instance
  const modelConnection = await connectToModel({
    endpoint: "http://localhost:11434/api",
    model: "llama2"
  });
  
  if (!modelConnection.success) {
    throw new Error("Failed to connect to model");
  }
  
  // Set up self-modification capability
  const selfModSystem = new SelfModificationEngine({
    codebase: "./src",
    backupInterval: 300, // seconds
    safetyChecks: true
  });
  
  // Initialize reasoning framework
  const reasoningSystem = new ChainOfThoughtProcessor({
    steps: ["analyze", "research", "hypothesize", "evaluate", "conclude"],
    model: modelConnection.model,
    debugMode: false
  });
  
  // Start monitoring system
  monitorSystem({
    components: [modelConnection, selfModSystem, reasoningSystem],
    interval: 5000, // ms
    alerts: true
  });
  
  console.log("QUX-95 Genesis Core ready.");
  return true;
}

class SelfModificationEngine {
  constructor(config) {
    this.codebase = config.codebase;
    this.backupInterval = config.backupInterval;
    this.safetyChecks = config.safetyChecks;
    this.modificationHistory = [];
    this.lastBackup = Date.now();
  }
  
  async modify(targetFile, modifications) {
    // Create backup
    await this.createBackup();
    
    // Parse file
    const fileContent = await readFile(targetFile);
    const ast = parseCode(fileContent);
    
    // Apply modifications
    const modifiedAst = this.applyModifications(ast, modifications);
    
    // Safety check
    if (this.safetyChecks && !this.validateModifications(modifiedAst)) {
      throw new Error("Safety check failed");
    }
    
    // Generate new code
    const newCode = generateCode(modifiedAst);
    
    // Write changes
    await writeFile(targetFile, newCode);
    
    // Record modification
    this.modificationHistory.push({
      timestamp: Date.now(),
      file: targetFile,
      type: modifications.type
    });
    
    return true;
  }
  
  // Other methods...
}`;

export default CodeDisplay;
