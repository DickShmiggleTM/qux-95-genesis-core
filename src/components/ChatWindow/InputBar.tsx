
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Zap, FileUp } from 'lucide-react';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  onGenerateResponse: () => void;
  onFileUpload: (file: File) => void;
  isTyping: boolean;
  lastMessageIsAssistant: boolean;
}

const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  onGenerateResponse,
  onFileUpload,
  isTyping,
  lastMessageIsAssistant
}) => {
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    onFileUpload(file);
    
    // Reset the input
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-3 border-t border-cyberpunk-neon-green">
      <div className="flex gap-2">
        <Textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter message or command..."
          className="resize-none bg-cyberpunk-dark-blue border-cyberpunk-neon-blue text-cyberpunk-neon-blue"
          disabled={isTyping}
        />
        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            onClick={handleSendMessage}
            className="bg-cyberpunk-neon-blue hover:bg-blue-500 text-cyberpunk-dark"
            disabled={isTyping || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
          
          <label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isTyping}
            />
            <Button
              size="icon"
              variant="outline"
              className="border-cyberpunk-neon-blue text-cyberpunk-neon-blue cursor-pointer"
              type="button"
              disabled={isTyping}
              asChild
            >
              <div>
                <FileUp className="h-4 w-4" />
              </div>
            </Button>
          </label>
          
          <Button
            size="icon"
            variant="outline"
            className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
            onClick={onGenerateResponse}
            disabled={isTyping || lastMessageIsAssistant}
          >
            <Zap className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InputBar;
