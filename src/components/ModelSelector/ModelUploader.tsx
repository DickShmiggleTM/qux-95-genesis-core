
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
import { toast } from "sonner";
import { ollamaService } from '@/services/ollama/index';

interface ModelUploaderProps {
  onUploadComplete: () => void;
}

const ModelUploader: React.FC<ModelUploaderProps> = ({ onUploadComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    
    const file = event.target.files[0];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension !== 'gguf') {
      toast.error("Invalid file format", {
        description: "Only .gguf files are supported for model uploads"
      });
      return;
    }
    
    // Start upload process via Ollama service
    try {
      await ollamaService.uploadModel(file);
      onUploadComplete();
    } catch (error) {
      console.error("Error uploading model:", error);
      
      toast.error("Failed to upload model", {
        description: "There was an error processing your model file"
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        onChange={handleFileUpload}
        accept=".gguf"
      />
      
      <Button 
        variant="outline"
        className="w-full mt-2 border border-dashed border-cyberpunk-neon-purple text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue flex items-center justify-center"
        onClick={openFileDialog}
      >
        <Upload className="h-4 w-4 mr-2" />
        UPLOAD GGUF MODEL
      </Button>
      <div className="text-xs text-cyberpunk-neon-purple opacity-70 mt-1 text-center">
        Supports local quantized models in GGUF format
      </div>
    </div>
  );
};

export default ModelUploader;
