#!/usr/bin/env python
"""
QUX-95 Genesis Core Autonomous CLI
----------------------------------
This CLI enables self-modification of code based on chat interactions,
with long-term/short-term memory, document RAG, and reasoning capabilities.
"""
import argparse
import json
import logging
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("qux-95-ai")

# Import modules based on installation
try:
    import ollama
    import redis
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    import faiss
    import numpy as np
    from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker
    import datetime
except ImportError as e:
    logger.error(f"Missing dependency: {e}")
    logger.error("Please run: pip install ollama openwebui langchain llama-cpp-python redis sqlalchemy watchdog faiss-cpu numpy")
    sys.exit(1)

# Project paths
ROOT_DIR = Path(__file__).parent.absolute()
DOCS_DIR = ROOT_DIR / "docs"
SRC_DIR = ROOT_DIR / "src"
DB_PATH = ROOT_DIR / "ai_memory.sqlite"

# SQLAlchemy setup
Base = declarative_base()
engine = create_engine(f"sqlite:///{DB_PATH}")
Session = sessionmaker(bind=engine)

# Memory models
class LongTermMemory(Base):
    __tablename__ = "long_term_memory"
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    category = Column(String(50))
    content = Column(Text)
    metadata = Column(Text)  # JSON serialized
    
    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "category": self.category,
            "content": self.content,
            "metadata": json.loads(self.metadata) if self.metadata else {}
        }

# Create tables
Base.metadata.create_all(engine)

# Short-term memory (in-process)
short_term_memory: List[Dict[str, Any]] = []

class RAGSystem:
    """Document retrieval and embedding system"""
    
    def __init__(self, docs_dir: Path):
        self.docs_dir = docs_dir
        self.docs_index = {}
        self.embeddings = None
        self.index = None
        self.initialize_index()
    
    def initialize_index(self):
        """Initialize FAISS index for document embeddings"""
        if not self.docs_dir.exists():
            logger.warning(f"Docs directory {self.docs_dir} does not exist")
            self.docs_dir.mkdir(exist_ok=True)
            return
        
        # In real implementation, we would:
        # 1. Load all documents from docs_dir
        # 2. Split them into chunks
        # 3. Create embeddings for each chunk
        # 4. Build a FAISS index
        logger.info(f"Initializing RAG index from {self.docs_dir}")
        
        # Dummy implementation for demo
        doc_files = list(self.docs_dir.glob("**/*.md"))
        logger.info(f"Found {len(doc_files)} document files")
        
        if doc_files:
            # In a real implementation, we would generate embeddings here
            # For now, let's just create a dummy index
            dimension = 1536  # Typical embedding dimension
            self.index = faiss.IndexFlatL2(dimension)
            # We'd add vectors to the index here based on doc embeddings
        else:
            logger.warning("No documents found for indexing")
    
    def ingest_document(self, file_path: Path):
        """Ingest a new document into the RAG system"""
        logger.info(f"Ingesting document: {file_path}")
        # In a real implementation, we would:
        # 1. Read the document
        # 2. Split into chunks
        # 3. Generate embeddings
        # 4. Update the FAISS index
        # For now, just log that we would do this
        
    def query(self, text: str, top_k: int = 3) -> List[Dict]:
        """Query the RAG system for relevant document chunks"""
        logger.info(f"RAG Query: {text[:50]}...")
        
        # In a real implementation, we would:
        # 1. Generate an embedding for the query text
        # 2. Search the FAISS index for similar documents
        # 3. Return the top_k most relevant chunks
        
        # Dummy response for now
        return [
            {"source": "docs/dummy.md", "content": "This is a placeholder for RAG results", "score": 0.95}
        ]

