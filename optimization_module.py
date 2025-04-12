"""
Optimization Module for QUX-95 Neural-Cybernetic Framework
Provides Python-based optimization capabilities that integrate with the quantum reasoning bridge
"""

import os
import json
import time
import uuid
import numpy as np
import torch
from torch.optim import SGD, Adam, RMSprop, Adagrad
from torch.optim.lr_scheduler import CosineAnnealingLR, StepLR, ReduceLROnPlateau
from typing import Dict, List, Tuple, Callable, Optional, Union, Any

# Configure CUDA if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"PyTorch optimization module using device: {device}")

class OptimizationContext:
    """Context for optimization runs, tracking parameters, progress, and results"""
    
    def __init__(self, 
                 context_id: str, 
                 parameters: np.ndarray, 
                 config: Dict[str, Any]):
        self.id = context_id
        self.initial_parameters = np.array(parameters, dtype=np.float32)
        self.current_parameters = self.initial_parameters.copy()
        self.config = config
        self.steps = []
        self.loss_history = []
        self.gradient_history = []
        self.start_time = None
        self.end_time = None
        self.best_parameters = None
        self.best_loss = float('inf')
        self.termination_reason = None
        
    def to_tensor(self, array):
        """Convert numpy array to PyTorch tensor on the appropriate device"""
        return torch.tensor(array, dtype=torch.float32, device=device)
    
    def from_tensor(self, tensor):
        """Convert PyTorch tensor to numpy array"""
        return tensor.detach().cpu().numpy()
    
    def log_step(self, iteration: int, loss: float, parameters: np.ndarray, 
                gradient: Optional[np.ndarray] = None, extra_data: Dict = None):
        """Log a step in the optimization process"""
        step_data = {
            "iteration": iteration,
            "loss": float(loss),
            "parameters": parameters.tolist(),
            "timestamp": time.time()
        }
        
        if gradient is not None:
            step_data["gradient"] = gradient.tolist()
            step_data["gradient_norm"] = float(np.linalg.norm(gradient))
            
        if extra_data:
            step_data.update(extra_data)
            
        self.steps.append(step_data)
        self.loss_history.append(float(loss))
        
        # Update best result
        if loss < self.best_loss:
            self.best_loss = float(loss)
            self.best_parameters = parameters.copy()
            
    def start(self):
        """Mark the start of optimization"""
        self.start_time = time.time()
        
    def finish(self, reason: str):
        """Mark the end of optimization with termination reason"""
        self.end_time = time.time()
        self.termination_reason = reason
        
    def get_result(self) -> Dict[str, Any]:
        """Get the optimization result"""
        final_parameters = self.best_parameters if self.best_parameters is not None else self.current_parameters
        
        return {
            "id": self.id,
            "finalLoss": float(self.best_loss),
            "parameters": final_parameters.tolist(),
            "iterations": len(self.steps),
            "timeTaken": (self.end_time - self.start_time) * 1000 if self.end_time else 0,
            "terminationReason": self.termination_reason,
            "method": self.config.get("primary_method", "unknown")
        }
        
    def serialize(self) -> Dict:
        """Serialize context to dictionary"""
        return {
            "id": self.id,
            "initial_parameters": self.initial_parameters.tolist(),
            "current_parameters": self.current_parameters.tolist(),
            "config": self.config,
            "steps": self.steps,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "best_loss": float(self.best_loss) if self.best_loss != float('inf') else None,
            "best_parameters": self.best_parameters.tolist() if self.best_parameters is not None else None,
            "termination_reason": self.termination_reason
        }
        
    @classmethod
    def deserialize(cls, data: Dict) -> 'OptimizationContext':
        """Create context from serialized data"""
        context = cls(
            data["id"],
            np.array(data["initial_parameters"], dtype=np.float32),
            data["config"]
        )
        context.current_parameters = np.array(data["current_parameters"], dtype=np.float32)
        context.steps = data["steps"]
        context.start_time = data["start_time"]
        context.end_time = data["end_time"]
        context.best_loss = data["best_loss"] if data["best_loss"] is not None else float('inf')
        context.best_parameters = np.array(data["best_parameters"], dtype=np.float32) if data["best_parameters"] else None
        context.termination_reason = data["termination_reason"]
        
        if context.steps:
            context.loss_history = [step["loss"] for step in context.steps]
            
        return context


