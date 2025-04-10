
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

- **Core Services**: Ollama integration, learning system, workspace management
- **UI Components**: React components for user interaction
- **State Management**: Centralized system state with persistence
- **Utility Functions**: Common functions for system operations

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

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the project history and version details.

## Roadmap

- Enhanced document processing with multi-format support
- Expanded GitHub integration for repository management
- Improved self-learning algorithms with better model adaptation
- Performance optimizations for large context windows
- Advanced workspace capabilities with more file formats

## Contributing

Contributions are welcome! Please follow the established coding standards and component structure. Create focused, maintainable components and ensure comprehensive test coverage for new features.

