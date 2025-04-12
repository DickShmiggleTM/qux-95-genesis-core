import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  History, 
  Search, 
  Pin, 
  PinOff, 
  Download, 
  Trash2, 
  Plus, 
  X, 
  Tag,
  Calendar,
  Clock,
  Bot,
  User,
  FileText
} from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { chatHistoryService, ChatSession } from '@/services/chatHistoryService';

interface ChatHistoryPanelProps {
  className?: string;
  onSelectChat: (sessionId: string) => void;
  onNewChat: () => void;
  currentSessionId: string | null;
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  className,
  onSelectChat,
  onNewChat,
  currentSessionId
}) => {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  
  // Load chat sessions
  useEffect(() => {
    const loadSessions = () => {
      const allSessions = chatHistoryService.getAllSessions();
      setSessions(allSessions);
      filterSessions(allSessions, searchQuery);
    };
    
    loadSessions();
    
    // Refresh when the panel is opened
    if (open) {
      loadSessions();
    }
  }, [open, searchQuery]);
  
  // Filter sessions based on search query
  const filterSessions = (sessionsList: ChatSession[], query: string) => {
    if (!query.trim()) {
      setFilteredSessions(sessionsList);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = sessionsList.filter(session => {
      // Search in title
      if (session.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in messages
      return session.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
    
    setFilteredSessions(filtered);
  };
  
  // Handle session selection
  const handleSelectSession = (sessionId: string) => {
    onSelectChat(sessionId);
    setOpen(false);
  };
  
  // Handle new chat
  const handleNewChat = () => {
    onNewChat();
    setOpen(false);
  };
  
  // Handle delete session
  const handleDeleteSession = (sessionId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    chatHistoryService.deleteSession(sessionId);
    setSessions(chatHistoryService.getAllSessions());
  };
  
  // Handle toggle pin
  const handleTogglePin = (sessionId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    chatHistoryService.togglePinned(sessionId);
    setSessions(chatHistoryService.getAllSessions());
  };
  
  // Handle download session
  const handleDownloadSession = (sessionId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    chatHistoryService.downloadSessionAsText(sessionId);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  // Get message count for a session
  const getMessageCount = (session: ChatSession) => {
    const userMessages = session.messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = session.messages.filter(msg => msg.role === 'assistant').length;
    
    return { userMessages, assistantMessages };
  };
  
  // Clear all chat history
  const handleClearAllHistory = () => {
    chatHistoryService.clearAllSessions();
    setSessions([]);
    onNewChat(); // Create a new empty chat
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue"
        >
          <History className="h-4 w-4 mr-1" />
          HISTORY
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className={cn(
          "bg-cyberpunk-dark border-cyberpunk-neon-green",
          "flex flex-col w-[350px] sm:w-[450px]",
          className
        )}
      >
        <SheetHeader className="border-b border-cyberpunk-neon-green pb-2">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-cyberpunk-neon-green font-terminal">
              CHAT HISTORY
            </SheetTitle>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue"
                onClick={handleNewChat}
              >
                <Plus className="h-3 w-3 mr-1" />
                New Chat
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-red-500 text-red-500 hover:bg-red-950"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-cyberpunk-dark border-cyberpunk-neon-green">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-cyberpunk-neon-green">Clear Chat History</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your chat history. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-cyberpunk-neon-green text-cyberpunk-neon-green">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleClearAllHistory}
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search chat history..."
              className="pl-8 bg-cyberpunk-dark-blue border-cyberpunk-neon-green text-cyberpunk-neon-green"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7 text-gray-400 hover:text-white"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1 pr-4">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
              <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
              {searchQuery ? (
                <p className="text-center">No chats match your search</p>
              ) : (
                <>
                  <p className="text-center">No chat history found</p>
                  <p className="text-xs mt-2">Start a new conversation to see it here</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-4">
              {filteredSessions.map(session => {
                const { userMessages, assistantMessages } = getMessageCount(session);
                const isActive = session.id === currentSessionId;
                
                return (
                  <div 
                    key={session.id}
                    className={cn(
                      "bg-cyberpunk-dark-blue border rounded-md p-3 relative cursor-pointer transition-all",
                      isActive 
                        ? "border-cyberpunk-neon-green shadow-[0_0_8px_rgba(0,255,65,0.3)]" 
                        : "border-gray-700 hover:border-cyberpunk-neon-green",
                      session.pinned && "border-l-4 border-l-cyberpunk-neon-purple"
                    )}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-20">
                        <h4 className="font-bold text-cyberpunk-neon-green truncate">
                          {session.title}
                        </h4>
                        
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span className="mr-2">{formatDate(session.updatedAt)}</span>
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatTime(session.updatedAt)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center text-xs">
                            <User className="h-3 w-3 mr-1 text-cyberpunk-neon-blue" />
                            <span className="text-cyberpunk-neon-blue">{userMessages}</span>
                          </div>
                          <div className="flex items-center text-xs">
                            <Bot className="h-3 w-3 mr-1 text-cyberpunk-neon-green" />
                            <span className="text-cyberpunk-neon-green">{assistantMessages}</span>
                          </div>
                          {session.modelName && (
                            <Badge 
                              variant="outline" 
                              className="text-[0.65rem] h-4 border-cyberpunk-neon-purple text-cyberpunk-neon-purple"
                            >
                              {session.modelName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-cyberpunk-neon-purple hover:bg-transparent"
                          onClick={(e) => handleTogglePin(session.id, e)}
                          title={session.pinned ? "Unpin chat" : "Pin chat"}
                        >
                          {session.pinned ? (
                            <PinOff className="h-3 w-3" />
                          ) : (
                            <Pin className="h-3 w-3" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-cyberpunk-neon-green hover:bg-transparent"
                          onClick={(e) => handleDownloadSession(session.id, e)}
                          title="Download chat"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-transparent"
                              onClick={(e) => e.stopPropagation()}
                              title="Delete chat"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-cyberpunk-dark border-cyberpunk-neon-green">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-cyberpunk-neon-green">Delete Chat</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this chat? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel 
                                className="border-cyberpunk-neon-green text-cyberpunk-neon-green"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session.id);
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    
                    {session.tags && session.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Tag className="h-3 w-3 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {session.tags.map(tag => (
                            <Badge 
                              key={tag} 
                              variant="outline"
                              className="text-[0.65rem] h-4 border-gray-500 text-gray-400"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {session.messages.length > 0 && (
                      <div className="mt-2 text-xs text-gray-400 line-clamp-2">
                        <FileText className="h-3 w-3 inline mr-1" />
                        {session.messages[session.messages.length - 1].content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="border-t border-cyberpunk-neon-green pt-2 mt-2">
          <div className="text-xs text-gray-400">
            {sessions.length} chat{sessions.length !== 1 ? 's' : ''} in history
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChatHistoryPanel;
