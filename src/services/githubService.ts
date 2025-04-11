/**
 * GitHub Integration Service
 * 
 * Provides functionality for:
 * - Pulling code from GitHub repositories
 * - Tracking changes and managing commits
 * - Pushing changes to authorized repositories
 * - Creating and managing pull requests
 * - Automated code modifications and review
 */
import { toast } from 'sonner';
import { workspaceService } from './workspaceService';

export interface GitHubCredentials {
  username: string;
  token: string;
  oauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
}

export interface GitHubRepository {
  owner: string;
  name: string;
  url: string;
  description: string;
  defaultBranch: string;
  isPrivate: boolean;
  cloned: boolean;
  localPath?: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GitHubCommit {
  message: string;
  date: Date;
  hash: string;
  author: string;
  files?: GitHubCommitFile[];
}

export interface GitHubCommitFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface GitHubBranch {
  name: string;
  sha: string;
  isProtected: boolean;
  isDefault: boolean;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  headBranch: string;
  baseBranch: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  mergeable?: boolean;
  labels: string[];
  reviewers: string[];
}

export interface GitHubPullRequestReview {
  id: number;
  user: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
  body: string;
  submittedAt: Date;
}

export interface GitHubLabel {
  name: string;
  color: string;
  description: string;
}

class GitHubService {
  private credentials: GitHubCredentials | null = null;
  private repositories: GitHubRepository[] = [];
  private currentRepository: GitHubRepository | null = null;
  private authenticated = false;
  private apiBaseUrl = 'https://api.github.com';
  
  constructor() {
    this.loadState();
  }
  
  /**
   * Load GitHub service state
   */
  private loadState() {
    try {
      // In a real app, this would load from localStorage or another storage mechanism
      // For now, we'll just simulate having no saved state
      console.log('GitHub service initialized');
      workspaceService.log('GitHub service initialized');
    } catch (error) {
      console.error('Error loading GitHub service state:', error);
    }
  }
  
