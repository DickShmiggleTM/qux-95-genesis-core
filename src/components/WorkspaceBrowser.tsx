
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Folder, 
  FolderOpen, 
  Save, 
  X, 
  Plus, 
  Trash2,
  RefreshCcw,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { workspaceService } from '@/services/workspaceService';
import { toast } from 'sonner';

interface WorkspaceBrowserProps {
  className?: string;
}

interface FileStats {
  name: string;
  size: number;
  modified: Date;
  type: 'file' | 'directory';
}

const WorkspaceBrowser: React.FC<WorkspaceBrowserProps> = ({ className }) => {
  const [currentPath, setCurrentPath] = useState('ai_workspace');
  const [contents, setContents] = useState<FileStats[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([currentPath]);
  const [newItemName, setNewItemName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Load directory contents when path changes
  useEffect(() => {
    refreshDirectory();
  }, [currentPath]);

  // Load file content when selected file changes
  useEffect(() => {
    if (selectedFile && selectedFile.startsWith('ai_workspace')) {
      const content = workspaceService.readFile(selectedFile);
      if (content !== null) {
        setFileContent(content);
      } else {
        setFileContent('');
        toast.error('Failed to read file', {
          description: `The file ${selectedFile} could not be read`
        });
      }
    } else {
      setFileContent('');
    }
    
    setIsEditing(false);
  }, [selectedFile]);

  const refreshDirectory = () => {
    const directoryContents = workspaceService.listDirectory(currentPath);
    setContents(directoryContents);
  };

  const handleFileClick = (file: FileStats) => {
    if (file.type === 'file') {
      setSelectedFile(`${currentPath}/${file.name}`);
    } else {
      const newPath = `${currentPath}/${file.name}`;
      toggleFolder(newPath);
    }
  };

  const toggleFolder = (path: string) => {
    if (expandedFolders.includes(path)) {
      setExpandedFolders(expandedFolders.filter(folder => folder !== path && !folder.startsWith(`${path}/`)));
    } else {
      setExpandedFolders([...expandedFolders, path]);
    }
  };

  const handleSaveFile = () => {
    if (selectedFile) {
      const success = workspaceService.writeFile(selectedFile, fileContent);
      
      if (success) {
        toast.success('File saved', {
          description: `Changes to ${selectedFile.split('/').pop()} saved successfully`
        });
        setIsEditing(false);
        refreshDirectory();
      } else {
        toast.error('Failed to save file', {
          description: 'The file could not be saved'
        });
      }
    }
  };

  const handleDeleteFile = () => {
    if (selectedFile) {
      const success = workspaceService.deleteFile(selectedFile);
      
      if (success) {
        toast.success('File deleted', {
          description: `${selectedFile.split('/').pop()} deleted successfully`
        });
        setSelectedFile(null);
        setFileContent('');
        refreshDirectory();
      } else {
        toast.error('Failed to delete file', {
          description: 'The file could not be deleted'
        });
      }
    }
  };

  const handleCreateFile = () => {
    if (!newItemName) {
      toast.error('Invalid name', {
        description: 'Please enter a valid file name'
      });
      return;
    }
    
    const filePath = `${currentPath}/${newItemName}`;
    const success = workspaceService.writeFile(filePath, '');
    
    if (success) {
      toast.success('File created', {
        description: `${newItemName} created successfully`
      });
      setNewItemName('');
      setIsCreatingFile(false);
      refreshDirectory();
      setSelectedFile(filePath);
    } else {
      toast.error('Failed to create file', {
        description: 'The file could not be created'
      });
    }
  };

  const handleCreateFolder = () => {
    if (!newItemName) {
      toast.error('Invalid name', {
        description: 'Please enter a valid folder name'
      });
      return;
    }
    
    const dirPath = `${currentPath}/${newItemName}`;
    const success = workspaceService.createDirectory(dirPath);
    
    if (success) {
      toast.success('Folder created', {
        description: `${newItemName} created successfully`
      });
      setNewItemName('');
      setIsCreatingFolder(false);
      refreshDirectory();
      setExpandedFolders([...expandedFolders, dirPath]);
    } else {
      toast.error('Failed to create folder', {
        description: 'The folder could not be created'
      });
    }
  };

  const renderFileTree = (path: string, level: number = 0) => {
    const directoryContents = workspaceService.listDirectory(path);
    const isExpanded = expandedFolders.includes(path);
    
    return (
      <div key={path} className={level > 0 ? "pl-4" : ""}>
        {level > 0 && (
          <div
            className="flex items-center space-x-1 py-1 px-2 hover:bg-cyberpunk-dark-blue cursor-pointer"
            onClick={() => toggleFolder(path)}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {isExpanded ? (
              <FolderOpen size={16} className="text-cyberpunk-neon-blue" />
            ) : (
              <Folder size={16} className="text-cyberpunk-neon-blue" />
            )}
            <span>{path.split('/').pop()}</span>
          </div>
        )}
        
        {isExpanded && (
          <div>
            {directoryContents.map((item) => {
              if (item.type === 'directory') {
                return renderFileTree(`${path}/${item.name}`, level + 1);
              } else {
                return (
                  <div
                    key={`${path}/${item.name}`}
                    className={cn(
                      "flex items-center space-x-1 py-1 px-2 hover:bg-cyberpunk-dark-blue cursor-pointer ml-4",
                      selectedFile === `${path}/${item.name}` && "bg-cyberpunk-dark-blue"
                    )}
                    onClick={() => handleFileClick(item)}
                  >
                    <FileText size={16} className="text-cyberpunk-neon-green" />
                    <span>{item.name}</span>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-blue rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-blue h-5 flex items-center justify-between px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">AI WORKSPACE</div>
        <div className="flex">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4"
            onClick={refreshDirectory}
          >
            <RefreshCcw size={10} className="text-cyberpunk-dark" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 h-full pt-5">
        <div className="col-span-1 border-r border-cyberpunk-neon-blue p-2 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-bold">Files</div>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setIsCreatingFile(true)}
              >
                <Plus size={12} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setIsCreatingFolder(true)}
              >
                <Folder size={12} />
              </Button>
            </div>
          </div>
          
          {isCreatingFile && (
            <div className="mb-2 flex items-center space-x-1">
              <Input
                size={1}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="file.txt"
                className="h-6 text-xs"
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={handleCreateFile}
              >
                <Save size={12} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setIsCreatingFile(false)}
              >
                <X size={12} />
              </Button>
            </div>
          )}
          
          {isCreatingFolder && (
            <div className="mb-2 flex items-center space-x-1">
              <Input
                size={1}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="folder"
                className="h-6 text-xs"
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={handleCreateFolder}
              >
                <Save size={12} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setIsCreatingFolder(false)}
              >
                <X size={12} />
              </Button>
            </div>
          )}
          
          <div className="text-xs">
            {renderFileTree('ai_workspace')}
          </div>
        </div>
        
        <div className="col-span-2 p-2 flex flex-col h-full">
          {selectedFile ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-bold overflow-hidden text-ellipsis">
                  {selectedFile.split('/').pop()}
                </div>
                <div className="flex space-x-1">
                  {isEditing ? (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={handleSaveFile}
                    >
                      <Save size={12} />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setIsEditing(true)}
                    >
                      <FileText size={12} />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={handleDeleteFile}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              <Separator className="my-2" />
              {isEditing ? (
                <Textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="flex-1 resize-none font-mono text-xs bg-cyberpunk-dark-blue"
                />
              ) : (
                <div className="flex-1 overflow-auto bg-cyberpunk-dark-blue p-2 font-mono text-xs whitespace-pre-wrap">
                  {fileContent}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-cyberpunk-neon-blue mt-8">
              <Folder size={32} className="mx-auto mb-2" />
              <p>Select a file to view or edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceBrowser;
