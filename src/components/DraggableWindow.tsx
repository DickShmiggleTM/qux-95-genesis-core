import React, { useState, useRef, useEffect } from 'react';
import { Minus, Maximize, X, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface DraggableWindowProps {
  title: string;
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
  defaultPosition?: { x: number, y: number };
  defaultWidth?: number;
  defaultHeight?: number | string;
  resizable?: boolean;
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({
  title,
  className,
  children,
  onClose,
  defaultPosition = { x: 100, y: 100 },
  defaultWidth = 400,
  defaultHeight = 'auto',
  resizable = false
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = typeof defaultHeight === 'number' ? useState(defaultHeight) : useState<string | number>(defaultHeight);
  
  const windowRef = useRef<HTMLDivElement>(null);
  
  // Start dragging when header is clicked
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (windowRef.current) {
      // Calculate the offset from the mouse position to the window position
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };
  
  // Update position while dragging
  useEffect(() => {
    const handleDrag = (e: MouseEvent) => {
      if (isDragging) {
        // Update position based on mouse position minus the offset
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };
    
    const handleDragEnd = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, dragOffset]);
  
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  
  return (
    <div
      ref={windowRef}
      className={cn(
        "fixed bg-cyberpunk-dark border border-cyberpunk-neon-purple rounded-sm shadow-lg z-10",
        "transition-all duration-300 ease-in-out",
        isMinimized && "h-10 overflow-hidden",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: typeof width === 'number' ? `${width}px` : width,
        height: isMinimized ? 'auto' : (typeof height === 'number' ? `${height}px` : height),
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      {/* Window header */}
      <div 
        className="h-10 bg-cyberpunk-neon-purple flex items-center justify-between px-2 cursor-grab"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center space-x-1">
          <Move className="h-4 w-4 text-cyberpunk-dark" />
          <span className="text-cyberpunk-dark text-xs font-bold">{title}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-purple-700"
            onClick={toggleMinimize}
          >
            <Minus className="h-3 w-3 text-cyberpunk-dark" />
          </Button>
          
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-purple-700"
              onClick={onClose}
            >
              <X className="h-3 w-3 text-cyberpunk-dark" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Window content */}
      <div className={cn(
        "p-4",
        isMinimized && "hidden"
      )}>
        {children}
      </div>
      
      {/* Resize handles */}
      {resizable && !isMinimized && (
        <>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" 
               onMouseDown={(e) => {
                 e.stopPropagation();
                 // Implement resizing here if needed
               }} 
          />
        </>
      )}
    </div>
  );
};

export default DraggableWindow; 