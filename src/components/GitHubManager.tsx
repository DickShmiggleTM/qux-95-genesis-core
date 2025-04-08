
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Github, 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  Save, 
  Lock, 
  FileText,
  Plus,
  RefreshCcw,
  LogOut
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { githubService, GitHubRepository, GitHubCommit } from '@/services/githubService';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface GitHubManagerProps {
  className?: string;
}

const GitHubManager: React.FC<GitHubManagerProps> = ({ className }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(githubService.isAuthenticated());
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [commitFiles, setCommitFiles] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load repositories on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshRepositories();
    }
  }, [isAuthenticated]);

  // Refresh repositories list
  const refreshRepositories = () => {
    const repos = githubService.getRepositories();
    setRepositories(repos);
  };

  // Handle authentication
  const handleAuthenticate = async () => {
    if (!username || !token) {
      toast.error('Missing credentials', {
        description: 'Please enter both username and token'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const authenticated = await githubService.authenticate({ username, token });
      
      if (authenticated) {
        setIsAuthenticated(true);
        toast.success('Authentication successful', {
          description: `Connected to GitHub as ${username}`
        });
        
        refreshRepositories();
      } else {
        toast.error('Authentication failed', {
          description: 'Please check your credentials and try again'
        });
      }
    } catch (error) {
      toast.error('Authentication error', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    githubService.logout();
    setIsAuthenticated(false);
    setSelectedRepo(null);
    setCommits([]);
    toast.success('Logged out successfully', {
      description: 'GitHub connection terminated'
    });
  };

  // Handle repository selection
  const handleSelectRepo = async (repo: GitHubRepository) => {
    setSelectedRepo(repo);
    
    if (repo.cloned) {
      loadCommits();
    }
  };

  // Clone repository
  const handleCloneRepo = async () => {
    if (!selectedRepo) return;
    
    setIsLoading(true);
    
    try {
      const cloned = await githubService.cloneRepository(selectedRepo.name);
      
      if (cloned) {
        toast.success('Repository cloned', {
          description: `${selectedRepo.name} cloned successfully`
        });
        
        // Refresh repositories to get updated clone status
        refreshRepositories();
        
        // Update the selected repo with the cloned one
        const updatedRepo = githubService.getRepositories().find(r => r.name === selectedRepo.name);
        if (updatedRepo) {
          setSelectedRepo(updatedRepo);
          loadCommits();
        }
      } else {
        toast.error('Clone failed', {
          description: 'Failed to clone repository'
        });
      }
    } catch (error) {
      toast.error('Clone error', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load commits for selected repository
  const loadCommits = async () => {
    if (!selectedRepo || !selectedRepo.cloned) return;
    
    setIsLoading(true);
    
    try {
      const repoCommits = await githubService.getCommits();
      setCommits(repoCommits);
    } catch (error) {
      toast.error('Failed to load commits', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new commit
  const handleCreateCommit = async () => {
    if (!selectedRepo || !selectedRepo.cloned || !commitMessage || !commitFiles) {
      toast.error('Invalid input', {
        description: 'Please enter a commit message and files'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const filesList = commitFiles.split(',').map(f => f.trim());
      const commit = await githubService.createCommit(commitMessage, filesList);
      
      if (commit) {
        toast.success('Commit created', {
          description: `${commit.hash.substring(0, 7)}: ${commitMessage}`
        });
        
        setCommitMessage('');
        setCommitFiles('');
        loadCommits();
      } else {
        toast.error('Commit failed', {
          description: 'Failed to create commit'
        });
      }
    } catch (error) {
      toast.error('Commit error', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Push commits
  const handlePushCommits = async () => {
    if (!selectedRepo || !selectedRepo.cloned) return;
    
    setIsLoading(true);
    
    try {
      const pushed = await githubService.pushCommits();
      
      if (pushed) {
        toast.success('Commits pushed', {
          description: `Pushed to ${selectedRepo.name}`
        });
      } else {
        toast.error('Push failed', {
          description: 'Failed to push commits'
        });
      }
    } catch (error) {
      toast.error('Push error', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Pull changes
  const handlePullChanges = async () => {
    if (!selectedRepo || !selectedRepo.cloned) return;
    
    setIsLoading(true);
    
    try {
      const pulled = await githubService.pullChanges();
      
      if (pulled) {
        toast.success('Changes pulled', {
          description: `Updated from ${selectedRepo.name}`
        });
        loadCommits();
      } else {
        toast.error('Pull failed', {
          description: 'Failed to pull changes'
        });
      }
    } catch (error) {
      toast.error('Pull error', {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(
      "relative font-terminal bg-cyberpunk-dark border border-cyberpunk-neon-purple rounded-none",
      "pixel-corners pixel-borders overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-purple h-5 flex items-center justify-between px-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">GITHUB INTEGRATION</div>
        {isAuthenticated && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4"
            onClick={handleLogout}
          >
            <LogOut size={10} className="text-cyberpunk-dark" />
          </Button>
        )}
      </div>
      
      <div className="p-4 pt-6 h-full overflow-auto">
        {!isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <Github className="mr-2" />
              <h2 className="text-lg font-bold">GitHub Authentication</h2>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter GitHub username"
                className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token">Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter GitHub token"
                className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple"
              />
              <p className="text-xs text-cyberpunk-neon-blue">
                Token needs repo and user scope permissions
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleAuthenticate}
                disabled={isLoading}
                className="bg-cyberpunk-neon-purple hover:bg-purple-700 text-cyberpunk-dark"
              >
                <Lock className="mr-2 h-4 w-4" />
                Connect to GitHub
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {/* Repositories Column */}
            <div className="border-r border-cyberpunk-neon-purple pr-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold">Repositories</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={refreshRepositories}
                >
                  <RefreshCcw size={12} />
                </Button>
              </div>
              
              <div className="space-y-1 max-h-[300px] overflow-auto">
                {repositories.map((repo) => (
                  <div
                    key={repo.name}
                    className={cn(
                      "p-2 cursor-pointer rounded hover:bg-cyberpunk-dark-blue",
                      selectedRepo?.name === repo.name && "bg-cyberpunk-dark-blue"
                    )}
                    onClick={() => handleSelectRepo(repo)}
                  >
                    <div className="flex items-center">
                      <Github size={14} className="mr-2" />
                      <span className="font-semibold">{repo.name}</span>
                    </div>
                    <div className="text-xs text-cyberpunk-neon-blue mt-1">
                      {repo.cloned ? "Cloned" : "Not cloned"}
                    </div>
                  </div>
                ))}
                
                {repositories.length === 0 && (
                  <div className="text-center py-4 text-cyberpunk-neon-blue">
                    No repositories found
                  </div>
                )}
              </div>
            </div>
            
            {/* Repository Details Column */}
            <div className={cn(
              "col-span-2",
              !selectedRepo && "flex items-center justify-center"
            )}>
              {selectedRepo ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold">{selectedRepo.name}</h3>
                    <div className="text-xs text-cyberpunk-neon-blue">{selectedRepo.description}</div>
                    <div className="flex items-center mt-2">
                      <GitBranch size={14} className="mr-1" />
                      <span className="text-xs">{selectedRepo.defaultBranch}</span>
                      <span className="mx-2 text-xs">•</span>
                      <span className={cn(
                        "text-xs",
                        selectedRepo.isPrivate ? "text-cyberpunk-neon-pink" : "text-cyberpunk-neon-green"
                      )}>
                        {selectedRepo.isPrivate ? "Private" : "Public"}
                      </span>
                    </div>
                  </div>
                  
                  {!selectedRepo.cloned ? (
                    <div>
                      <Button
                        onClick={handleCloneRepo}
                        disabled={isLoading}
                        className="bg-cyberpunk-neon-green hover:bg-green-700 text-cyberpunk-dark"
                      >
                        <GitBranch className="mr-2 h-4 w-4" />
                        Clone Repository
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handlePullChanges}
                          disabled={isLoading}
                          className="bg-cyberpunk-neon-blue hover:bg-blue-700 text-cyberpunk-dark"
                          size="sm"
                        >
                          <GitPullRequest className="mr-1 h-3 w-3" />
                          Pull
                        </Button>
                        <Button
                          onClick={handlePushCommits}
                          disabled={isLoading}
                          className="bg-cyberpunk-neon-green hover:bg-green-700 text-cyberpunk-dark"
                          size="sm"
                        >
                          <Save className="mr-1 h-3 w-3" />
                          Push
                        </Button>
                      </div>
                      
                      <Separator />
                      
                      {/* New Commit Section */}
                      <div className="space-y-2">
                        <Label htmlFor="commitMessage">Commit Message</Label>
                        <Input
                          id="commitMessage"
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          placeholder="Update documentation"
                          className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple"
                        />
                        
                        <Label htmlFor="commitFiles">Files (comma separated)</Label>
                        <Input
                          id="commitFiles"
                          value={commitFiles}
                          onChange={(e) => setCommitFiles(e.target.value)}
                          placeholder="README.md,src/main.ts"
                          className="bg-cyberpunk-dark-blue border-cyberpunk-neon-purple"
                        />
                        
                        <div className="flex justify-end">
                          <Button
                            onClick={handleCreateCommit}
                            disabled={isLoading}
                            className="bg-cyberpunk-neon-pink hover:bg-pink-700 text-cyberpunk-dark"
                          >
                            <GitCommit className="mr-2 h-4 w-4" />
                            Create Commit
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Commits Section */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold">Commits</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={loadCommits}
                          >
                            <RefreshCcw size={12} />
                          </Button>
                        </div>
                        
                        <div className="space-y-2 max-h-[200px] overflow-auto">
                          {commits.map((commit, index) => (
                            <div
                              key={index}
                              className="p-2 border border-cyberpunk-neon-blue rounded bg-cyberpunk-dark-blue"
                            >
                              <div className="flex justify-between">
                                <span className="text-xs font-mono">{commit.hash.substring(0, 7)}</span>
                                <span className="text-xs text-cyberpunk-neon-blue">
                                  {new Date(commit.date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="mt-1">{commit.message}</div>
                              <div className="text-xs text-cyberpunk-neon-green mt-1">
                                Author: {commit.author}
                              </div>
                            </div>
                          ))}
                          
                          {commits.length === 0 && (
                            <div className="text-center py-4 text-cyberpunk-neon-blue">
                              No commits found
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center text-cyberpunk-neon-purple">
                  <Github size={32} className="mx-auto mb-2" />
                  <p>Select a repository to continue</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubManager;
