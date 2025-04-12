# QUX-95 Genesis Core

## Getting Started

The QUX-95 Genesis Core is an autonomous software automation system capable of self-modification based on chat interactions. This document provides an overview of the system's capabilities and how to use them.

### Key Features

- **Self-Modification**: The system can generate and apply code patches based on chat interactions.
- **Memory Systems**: Both short-term (in-process) and long-term (persistent) memory stores.
- **RAG Pipeline**: Document retrieval for context-aware responses.
- **Reasoning**: Logical analysis of requirements to generate appropriate code changes.

### Usage

To interact with the system, use the following commands:

```bash
# Analyze a chat message
npm run ai:cli -- analyze_chat "Add a dark mode toggle to the UI"

# Generate a code patch
npm run ai:cli -- generate_patch --description "Dark mode toggle implementation"

# Apply a patch
npm run ai:cli -- apply_patch --patch-file patch.diff --message "Add dark mode toggle"

# Watch for file changes
npm run ai:watch
```

### Integration with Front-End

The system integrates with the front-end via a REST API. The API endpoints are:

- `/api/health`: Check system health
- `/api/chat`: Process chat messages
- `/api/memory`: Retrieve memory entries
- `/api/generate-patch`: Generate code patches
- `/api/apply-patch`: Apply patches to the codebase

### Architecture

The core architecture consists of:

1. **CLI Interface**: Command-line tools for interacting with the system
2. **REST API**: Web API for front-end integration
3. **LLM Integration**: Connection to Ollama for language model capabilities
4. **Memory Systems**: SQLite and in-memory storage
5. **RAG Pipeline**: Document retrieval and indexing
6. **Patch Generation**: Code diff generation
7. **Patch Application**: Git-based code modification and commit

### Security

The system uses SSH key authentication for Git operations and implements security measures to protect sensitive information.
