#!/usr/bin/env python
"""
QUX-95 Genesis Core REST API Server
-----------------------------------
This server provides REST endpoints for the autonomous system.
It allows the front-end to communicate with the AI backend.
"""
import json
import logging
import os
import sys
import numpy as np
from typing import Dict, Any, Optional, List, Union

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our CLI module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from cli import AISystem, short_term_memory, Session, LongTermMemory

# Import quantum reasoning modules
from quantum_reasoning import (
    QuantumReasoningSystem,
    QuantumState,
    DecisionContext,
    QuantumPathway
)

# Import quantum reasoning bridge
from quantum_reasoning_bridge import quantum_reasoning_bridge

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("qux-95-server")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize AI system
ai_system = AISystem()
model_loaded = ai_system.load_model()
if not model_loaded:
    logger.warning("Server started without LLM model")

# Initialize quantum reasoning system
quantum_reasoning = QuantumReasoningSystem()
quantum_reasoning.initialize()

# Initialize quantum reasoning bridge
quantum_reasoning_bridge.initialize()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "model_loaded": model_loaded,
        "memory_items": {
            "short_term": len(short_term_memory),
            "long_term": get_long_term_memory_count()
        }
    })

@app.route('/api/chat', methods=['POST'])
def process_chat():
    """Process a chat message"""
    data = request.json

    if not data or 'message' not in data:
        return jsonify({"error": "No message provided"}), 400

    try:
        result = ai_system.analyze_chat(data['message'])
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error processing chat: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memory', methods=['GET'])
def get_memories():
    """Get memories from the system"""
    memory_type = request.args.get('type', 'all')
    limit = int(request.args.get('limit', 10))

    result = {}

    if memory_type in ['all', 'short_term']:
        # Get most recent short-term memories
        result['short_term'] = short_term_memory[-limit:] if short_term_memory else []

    if memory_type in ['all', 'long_term']:
        # Get most recent long-term memories
        session = Session()
        memories = session.query(LongTermMemory).order_by(
            LongTermMemory.timestamp.desc()
        ).limit(limit).all()

        result['long_term'] = [memory.to_dict() for memory in memories]
        session.close()

    return jsonify(result)

@app.route('/api/generate-patch', methods=['POST'])
def generate_patch():
    """Generate a code patch"""
    data = request.json
    description = data.get('description', '')

    try:
        patch = ai_system.generate_patch(description)
        return jsonify({
            "status": "success",
            "patch": patch
        })
    except Exception as e:
        logger.error(f"Error generating patch: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/apply-patch', methods=['POST'])
def apply_patch():
    """Apply a code patch"""
    data = request.json

    if not data or 'patch' not in data:
        return jsonify({"error": "No patch provided"}), 400

    message = data.get('message', 'Auto-applied patch')

    try:
        success = ai_system.apply_patch(data['patch'], message)
        return jsonify({
            "status": "success" if success else "failure",
            "message": f"Patch {'applied' if success else 'failed'}"
        })
    except Exception as e:
        logger.error(f"Error applying patch: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/quantum-reasoning/enhance', methods=['POST'])
def enhance_reasoning():
    """Enhance reasoning with quantum decision-making"""
    data = request.json

    if not data or 'problem' not in data:
        return jsonify({"error": "No problem provided"}), 400

    try:
        problem = data['problem']
        options = data.get('options', {})

        # Use the quantum reasoning bridge to enhance reasoning
        result = quantum_reasoning_bridge.enhance_reasoning(problem, options)

        return jsonify({
            "success": True,
            "data": result,
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in quantum-enhanced reasoning: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }), 500

@app.route('/api/quantum-reasoning/analyze', methods=['POST'])
def quantum_analyze():
    """Analyze text using quantum-enhanced reasoning"""
    data = request.json

    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    try:
        text = data['text']
        options = data.get('options', {})

        # Use the quantum reasoning bridge to analyze the text
        result = quantum_reasoning_bridge.quantum_analyze(text, options)

        return jsonify({
            "success": True,
            "data": result,
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in quantum analysis: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }), 500

# Neural-Cybernetic API Endpoints

@app.route('/api/neural-cybernetic/quantum/decide', methods=['POST'])
def quantum_decide():
    """Make a decision using quantum reasoning"""
    data = request.json

    if not data or 'context' not in data:
        return jsonify({"error": "No decision context provided"}), 400

    try:
        context = data['context']
        options = data.get('options', {})

        # Generate quantum pathways
        num_pathways = options.get('numPathways', 5)
        result = quantum_reasoning.generate_pathways(context, num_pathways)

        # Evaluate pathways
        evaluation = quantum_reasoning.evaluate_pathways(context['id'])

        # Get quantum states
        state_ids = evaluation['pathway']['states']
        quantum_states = [quantum_reasoning.get_state(state_id) for state_id in state_ids]

        # Get alternative pathways
        alt_limit = options.get('alternativeLimit', 3)
        alternative_pathways = quantum_reasoning.get_alternative_pathways(context['id'], alt_limit)

        return jsonify({
            "success": True,
            "data": {
                "recommendedPathway": evaluation['pathway'],
                "alternativePathways": alternative_pathways,
                "quantumStates": quantum_states,
                "confidence": evaluation['confidence']
            },
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in quantum decision: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }), 500

@app.route('/api/neural-cybernetic/quantum/states', methods=['GET'])
def get_quantum_states():
    """Get quantum states"""
    try:
        state_ids = request.args.get('stateIds', '').split(',') if request.args.get('stateIds') else []
        include_collapsed = request.args.get('includeCollapsed', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 10))

        if state_ids and len(state_ids) > 0 and state_ids[0]:
            # Get specific states by ID
            states = [quantum_reasoning.get_state(state_id) for state_id in state_ids if state_id]
            states = [state for state in states if state is not None]
        else:
            # Get all states, optionally filtered
            states = quantum_reasoning.get_all_states(include_collapsed)

            # Apply limit
            states = states[:limit]

        return jsonify({
            "success": True,
            "data": {
                "states": states
            },
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting quantum states: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }), 500

@app.route('/api/neural-cybernetic/quantum/collapse', methods=['POST'])
def collapse_quantum_state():
    """Collapse a quantum state"""
    data = request.json

    if not data or 'stateId' not in data:
        return jsonify({"error": "No state ID provided"}), 400

    try:
        state_id = data['stateId']
        collapsed_state = quantum_reasoning.collapse_state(state_id)

        return jsonify({
            "success": True,
            "data": {
                "collapsedState": collapsed_state
            },
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error collapsing quantum state: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }), 500

def get_long_term_memory_count() -> int:
    """Get the count of long-term memory items"""
    session = Session()
    count = session.query(LongTermMemory).count()
    session.close()
    return count

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

    logger.info(f"Starting QUX-95 API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
