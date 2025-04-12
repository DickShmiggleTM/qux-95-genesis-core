
import React, { useRef, useEffect, useState } from 'react';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  // Handle scrolling without pushing the GUI upward
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if user was already at the bottom before new content
    if (isScrolledToBottom) {
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        // Use scrollTop instead of scrollIntoView to prevent GUI lifting
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, [messages, isScrolledToBottom]);

  // Track scroll position to determine if user is at bottom
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const isAtBottom = Math.abs(
      (container.scrollHeight - container.scrollTop) - container.clientHeight
    ) < 10; // Allow small margin of error

    setIsScrolledToBottom(isAtBottom);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 pt-6 h-full max-h-full message-list-container"
      onScroll={handleScroll}
    >
      {messages.map((message, i) => (
        <div
          key={i}
          className={cn(
            "mb-4 px-3 py-2 rounded text-base md:text-lg",
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

      <div ref={messagesEndRef} className="h-0" />
    </div>
  );
};

export default MessageList;
