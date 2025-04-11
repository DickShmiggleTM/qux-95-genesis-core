
// Re-export the UI components we actually use
export { Button } from "./button";
export { Card } from "./card";
export { Input } from "./input";
export { Label } from "./label";
export { Popover, PopoverContent, PopoverTrigger } from "./popover";
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./select";
export { Slider } from "./slider";
export { Switch } from "./switch";
export { Textarea } from "./textarea";
export { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
export { Separator } from "./separator";
export { Badge } from "./badge";
export { Progress } from "./progress";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
export { Alert, AlertDescription, AlertTitle } from "./alert";
export { Avatar, AvatarImage, AvatarFallback } from "./avatar";
export { Skeleton } from "./skeleton";

// Add memoized versions of frequently re-rendered components
import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

// Message components
export const MessageBubble = React.memo(({ children, className, role }: { 
  children: React.ReactNode; 
  className?: string;
  role: 'user' | 'assistant' | 'system';
}) => {
  const baseStyle = "px-4 py-2 rounded-lg mb-2 max-w-[80%]";
  
  const roleStyles = {
    user: "bg-blue-600 text-white self-end",
    assistant: "bg-gray-700 text-green-400 self-start",
    system: "bg-gray-800 text-yellow-400 self-start italic"
  };
  
  return (
    <div className={`${baseStyle} ${roleStyles[role]} ${className || ''}`} role="listitem">
      {children}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

// Status indicator
export const StatusIndicator = React.memo(({ status, text }: {
  status: 'success' | 'error' | 'warning' | 'info';
  text: string;
}) => {
  const icons = {
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    info: <Info className="h-4 w-4 text-blue-500" />
  };
  
  return (
    <div className="flex items-center gap-2 text-sm" role="status">
      {icons[status]}
      <span>{text}</span>
    </div>
  );
});
StatusIndicator.displayName = 'StatusIndicator';

// Optimized list item for long lists
export const VirtualItem = React.memo(({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div 
    className={`py-2 px-3 border-b border-gray-700 ${className || ''}`}
    role="listitem"
  >
    {children}
  </div>
));
VirtualItem.displayName = 'VirtualItem';