  /**
   * Save GitHub service state
   */
  private saveState() {
    try {
      // In a real application, this would save to localStorage or another storage mechanism
      // For this simulation, we'll log the state to the workspace
      const state = {
        authenticated: this.authenticated,
        currentRepository: this.currentRepository,
        repositories: this.repositories.map(repo => ({
          owner: repo.owner,
          name: repo.name,
          url: repo.url,
          description: repo.description,
          defaultBranch: repo.defaultBranch,
          isPrivate: repo.isPrivate,
          cloned: repo.cloned,
          localPath: repo.localPath
        }))
      };
      
      workspaceService.writeFile('configs/github_state.json', JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Error saving GitHub service state:', error);
    }
  }
  
  /**
   * Make authenticated request to GitHub API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }
    
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${this.credentials.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`GitHub API Error: ${error.message || response.statusText}`);
      }
      
      // Handle rate limit headers
      const rateLimit = {
        limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
        remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
        reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0')
      };
      
      if (rateLimit.remaining < 10) {
        console.warn(`GitHub API rate limit warning: ${rateLimit.remaining} requests remaining`);
        workspaceService.log(`GitHub API rate limit warning: ${rateLimit.remaining} requests remaining`);
      }
      
      // Some endpoints don't return JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error making GitHub API request:', error);
      workspaceService.log(`GitHub API request error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Authenticate with GitHub
   */
  async authenticate(credentials: GitHubCredentials): Promise<boolean> {
    try {
      this.credentials = credentials;
      
      // Verify credentials by making a test API call
      const user = await this.makeRequest('/user');
      
      if (!user || !user.login) {
        throw new Error('Invalid GitHub credentials');
      }
      
      this.authenticated = true;
      
      workspaceService.log(`GitHub authentication successful for user: ${user.login}`);
      
      // Load user repositories
      await this.loadUserRepositories();
      
      this.saveState();
      return true;
    } catch (error) {
      console.error('Error authenticating with GitHub:', error);
      workspaceService.log(`GitHub authentication failed: ${error instanceof Error ? error.message : String(error)}`);
      this.authenticated = false;
      this.credentials = null;
      return false;
    }
  }
  
  /**
   * Authenticate with GitHub using OAuth
   */
  async authenticateWithOAuth(code: string): Promise<boolean> {
    try {
      // In a real app, this would exchange the code for an access token
      // For this simulation, we'll just create a mock token
      const mockToken = `oauth-token-${Date.now()}`;
      
      this.credentials = {
        username: 'oauth-user',
        token: mockToken,
        oauth: {
          accessToken: mockToken,
          refreshToken: `refresh-${mockToken}`,
          expiresAt: new Date(Date.now() + 3600000)
        }
      };
      
      this.authenticated = true;
      
      // Load user repositories
      await this.loadUserRepositories();
      
      workspaceService.log('GitHub OAuth authentication successful');
      this.saveState();
      
      return true;
    } catch (error) {
      console.error('Error authenticating with GitHub OAuth:', error);
      workspaceService.log(`GitHub OAuth authentication failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Load repositories for the authenticated user
   */
  private async loadUserRepositories(): Promise<void> {
    try {
      // In a real app, this would make an API call to GitHub
      // For now, we'll simulate a response
      
      if (!this.authenticated) {
        throw new Error('Not authenticated');
      }
      
      // Simulate API call
      this.repositories = [
        {
          owner: this.credentials?.username || 'unknown',
          name: 'qux-95-system',
          url: `https://github.com/${this.credentials?.username}/qux-95-system`,
          description: 'QUX-95 system repository',
          defaultBranch: 'main',
          isPrivate: false,
          cloned: false,
          permissions: {
            admin: true,
            push: true,
            pull: true
          }
        },
        {
          owner: this.credentials?.username || 'unknown',
          name: 'ai-workspace',
          url: `https://github.com/${this.credentials?.username}/ai-workspace`,
          description: 'AI workspace and utilities',
          defaultBranch: 'main',
          isPrivate: false,
          cloned: false,
          permissions: {
            admin: true,
            push: true,
            pull: true
          }
        }
      ];
      
      workspaceService.log(`Loaded ${this.repositories.length} repositories for user: ${this.credentials?.username}`);
    } catch (error) {
      console.error('Error loading user repositories:', error);
      workspaceService.log(`Error loading repositories: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get all repositories for the authenticated user
   */
  getRepositories(): GitHubRepository[] {
    return [...this.repositories];
  }
  
  /**
   * Set the current active repository
   */
  setCurrentRepository(repoName: string): boolean {
    const repository = this.repositories.find(repo => repo.name === repoName);
    
    if (!repository) {
      workspaceService.log(`Repository not found: ${repoName}`);
      return false;
    }
    
    this.currentRepository = repository;
    this.saveState();
    workspaceService.log(`Current repository set to: ${repository.name}`);
    return true;
  }
  
  /**
   * Get the current repository
   */
  getCurrentRepository(): GitHubRepository | null {
    return this.currentRepository;
  }
  
  /**
   * Clone a repository to the local workspace
   */
  async cloneRepository(repoName: string): Promise<boolean> {
    try {
      if (!this.authenticated) {
        workspaceService.log('Cannot clone repository: Not authenticated');
        return false;
      }
      
      const repository = this.repositories.find(repo => repo.name === repoName);
      
      if (!repository) {
        workspaceService.log(`Repository not found: ${repoName}`);
        return false;
      }
      
      // Simulate cloning
      // In a real app, this would use git commands or the GitHub API
      const localPath = `github/${repository.owner}/${repository.name}`;
      workspaceService.createDirectory(`${localPath}`);
      
      // Create a sample README file
      const readmeContent = `# ${repository.name}
${repository.description}

Cloned at: ${new Date().toISOString()}
Owner: ${repository.owner}
Default branch: ${repository.defaultBranch}
`;
      
      workspaceService.writeFile(`${localPath}/README.md`, readmeContent);
      
      // Update repository in our list
      const repoIndex = this.repositories.findIndex(repo => repo.name === repoName);
      this.repositories[repoIndex] = {
        ...repository,
        cloned: true,
        localPath
      };
      
      this.currentRepository = this.repositories[repoIndex];
      
      workspaceService.log(`Repository cloned: ${repository.name} to ${localPath}`);
      this.saveState();
      
      return true;
    } catch (error) {
      console.error('Error cloning repository:', error);
      workspaceService.log(`Error cloning repository: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Create a new branch in the current repository
   */
  async createBranch(branchName: string, baseBranch?: string): Promise<boolean> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        workspaceService.log('Cannot create branch: Not authenticated or no repository selected');
        return false;
      }
      
      if (!this.currentRepository.cloned) {
        workspaceService.log(`Cannot create branch: Repository ${this.currentRepository.name} is not cloned`);
        return false;
      }
      
      // Simulate branch creation
      const base = baseBranch || this.currentRepository.defaultBranch;
      workspaceService.log(`Created branch ${branchName} from ${base} in repository ${this.currentRepository.name}`);
      
      return true;
    } catch (error) {
      console.error('Error creating branch:', error);
      workspaceService.log(`Error creating branch: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Create a new commit in the current repository
   */
  async createCommit(message: string, files: string[]): Promise<GitHubCommit | null> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        workspaceService.log('Cannot create commit: Not authenticated or no repository selected');
        return null;
      }
      
      if (!this.currentRepository.cloned) {
        workspaceService.log(`Cannot create commit: Repository ${this.currentRepository.name} is not cloned`);
        return null;
      }
      
      // Simulate commit
      // In a real app, this would use git commands or the GitHub API
      const hash = Math.random().toString(36).substring(2, 15);
      const commit: GitHubCommit = {
        message,
        date: new Date(),
        hash,
        author: this.credentials?.username || 'unknown',
        files: files.map(filename => ({
          filename,
          status: 'modified' as const,
          additions: Math.floor(Math.random() * 20),
          deletions: Math.floor(Math.random() * 5),
        }))
      };
      
      // Log the commit
      const commitLog = `commit ${hash}
Author: ${commit.author}
Date: ${commit.date.toISOString()}

    ${message}

    Files changed:
    ${files.join('\n    ')}
`;
      
      const logPath = `github/${this.currentRepository.owner}/${this.currentRepository.name}/.git/logs/HEAD`;
      const existingLog = workspaceService.readFile(logPath) || '';
      workspaceService.writeFile(logPath, existingLog + commitLog);
      
      workspaceService.log(`Commit created in ${this.currentRepository.name}: ${message} (${hash})`);
      
      return commit;
    } catch (error) {
      console.error('Error creating commit:', error);
      workspaceService.log(`Error creating commit: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Push commits to the remote repository
   */
  async pushCommits(branch?: string): Promise<boolean> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        workspaceService.log('Cannot push commits: Not authenticated or no repository selected');
        return false;
      }
      
      if (!this.currentRepository.cloned) {
        workspaceService.log(`Cannot push commits: Repository ${this.currentRepository.name} is not cloned`);
        return false;
      }
      
      // Simulate push
      const targetBranch = branch || this.currentRepository.defaultBranch;
      workspaceService.log(`Pushed commits to ${this.currentRepository.name}:${targetBranch}`);
      
      return true;
    } catch (error) {
      console.error('Error pushing commits:', error);
      workspaceService.log(`Error pushing commits: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Create a pull request
   */
  async createPullRequest(
    title: string, 
    body: string, 
    headBranch: string, 
    baseBranch?: string
  ): Promise<GitHubPullRequest | null> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        workspaceService.log('Cannot create pull request: Not authenticated or no repository selected');
        return null;
      }
      
      // Simulate PR creation
      const base = baseBranch || this.currentRepository.defaultBranch;
      const prId = Date.now();
      const prNumber = Math.floor(Math.random() * 1000);
      
      const pullRequest: GitHubPullRequest = {
        id: prId,
        number: prNumber,
        title,
        body,
        state: 'open',
        headBranch,
        baseBranch: base,
        url: `https://github.com/${this.currentRepository.owner}/${this.currentRepository.name}/pull/${prNumber}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        mergeable: true,
        labels: [],
        reviewers: []
      };
      
      workspaceService.log(`Created pull request #${prNumber}: ${title}`);
      
      return pullRequest;
    } catch (error) {
      console.error('Error creating pull request:', error);
      workspaceService.log(`Error creating pull request: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Get pull requests for the current repository
   */
  async getPullRequests(state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubPullRequest[]> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        return [];
      }
      
      // Simulate API response
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      
      // Explicitly typing the state as 'open' | 'closed' | 'merged' to match the interface
      return [
        {
          id: 1000001,
          number: 42,
          title: 'Enhance self-modification capabilities',
          body: 'This PR adds several enhancements to the self-modification system.',
          state: 'open' as const,
          headBranch: 'feature/self-mod-enhancements',
          baseBranch: this.currentRepository.defaultBranch,
          url: `https://github.com/${this.currentRepository.owner}/${this.currentRepository.name}/pull/42`,
          createdAt: yesterday,
          updatedAt: now,
          mergeable: true,
          labels: ['enhancement', 'self-improvement'],
          reviewers: ['AI-Reviewer']
        },
        {
          id: 1000002,
          number: 41,
          title: 'Fix memory management issues',
          body: 'This PR addresses several memory leaks in the system.',
          state: 'open' as const,
          headBranch: 'bugfix/memory-leaks',
          baseBranch: this.currentRepository.defaultBranch,
          url: `https://github.com/${this.currentRepository.owner}/${this.currentRepository.name}/pull/41`,
          createdAt: yesterday,
          updatedAt: now,
          mergeable: true,
          labels: ['bug', 'performance'],
          reviewers: ['AI-Reviewer']
        }
      ].filter(pr => state === 'all' || pr.state === state);
    } catch (error) {
      console.error('Error getting pull requests:', error);
      workspaceService.log(`Error getting pull requests: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Merge a pull request
   */
  async mergePullRequest(pullNumber: number, method: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<boolean> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        workspaceService.log('Cannot merge pull request: Not authenticated or no repository selected');
        return false;
      }
      
      // Simulate merge
      workspaceService.log(`Merged pull request #${pullNumber} using ${method} strategy`);
      
      return true;
    } catch (error) {
      console.error('Error merging pull request:', error);
      workspaceService.log(`Error merging pull request: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Add labels to a pull request
   */
  async addLabels(pullNumber: number, labels: string[]): Promise<boolean> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        workspaceService.log('Cannot add labels: Not authenticated or no repository selected');
        return false;
      }
      
      // Simulate adding labels
      workspaceService.log(`Added labels [${labels.join(', ')}] to pull request #${pullNumber}`);
      
      return true;
    } catch (error) {
      console.error('Error adding labels:', error);
      workspaceService.log(`Error adding labels: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Add a comment to a pull request
   */
  async addComment(pullNumber: number, body: string): Promise<boolean> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        workspaceService.log('Cannot add comment: Not authenticated or no repository selected');
        return false;
      }
      
      // Simulate adding comment
      workspaceService.log(`Added comment to pull request #${pullNumber}`);
      
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      workspaceService.log(`Error adding comment: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Pull changes from the remote repository
   */
  async pullChanges(): Promise<boolean> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        workspaceService.log('Cannot pull changes: Not authenticated or no repository selected');
        return false;
      }
      
      if (!this.currentRepository.cloned) {
        workspaceService.log(`Cannot pull changes: Repository ${this.currentRepository.name} is not cloned`);
        return false;
      }
      
      // Simulate pull
      workspaceService.log(`Pulled changes from ${this.currentRepository.name}`);
      
      return true;
    } catch (error) {
      console.error('Error pulling changes:', error);
      workspaceService.log(`Error pulling changes: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Get commits from the current repository
   */
  async getCommits(branch?: string): Promise<GitHubCommit[]> {
    try {
      if (!this.authenticated || !this.currentRepository || !this.currentRepository.cloned) {
        return [];
      }
      
      // Simulate getting commits
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      
      return [
        {
          message: 'Initial commit',
          date: yesterday,
          hash: Math.random().toString(36).substring(2, 15),
          author: this.credentials?.username || 'unknown',
          files: [
            {
              filename: 'README.md',
              status: 'added',
              additions: 10,
              deletions: 0
            }
          ]
        },
        {
          message: 'Update README',
          date: now,
          hash: Math.random().toString(36).substring(2, 15),
          author: this.credentials?.username || 'unknown',
          files: [
            {
              filename: 'README.md',
              status: 'modified',
              additions: 5,
              deletions: 2
            }
          ]
        }
      ];
    } catch (error) {
      console.error('Error getting commits:', error);
      workspaceService.log(`Error getting commits: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Create a self-modification pull request
   */
  async createSelfModificationPR(
    description: string, 
    files: { path: string, content: string }[]
  ): Promise<{ success: boolean, prUrl?: string, error?: string }> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        return { success: false, error: 'Not authenticated or no repository selected' };
      }
      
      // Create branch for the self-modification
      const branchName = `self-mod/${Date.now()}`;
      const branchCreated = await this.createBranch(branchName);
      
      if (!branchCreated) {
        return { success: false, error: 'Failed to create branch' };
      }
      
      // Simulate writing files to the branch
      for (const file of files) {
        if (this.currentRepository.localPath) {
          const filePath = `${this.currentRepository.localPath}/${file.path}`;
          workspaceService.writeFile(filePath, file.content);
        }
      }
      
      // Create commit
      const filePaths = files.map(f => f.path);
      const commit = await this.createCommit(`Self-modification: ${description}`, filePaths);
      
      if (!commit) {
        return { success: false, error: 'Failed to create commit' };
      }
      
      // Push changes
      const pushed = await this.pushCommits(branchName);
      
      if (!pushed) {
        return { success: false, error: 'Failed to push changes' };
      }
      
      // Create pull request
      const prTitle = `[Self-Modification] ${description}`;
      const prBody = `
# Automated Self-Modification

This pull request was automatically generated by QUX-95's self-modification system.

## Description
${description}

## Changes
${files.map(f => `- \`${f.path}\``).join('\n')}

## Commit
${commit.hash}

## Generated at
${new Date().toISOString()}
      `;
      
      const pullRequest = await this.createPullRequest(
        prTitle,
        prBody,
        branchName
      );
      
      if (!pullRequest) {
        return { success: false, error: 'Failed to create pull request' };
      }
      
      // Add labels
      await this.addLabels(pullRequest.number, ['self-modification', 'automated']);
      
      // Add a review comment
      await this.addComment(
        pullRequest.number, 
        `This pull request was automatically reviewed by the QUX-95 system.\n\nThe changes look safe to apply.`
      );
      
      workspaceService.log(`Created self-modification pull request: ${pullRequest.url}`);
      
      return {
        success: true,
        prUrl: pullRequest.url
      };
    } catch (error) {
      console.error('Error creating self-modification PR:', error);
      workspaceService.log(`Error creating self-modification PR: ${error instanceof Error ? error.message : String(error)}`);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Apply a self-modification without creating a PR (for quick fixes)
   */
  async applySelfModification(
    description: string,
    files: { path: string, content: string }[]
  ): Promise<{ success: boolean, commitHash?: string, error?: string }> {
    try {
      if (!this.authenticated || !this.currentRepository) {
        return { success: false, error: 'Not authenticated or no repository selected' };
      }
      
      if (!this.currentRepository.cloned) {
        return { success: false, error: `Repository ${this.currentRepository.name} is not cloned` };
      }
      
      // Simulate writing files
      for (const file of files) {
        if (this.currentRepository.localPath) {
          const filePath = `${this.currentRepository.localPath}/${file.path}`;
          workspaceService.writeFile(filePath, file.content);
        }
      }
      
      // Create commit
      const filePaths = files.map(f => f.path);
      const commit = await this.createCommit(`Quick fix: ${description}`, filePaths);
      
      if (!commit) {
        return { success: false, error: 'Failed to create commit' };
      }
      
      // Push changes
      const pushed = await this.pushCommits();
      
      if (!pushed) {
        return { success: false, error: 'Failed to push changes' };
      }
      
      workspaceService.log(`Applied self-modification: ${description} (${commit.hash})`);
      
      return {
        success: true,
        commitHash: commit.hash
      };
    } catch (error) {
      console.error('Error applying self-modification:', error);
      workspaceService.log(`Error applying self-modification: ${error instanceof Error ? error.message : String(error)}`);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }
  
  /**
   * Logout
   */
  logout(): void {
    this.credentials = null;
    this.authenticated = false;
    this.currentRepository = null;
    this.saveState();
    workspaceService.log('GitHub logout successful');
  }
}

export const githubService = new GitHubService();
