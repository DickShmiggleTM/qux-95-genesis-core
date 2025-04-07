
import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Upload, File, Trash2, Search } from 'lucide-react';
import { toast } from "sonner";

interface DocumentRagProps {
  className?: string;
}

type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string | null;
  processed: boolean;
};

const DocumentRag: React.FC<DocumentRagProps> = ({ className }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    
    const newFiles: UploadedFile[] = [];
    
    Array.from(event.target.files).forEach(file => {
      // In a real app, we would process the file content here
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newFile: UploadedFile = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          content: null, // Will be filled after processing
          processed: false
        };
        
        newFiles.push(newFile);
        setFiles(prev => [...prev, newFile]);
        
        // Simulate processing delay
        setTimeout(() => {
          setFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, processed: true, content: "Sample processed content from " + file.name } 
              : f
          ));
          
          toast.success(`Processed ${file.name}`, {
            description: "File indexed for RAG retrieval"
          });
        }, 1500);
      };
      
      reader.readAsText(file);
    });
  };
  
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Simulate search in the uploaded documents
    setSearchResults([]);
    
    if (files.length === 0) {
      toast.error("No files to search", {
        description: "Please upload documents before searching"
      });
      return;
    }
    
    setIsIndexing(true);
    
    // Simulate search delay
    setTimeout(() => {
      const results = files
        .filter(file => file.processed)
        .map(file => `Result from ${file.name}: Content related to "${searchQuery}"`)
      
      setSearchResults(results);
      setIsIndexing(false);
      
      if (results.length === 0) {
        toast.info("No results found", {
          description: `No matches for "${searchQuery}" in the indexed documents`
        });
      } else {
        toast.success(`Found ${results.length} results`, {
          description: `Search completed for "${searchQuery}"`
        });
      }
    }, 1000);
  };
  
  const removeFile = (fileId: string) => {
    setFiles(files.filter(file => file.id !== fileId));
    toast.info("File removed", {
      description: "Document removed from RAG index"
    });
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-blue rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-blue h-5 flex items-center px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">DOCUMENT RAG SYSTEM</div>
      </div>
      
      <div className="p-4 pt-6 h-full flex flex-col">
        {/* File Upload Section */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-cyberpunk-neon-blue rounded p-8 text-center mb-4 cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-10 w-10 mx-auto mb-2 text-cyberpunk-neon-blue" />
            <p className="text-cyberpunk-neon-blue text-sm">
              Click to upload documents or drag and drop files here
            </p>
            <p className="text-xs text-cyberpunk-neon-blue opacity-70 mt-2">
              Supported formats: PDF, TXT, DOC, DOCX
            </p>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleFileUpload}
              multiple
              accept=".pdf,.txt,.doc,.docx"
            />
          </div>
          
          <div className="flex items-center mb-2">
            <FileText className="h-4 w-4 mr-2 text-cyberpunk-neon-blue" />
            <span className="text-cyberpunk-neon-blue text-sm font-bold">Uploaded Documents ({files.length})</span>
          </div>
          
          {/* File List */}
          <div className="h-32 overflow-y-auto mb-4 border border-cyberpunk-neon-blue bg-cyberpunk-dark-blue p-2">
            {files.length === 0 ? (
              <div className="h-full flex items-center justify-center text-cyberpunk-neon-blue opacity-60 text-sm">
                No documents uploaded yet
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="flex items-center justify-between py-1 px-2 border-b border-cyberpunk-neon-blue border-opacity-30">
                  <div className="flex items-center">
                    <File className="h-4 w-4 mr-2 text-cyberpunk-neon-blue" />
                    <span className="text-cyberpunk-neon-blue text-sm">{file.name}</span>
                  </div>
                  <div className="flex items-center">
                    {!file.processed && (
                      <span className="text-yellow-400 text-xs mr-2 animate-pulse">Processing...</span>
                    )}
                    <button 
                      onClick={() => removeFile(file.id)}
                      className="text-cyberpunk-neon-pink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Search Section */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Search className="h-4 w-4 mr-2 text-cyberpunk-neon-blue" />
            <span className="text-cyberpunk-neon-blue text-sm font-bold">RAG Query</span>
          </div>
          
          <div className="flex space-x-2 mb-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter your search query..."
              className="bg-cyberpunk-dark-blue border-cyberpunk-neon-blue text-cyberpunk-neon-green"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isIndexing || searchQuery.trim() === ''}
              className="bg-cyberpunk-neon-blue text-cyberpunk-dark hover:bg-blue-500"
            >
              {isIndexing ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>
        
        {/* Results Section */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center mb-2">
            <FileText className="h-4 w-4 mr-2 text-cyberpunk-neon-blue" />
            <span className="text-cyberpunk-neon-blue text-sm font-bold">Search Results</span>
          </div>
          
          <div className="h-full overflow-y-auto border border-cyberpunk-neon-blue bg-cyberpunk-dark-blue p-2">
            {searchResults.length === 0 ? (
              <div className="h-full flex items-center justify-center text-cyberpunk-neon-blue opacity-60 text-sm">
                {isIndexing ? 'Searching documents...' : 'No search results to display'}
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <div key={index} className="p-2 border border-cyberpunk-neon-blue bg-cyberpunk-dark">
                    <p className="text-cyberpunk-neon-green text-sm">{result}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentRag;
