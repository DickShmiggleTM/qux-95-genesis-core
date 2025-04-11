
import React, { useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';
import { Message } from './types';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  useStreaming: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isTyping, 
  useStreaming 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-4 pt-6">
      {messages.map((message, i) => (
        <div 
          key={i}
          className={cn(
            "mb-4 px-2 py-1 rounded text-sm",
            message.role === 'user' 
              ? "ml-8 text-cyberpunk-neon-blue blue-glow" 
              : message.role === 'system' 
                ? "border border-dashed border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
                : "mr-8"
          )}
        >
          <div className="flex items-center mb-1">
            <span className={cn(
              "font-bold",
              message.role === 'user' 
                ? "text-cyberpunk-neon-blue" 
                : message.role === 'system' 
                  ? "text-cyberpunk-neon-purple"
                  : "text-cyberpunk-neon-green"
            )}>
              {message.role === 'user' ? 'USER' : message.role === 'system' ? 'SYSTEM' : 'QUX-95'}
            </span>
            <span className="ml-2 text-xs opacity-50">{formatTimestamp(message.timestamp)}</span>
          </div>
          <div className="whitespace-pre-line terminal-text-output">{message.content}</div>
        </div>
      ))}
      
      {isTyping && !useStreaming && (
        <div className="flex items-center text-cyberpunk-neon-green mr-8 mb-4 px-2 py-1">
          <span className="mr-2">QUX-95</span>
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
          <span className="typing-cursor animate-pulse">thinking</span>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