class AISystem:
    """Core AI system for code modification"""
    
    def __init__(self):
        self.rag = RAGSystem(DOCS_DIR)
        self.model_name = "llama3"  # Default model
        
    def load_model(self):
        """Load the LLM model via Ollama"""
        try:
            logger.info(f"Loading model {self.model_name} via Ollama")
            # In a real implementation, we would initialize the model here
            # For demo purposes, we'll just check if Ollama is running
            models = ollama.list()
            logger.info(f"Available models: {models}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def analyze_chat(self, input_text: str) -> Dict:
        """Process user chat and store context"""
        logger.info(f"Analyzing chat: {input_text[:50]}...")
        
        # 1. Store in short-term memory
        chat_entry = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "type": "user_input",
            "content": input_text
        }
        short_term_memory.append(chat_entry)
        
        # 2. Store in long-term memory (if significant)
        session = Session()
        memory = LongTermMemory(
            category="chat",
            content=input_text,
            metadata=json.dumps({"source": "user", "analyzed": False})
        )
        session.add(memory)
        session.commit()
        session.close()
        
        # 3. Query RAG for relevant context
        rag_results = self.rag.query(input_text)
        
        # 4. Generate a response (would use LLM in real implementation)
        response = {
            "status": "success",
            "message": "Chat analyzed and stored",
            "rag_results": rag_results,
            "memory_id": memory.id
        }
        
        return response
    
    def generate_patch(self, feature_description: Optional[str] = None) -> str:
        """Generate a code patch based on current context and feature request"""
        logger.info("Generating code patch...")
        
        # In a real implementation, this would:
        # 1. Use the LLM to analyze the codebase
        # 2. Generate a patch in unified diff format
        # 3. Return the patch
        
        # For demo purposes, let's create a dummy patch
        patch = """
diff --git a/src/App.tsx b/src/App.tsx
index 1234567..abcdefg 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -10,6 +10,7 @@ function App() {
   return (
     <div className="App">
       <header className="App-header">
+        <h1>QUX-95 Genesis Core - AI Enhanced</h1>
         <p>
           Edit <code>src/App.tsx</code> and save to reload.
         </p>
"""
        
        # Store this in long-term memory
        session = Session()
        memory = LongTermMemory(
            category="code_patch",
            content=patch,
            metadata=json.dumps({
                "description": feature_description or "Auto-generated patch",
                "timestamp": datetime.datetime.utcnow().isoformat()
            })
        )
        session.add(memory)
        session.commit()
        session.close()
        
        return patch
    
    def apply_patch(self, patch_content: str, commit_message: str) -> bool:
        """Apply a patch to the codebase and commit changes"""
        logger.info("Applying patch...")
        
        # Save patch to temporary file
        patch_file = ROOT_DIR / "temp_patch.diff"
        with open(patch_file, "w") as f:
            f.write(patch_content)
        
        try:
            # Apply the patch
            result = subprocess.run(
                ["git", "apply", str(patch_file)],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"Failed to apply patch: {result.stderr}")
                return False
            
            # Run lint and tests
            lint_result = subprocess.run(
                ["npm", "run", "lint"],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True
            )
            
            if lint_result.returncode != 0:
                logger.error(f"Lint failed: {lint_result.stderr}")
                # In a real implementation, we might revert changes or fix issues
                return False
            
            # Commit changes
            git_add = subprocess.run(
                ["git", "add", "."],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True
            )
            
            git_commit = subprocess.run(
                ["git", "commit", "-S", "-m", f"AI: {commit_message}"],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True
            )
            
            if git_commit.returncode != 0:
                logger.error(f"Failed to commit: {git_commit.stderr}")
                return False
            
            logger.info(f"Successfully applied and committed patch: {commit_message}")
            return True
            
        except Exception as e:
            logger.error(f"Error applying patch: {e}")
            return False
        finally:
            # Clean up
            if patch_file.exists():
                patch_file.unlink()

class FileChangeHandler(FileSystemEventHandler):
    """Handle file change events for watched directories"""
    
    def __init__(self, ai_system: AISystem):
        self.ai_system = ai_system
        self.last_event_time = time.time()
        self.debounce_seconds = 2.0  # Debounce to prevent duplicate events
    
    def on_modified(self, event):
        # Debounce to prevent multiple rapid events
        current_time = time.time()
        if current_time - self.last_event_time < self.debounce_seconds:
            return
        
        self.last_event_time = current_time
        
        if event.is_directory:
            return
            
        logger.info(f"Detected file change: {event.src_path}")
        
        # If it's a document, ingest it into RAG
        if event.src_path.startswith(str(DOCS_DIR)) and event.src_path.endswith((".md", ".txt")):
            self.ai_system.rag.ingest_document(Path(event.src_path))
        
        # If it's source code, maybe trigger analysis
        if event.src_path.startswith(str(SRC_DIR)) and event.src_path.endswith((".tsx", ".ts", ".js", ".jsx")):
            logger.info(f"Source code change detected: {event.src_path}")
            # We could trigger analysis here in a real implementation

def setup_file_watcher(ai_system: AISystem, watch_dirs: List[Path]) -> Observer:
    """Set up a file watcher for the specified directories"""
    observer = Observer()
    handler = FileChangeHandler(ai_system)
    
    for directory in watch_dirs:
        if directory.exists():
            logger.info(f"Setting up file watcher for {directory}")
            observer.schedule(handler, str(directory), recursive=True)
    
    observer.start()
    return observer

def main():
    parser = argparse.ArgumentParser(description="QUX-95 Genesis Core AI CLI")
    parser.add_argument("--watch", type=str, help="Directory to watch for changes")
    parser.add_argument("--model", type=str, default="llama3", help="Model to use with Ollama")
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # analyze_chat command
    analyze_parser = subparsers.add_parser("analyze_chat", help="Analyze chat input")
    analyze_parser.add_argument("input_text", type=str, help="Chat input to analyze")
    
    # generate_patch command
    generate_parser = subparsers.add_parser("generate_patch", help="Generate code patch")
    generate_parser.add_argument("--description", type=str, help="Feature description")
    
    # apply_patch command
    apply_parser = subparsers.add_parser("apply_patch", help="Apply a patch")
    apply_parser.add_argument("--patch-file", type=str, help="Path to patch file")
    apply_parser.add_argument("--message", type=str, default="Auto-applied patch", help="Commit message")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Initialize AI system
    ai_system = AISystem()
    ai_system.model_name = args.model
    model_loaded = ai_system.load_model()
    
    if not model_loaded:
        logger.warning("Continuing without LLM model")
    
    # Process commands
    if args.command == "analyze_chat":
        result = ai_system.analyze_chat(args.input_text)
        print(json.dumps(result, indent=2))
        
    elif args.command == "generate_patch":
        patch = ai_system.generate_patch(args.description)
        print(patch)
        
    elif args.command == "apply_patch":
        if args.patch_file:
            with open(args.patch_file, "r") as f:
                patch_content = f.read()
            success = ai_system.apply_patch(patch_content, args.message)
            print(f"Patch applied: {success}")
        else:
            logger.error("No patch file specified")
            
    # Set up file watcher if requested
    if args.watch:
        watch_path = Path(args.watch)
        if not watch_path.exists():
            logger.error(f"Watch directory does not exist: {watch_path}")
            return
        
        logger.info(f"Starting file watcher for {watch_path}")
        observer = setup_file_watcher(ai_system, [watch_path])
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()

if __name__ == "__main__":
    main()