class ObjectiveWrapper:
    """Wrapper for objective functions to interface with PyTorch"""
    
    def __init__(self, objective_fn, objective_type="minimize"):
        self.objective_fn = objective_fn
        self.objective_type = objective_type
        self.sign = 1.0 if objective_type == "minimize" else -1.0
        
    def __call__(self, tensor_params):
        """Calculate loss and gradient for parameters"""
        # Make sure parameters require gradients
        if not tensor_params.requires_grad:
            tensor_params.requires_grad_(True)
            
        # Calculate objective
        np_params = tensor_params.detach().cpu().numpy()
        objective_result = self.objective_fn(np_params)
        
        if isinstance(objective_result, dict):
            # Get value from return value
            value = objective_result.get("value", 0.0)
            gradients = objective_result.get("gradients", None)
        elif isinstance(objective_result, tuple) and len(objective_result) == 2:
            # Assume (value, gradients) tuple format
            value, gradients = objective_result
        else:
            # Assume just a value is returned
            value = objective_result
            gradients = None
            
        # Convert to tensor
        loss = self.sign * torch.tensor(value, dtype=torch.float32, device=tensor_params.device)
        
        # If we have explicit gradients, use them
        if gradients is not None:
            grad_tensor = self.sign * torch.tensor(gradients, dtype=torch.float32, device=tensor_params.device)
            tensor_params.grad = grad_tensor
        else:
            # Otherwise use autograd
            loss.backward()
            
        return loss
    
    def numpy_evaluation(self, np_params):
        """Evaluate the function with numpy array (no gradients)"""
        objective_result = self.objective_fn(np_params)
        
        if isinstance(objective_result, dict):
            return {
                "value": self.sign * objective_result.get("value", 0.0),
                "gradients": self.sign * np.array(objective_result.get("gradients", [0] * len(np_params)))
            }
        elif isinstance(objective_result, tuple) and len(objective_result) == 2:
            value, gradients = objective_result
            return {
                "value": self.sign * value,
                "gradients": self.sign * np.array(gradients)
            }
        else:
            return {
                "value": self.sign * objective_result,
                "gradients": None
            }


# Create optimizers
def create_optimizer(method: str, parameters, config: Dict):
    """Create PyTorch optimizer based on specified method"""
    if not isinstance(parameters, torch.Tensor):
        parameters = torch.tensor(parameters, dtype=torch.float32, device=device, requires_grad=True)
        
    lr = config.get("initial_learning_rate", 0.01)
    
    if method == "sgd":
        momentum = config.get("momentum", 0.9)
        return SGD([parameters], lr=lr, momentum=momentum)
    elif method == "adam":
        beta1 = config.get("beta1", 0.9)
        beta2 = config.get("beta2", 0.999)
        eps = config.get("epsilon", 1e-8)
        return Adam([parameters], lr=lr, betas=(beta1, beta2), eps=eps)
    elif method == "rmsprop":
        alpha = config.get("alpha", 0.99)
        eps = config.get("epsilon", 1e-8)
        return RMSprop([parameters], lr=lr, alpha=alpha, eps=eps)
    elif method == "adagrad":
        eps = config.get("epsilon", 1e-10)
        return Adagrad([parameters], lr=lr, eps=eps)
    else:
        # Default to Adam
        print(f"Warning: Unknown optimizer {method}, defaulting to Adam")
        return Adam([parameters], lr=lr)


# Create learning rate scheduler
def create_scheduler(optimizer, config: Dict):
    """Create PyTorch learning rate scheduler"""
    scheduler_type = config.get("scheduler", "none")
    
    if scheduler_type == "cosine":
        max_iter = config.get("max_iterations", 1000)
        return CosineAnnealingLR(optimizer, T_max=max_iter)
    elif scheduler_type == "step":
        step_size = config.get("step_size", 30)
        gamma = config.get("gamma", 0.1)
        return StepLR(optimizer, step_size=step_size, gamma=gamma)
    elif scheduler_type == "plateau":
        factor = config.get("factor", 0.1)
        patience = config.get("patience", 10)
        return ReduceLROnPlateau(optimizer, mode='min', factor=factor, patience=patience)
    else:
        return None
