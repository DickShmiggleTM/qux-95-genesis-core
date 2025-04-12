#!/usr/bin/env python
"""
Quantum Reasoning System
------------------------
This module provides quantum-inspired reasoning capabilities for the QUX-95 system.
It integrates with the TypeScript quantum decision engine to provide advanced
decision-making capabilities.
"""

import json
import logging
import uuid
import datetime
import math
import random
import numpy as np
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger("quantum-reasoning")

class Complex:
    """Complex number representation for quantum amplitudes"""
    def __init__(self, real: float, imag: float):
        self.real = real
        self.imag = imag
    
    def __repr__(self) -> str:
        return f"{self.real} + {self.imag}i"
    
    def magnitude_squared(self) -> float:
        """Calculate the squared magnitude of the complex number"""
        return self.real * self.real + self.imag * self.imag
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for JSON serialization"""
        return {
            "real": self.real,
            "imag": self.imag
        }

class QuantumState:
    """Represents a quantum state with probability amplitudes"""
    def __init__(self, state_id: Optional[str] = None):
        self.id = state_id or str(uuid.uuid4())
        self.amplitudes: Dict[str, Complex] = {}
        self.created_at = datetime.datetime.now().isoformat()
        self.last_observed = None
        self.collapsed = False
        self.tags: List[str] = []
    
    def add_amplitude(self, outcome: str, amplitude: Complex) -> None:
        """Add an amplitude for a specific outcome"""
        self.amplitudes[outcome] = amplitude
    
    def collapse(self) -> str:
        """Collapse the quantum state to a single outcome"""
        if self.collapsed:
            # If already collapsed, return the outcome
            for outcome, amplitude in self.amplitudes.items():
                if amplitude.magnitude_squared() > 0.99:  # Close to 1
                    return outcome
        
        # Calculate probabilities from amplitudes
        probabilities = {}
        total_prob = 0
        
        for outcome, amplitude in self.amplitudes.items():
            prob = amplitude.magnitude_squared()
            probabilities[outcome] = prob
            total_prob += prob
        
        # Normalize probabilities
        if total_prob > 0:
            for outcome in probabilities:
                probabilities[outcome] /= total_prob
        
        # Choose an outcome based on probabilities
        r = random.random()
        cumulative_prob = 0
        chosen_outcome = list(probabilities.keys())[0]  # Default
        
        for outcome, prob in probabilities.items():
            cumulative_prob += prob
            if r <= cumulative_prob:
                chosen_outcome = outcome
                break
        
        # Update the state to be collapsed
        self.collapsed = True
        self.last_observed = datetime.datetime.now().isoformat()
        
        # Set the chosen outcome to probability 1, others to 0
        for outcome in self.amplitudes:
            if outcome == chosen_outcome:
                self.amplitudes[outcome] = Complex(1.0, 0.0)
            else:
                self.amplitudes[outcome] = Complex(0.0, 0.0)
        
        return chosen_outcome
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "amplitudes": {k: v.to_dict() for k, v in self.amplitudes.items()},
            "createdAt": self.created_at,
            "lastObserved": self.last_observed,
            "collapsed": self.collapsed,
            "tags": self.tags
        }

class QuantumPathway:
    """Represents a decision pathway with quantum properties"""
    def __init__(self, pathway_id: Optional[str] = None):
        self.id = pathway_id or str(uuid.uuid4())
        self.states: List[str] = []  # IDs of quantum states
        self.probability = 0.0
        self.utility = 0.0
        self.entangled_pathways: List[str] = []  # IDs of entangled pathways
        self.metadata: Dict[str, Any] = {
            "created": datetime.datetime.now().isoformat(),
            "evaluationCount": 0
        }
    
    def add_state(self, state_id: str) -> None:
        """Add a quantum state to the pathway"""
        self.states.append(state_id)
    
    def entangle_with(self, pathway_id: str) -> None:
        """Entangle this pathway with another"""
        if pathway_id not in self.entangled_pathways:
            self.entangled_pathways.append(pathway_id)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "states": self.states,
            "probability": self.probability,
            "utility": self.utility,
            "entangledPathways": self.entangled_pathways,
            "metadata": self.metadata
        }

class DecisionContext:
    """Context for a decision problem"""
    def __init__(self, context_id: Optional[str] = None):
        self.id = context_id or str(uuid.uuid4())
        self.problem = ""
        self.objectives: List[str] = []
        self.constraints: List[str] = []
        self.actions: List[str] = []
        self.created_at = datetime.datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "problem": self.problem,
            "objectives": self.objectives,
            "constraints": self.constraints,
            "actions": self.actions,
            "createdAt": self.created_at
        }

class QuantumReasoningSystem:
    """Main class for quantum-inspired reasoning"""
    def __init__(self):
        self.states: Dict[str, QuantumState] = {}
        self.pathways: Dict[str, QuantumPathway] = {}
        self.contexts: Dict[str, DecisionContext] = {}
        self.initialized = False
    
    def initialize(self) -> None:
        """Initialize the quantum reasoning system"""
        if self.initialized:
            return
        
        logger.info("Initializing Quantum Reasoning System")
        self.initialized = True
    
    def create_quantum_state(self, outcomes: List[str], tags: List[str] = None) -> QuantumState:
        """Create a new quantum state with equal superposition of outcomes"""
        state = QuantumState()
        
        # Set tags if provided
        if tags:
            state.tags = tags
        
        # Create equal superposition
        amplitude_magnitude = 1.0 / math.sqrt(len(outcomes))
        
        for outcome in outcomes:
            # Random phase for each outcome
            phase = random.uniform(0, 2 * math.pi)
            amplitude = Complex(
                amplitude_magnitude * math.cos(phase),
                amplitude_magnitude * math.sin(phase)
            )
            state.add_amplitude(outcome, amplitude)
        
        # Store the state
        self.states[state.id] = state
        return state
    
    def get_state(self, state_id: str) -> Optional[Dict[str, Any]]:
        """Get a quantum state by ID"""
        state = self.states.get(state_id)
        return state.to_dict() if state else None
    
    def get_all_states(self, include_collapsed: bool = True) -> List[Dict[str, Any]]:
        """Get all quantum states"""
        if include_collapsed:
            return [state.to_dict() for state in self.states.values()]
        else:
            return [state.to_dict() for state in self.states.values() if not state.collapsed]
    
    def collapse_state(self, state_id: str) -> Dict[str, Any]:
        """Collapse a quantum state to a definite outcome"""
        state = self.states.get(state_id)
        if not state:
            raise ValueError(f"State with ID {state_id} not found")
        
        outcome = state.collapse()
        logger.info(f"Collapsed state {state_id} to outcome: {outcome}")
        
        return state.to_dict()
    
    def generate_pathways(self, context_data: Dict[str, Any], num_pathways: int = 5) -> Dict[str, Any]:
        """Generate quantum decision pathways for a context"""
        # Create or retrieve context
        context_id = context_data.get('id', str(uuid.uuid4()))
        if context_id in self.contexts:
            context = self.contexts[context_id]
        else:
            context = DecisionContext(context_id)
            context.problem = context_data.get('problem', '')
            context.objectives = context_data.get('objectives', [])
            context.constraints = context_data.get('constraints', [])
            context.actions = context_data.get('actions', [])
            self.contexts[context_id] = context
        
        # Generate pathways
        pathways = []
        
        for _ in range(num_pathways):
            pathway = QuantumPathway()
            
            # Create a quantum state for this pathway
            possible_outcomes = ['success', 'partial_success', 'failure']
            state = self.create_quantum_state(
                possible_outcomes,
                ['decision'] + context.actions
            )
            
            # Add the state to the pathway
            pathway.add_state(state.id)
            
            # Calculate probability and utility
            pathway.probability = random.uniform(0.3, 0.9)
            pathway.utility = self._calculate_utility(
                context.actions,
                context.objectives,
                context.constraints
            )
            
            # Add context metadata
            pathway.metadata['contextId'] = context_id
            pathway.metadata['actions'] = context.actions
            
            # Store the pathway
            self.pathways[pathway.id] = pathway
            pathways.append(pathway)
        
        # Create quantum entanglement between similar pathways
        self._entangle_related_pathways(context_id)
        
        logger.info(f"Generated {num_pathways} quantum pathways for context {context_id}")
        
        return {
            "contextId": context_id,
            "pathways": [p.to_dict() for p in pathways]
        }
    
    def _calculate_utility(self, actions: List[str], objectives: List[str], constraints: List[str]) -> float:
        """Calculate utility of a set of actions"""
        # In a real implementation, this would evaluate how well the actions fulfill objectives
        # while respecting constraints
        
        # Simplified implementation for demo
        utility = random.uniform(0, 0.5)  # Base utility
        
        # Bonus for each action (assuming more actions might be better in this simple model)
        utility += len(actions) * 0.1
        
        # Penalty for potential constraint violations
        potential_constraint_violations = min(
            len(constraints),
            int(len(actions) * 0.3)
        )
        utility -= potential_constraint_violations * 0.15
        
        # Cap utility between 0 and 1
        return max(0, min(1, utility))
    
    def _entangle_related_pathways(self, context_id: str) -> None:
        """Create quantum entanglement between similar pathways"""
        # Get all pathways for this context
        context_pathways = [
            p for p in self.pathways.values()
            if p.metadata.get('contextId') == context_id
        ]
        
        # Simple entanglement based on action similarity
        for i, p1 in enumerate(context_pathways):
            for j, p2 in enumerate(context_pathways[i+1:], i+1):
                # Calculate action similarity
                actions1 = set(p1.metadata.get('actions', []))
                actions2 = set(p2.metadata.get('actions', []))
                
                if not actions1 or not actions2:
                    continue
                
                similarity = len(actions1.intersection(actions2)) / len(actions1.union(actions2))
                
                # Entangle if similarity is above threshold
                if similarity > 0.5:
                    p1.entangle_with(p2.id)
                    p2.entangle_with(p1.id)
    
    def evaluate_pathways(self, context_id: str) -> Dict[str, Any]:
        """Evaluate quantum pathways for a context and recommend the best one"""
        # Get all pathways for this context
        context_pathways = [
            p for p in self.pathways.values()
            if p.metadata.get('contextId') == context_id
        ]
        
        if not context_pathways:
            raise ValueError(f"No pathways found for context {context_id}")
        
        # Apply quantum interference between entangled pathways
        self._apply_quantum_interference(context_pathways)
        
        # Update pathway evaluation counts
        for pathway in context_pathways:
            pathway.metadata['evaluationCount'] = pathway.metadata.get('evaluationCount', 0) + 1
        
        # Find the pathway with highest expected value (probability * utility)
        ranked_pathways = sorted(
            context_pathways,
            key=lambda p: p.probability * p.utility,
            reverse=True
        )
        
        best_pathway = ranked_pathways[0]
        confidence = best_pathway.probability * best_pathway.utility
        
        logger.info(f"Evaluated pathways for context {context_id}, best pathway: {best_pathway.id}")
        
        return {
            "pathway": best_pathway.to_dict(),
            "confidence": confidence
        }
    
    def _apply_quantum_interference(self, pathways: List[QuantumPathway]) -> None:
        """Apply quantum interference effects between entangled pathways"""
        # For each pathway, adjust probability based on entangled pathways
        for pathway in pathways:
            # Skip if no entanglements
            if not pathway.entangled_pathways:
                continue
            
            # Get entangled pathways
            entangled = [
                p for p in pathways
                if p.id in pathway.entangled_pathways
            ]
            
            if not entangled:
                continue
            
            # Calculate interference effect
            interference_factor = 0
            
            for other in entangled:
                # Constructive or destructive interference based on utility difference
                phase_diff = abs(pathway.utility - other.utility) * math.pi
                interference = math.cos(phase_diff)
                interference_factor += interference / len(entangled)
            
            # Apply interference to probability
            # Constructive interference increases probability, destructive decreases it
            pathway.probability = max(0.1, min(0.9, pathway.probability * (1 + 0.2 * interference_factor)))
    
    def get_alternative_pathways(self, context_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Get alternative pathways for a context"""
        # Get all pathways for this context
        context_pathways = [
            p for p in self.pathways.values()
            if p.metadata.get('contextId') == context_id
        ]
        
        if not context_pathways:
            return []
        
        # Rank by expected value
        ranked_pathways = sorted(
            context_pathways,
            key=lambda p: p.probability * p.utility,
            reverse=True
        )
        
        # Return alternatives (skip the best one)
        alternatives = ranked_pathways[1:limit+1] if len(ranked_pathways) > 1 else []
        return [p.to_dict() for p in alternatives]

# For testing
if __name__ == "__main__":
    # Create a quantum reasoning system
    qrs = QuantumReasoningSystem()
    qrs.initialize()
    
    # Create a decision context
    context = {
        "id": "test-context",
        "problem": "How to improve code quality",
        "objectives": ["Reduce bugs", "Improve maintainability"],
        "constraints": ["Limited time", "Must maintain backward compatibility"],
        "actions": ["Add unit tests", "Refactor legacy code", "Implement code reviews"]
    }
    
    # Generate pathways
    result = qrs.generate_pathways(context, 3)
    print(f"Generated {len(result['pathways'])} pathways")
    
    # Evaluate pathways
    evaluation = qrs.evaluate_pathways("test-context")
    print(f"Best pathway: {evaluation['pathway']['id']}")
    print(f"Confidence: {evaluation['confidence']}")
    
    # Get a quantum state
    state_id = evaluation['pathway']['states'][0]
    state = qrs.get_state(state_id)
    print(f"Quantum state: {state['id']}")
    
    # Collapse the state
    collapsed = qrs.collapse_state(state_id)
    print(f"Collapsed to: {collapsed['amplitudes']}")
