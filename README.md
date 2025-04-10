
# QUX-95 AI System

## Project Overview

QUX-95 is an advanced AI interaction system built on React and TypeScript, designed to provide seamless integration with the Ollama language model backend. The system features a modern, cyberpunk-inspired UI with terminal-like interactions, model management, document processing capabilities, and self-learning functionality.

## Core Features

- **AI Model Integration**: Direct interface with Ollama language models for text completion and chat functionality
- **Self-Learning Capability**: Continuous improvement through tracked examples and feedback
- **Workspace Management**: Built-in file system for AI-generated content and code
- **Hardware Optimization**: Automatic detection and utilization of available GPU/CPU resources
- **Document Processing**: Extract and analyze content from uploaded documents
- **Terminal Interface**: Command-line style interaction alongside modern UI components
- **Customizable Themes**: Cyberpunk-inspired visual aesthetics with dark mode support

## System Requirements

- Node.js (v18+)
- Ollama installed locally (for AI functionality)
- Modern web browser

## Quick Start

```sh
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd qux-95

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Architecture

The QUX-95 system is built on a modular architecture, with clear separation of concerns:

### Core Components

- **Services Layer**: Handles business logic and external integrations
  - `ollamaService`: Manages all interactions with the Ollama backend
  - `learningService`: Handles the self-improvement system
  - `workspaceService`: Manages file operations and workspace state
  - `saveSystem`: Provides persistence for system state
  
- **UI Components**: React components organized by function
  - Terminal and command interface
  - Model selection and management
  - Document processing
  - Settings and configuration
  
- **State Management**: Uses a combination of React Context and service singletons

### Data Flow

```
User Input → UI Components → Services → External APIs → Services → UI Components → User
```

## Service Architecture

### ollamaService

The central service for AI functionality is composed of several modules:

- **OllamaConnection**: Handles connection to the Ollama backend and hardware detection
- **OllamaModels**: Manages available models and model selection
- **OllamaCompletion**: Handles text generation and chat functionality
- **OllamaMemory**: Manages context window and persistent memory

### learningService

Provides self-improvement capabilities:

- Example tracking and feedback collection
- Model performance metrics
- Learning process management

### workspaceService

Manages the file system for AI-generated content:

- File creation, reading, updating, and deletion
- Directory management
- File metadata tracking

## Development Guidelines

### Coding Standards

- Use TypeScript for all new code
- Follow the existing component structure
- Document public methods and complex logic
- Use Tailwind CSS for styling
- Create small, focused components (50 lines or less)

### Component Organization

- UI components should be placed in `src/components/`
- Services go in `src/services/`
- Utility functions in `src/utils/`
- Hooks should be placed in `src/hooks/`

### Best Practices

1. **Error Handling**: Use the `BaseService.handleError` method for consistent error handling
2. **State Management**: Leverage the `saveSystem` for persistent state
3. **UI Components**: Keep components small and focused on a single responsibility
4. **Type Safety**: Ensure proper TypeScript types for all variables and functions
5. **Documentation**: Add JSDoc comments to all public methods and complex logic

## Code Quality Tools

### Testing

The project uses Jest for testing. Run tests using:

```sh
npm test
```

For test coverage reports:

```sh
npm run test:coverage
```

### CI/CD Pipeline

The project includes a CI/CD pipeline implemented with GitHub Actions:

1. Every push and pull request runs tests and linting
2. Successful merges to main branch trigger automated builds
3. Deployment occurs automatically after successful builds

You can run the CI pipeline locally using:

```sh
npm run ci
```

### Security Measures

The application implements several security features:

- Content Security Policy (CSP)
- HTTPS Strict Transport Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy

## Monitoring and Performance

Performance monitoring is implemented with:

- API request timing
- Error tracking
- Session metrics

## Contributing

When contributing to QUX-95, please follow these guidelines:

1. Create focused, maintainable components
2. Ensure comprehensive test coverage for new features
3. Update documentation to reflect changes
4. Follow the established code structure and patterns
5. Run the local CI pipeline before submitting PRs

## Code Review Process

All code changes undergo a review process:

1. Automated checks via GitHub Actions
2. Manual code review by at least one maintainer
3. Verification of test coverage
4. Security review for sensitive changes

## System Services

### OllamaService

Central service for interacting with Ollama LLMs:
- Model management (listing, selecting, uploading)
- Text completion and chat functionality
- Memory and context management

### WorkspaceService

File system management for AI workspaces:
- Create, read, update, and delete files
- Manage directories
- Track file metadata

### LearningService

Handles the self-learning capabilities:
- Track examples and feedback
- Maintain learning models
- Calculate improvement metrics

## Roadmap

- Enhanced document processing with multi-format support
- Expanded GitHub integration for repository management
- Improved self-learning algorithms with better model adaptation
- Performance optimizations for large context windows
- Advanced workspace capabilities with more file formats

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the project history and version details.
