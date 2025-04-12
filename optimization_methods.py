"""
Optimization Methods for QUX-95 Neural-Cybernetic Framework
Implements various optimization algorithms for the Python backend
"""

import numpy as np
import torch
from typing import Dict, List, Tuple, Callable, Optional, Union, Any
from optimization_module import OptimizationContext, ObjectiveWrapper, device

# First-Order Methods
class FirstOrderOptimizer:
    """Implementation of first-order optimization methods"""
    
    @staticmethod
    def gradient_descent(context: OptimizationContext, wrapper: ObjectiveWrapper) -> Dict:
        """Simple gradient descent implementation"""
        config = context.config
        max_iter = config.get("max_iterations", 1000)
        lr = config.get("initial_learning_rate", 0.01)
        tol = config.get("tolerance", 1e-6)
        
        # Initialize parameters as tensor
        params = torch.tensor(context.current_parameters, requires_grad=True, 
                             dtype=torch.float32, device=device)
        
        context.start()
        
        for i in range(max_iter):
            # Reset gradients
            if params.grad is not None:
                params.grad.zero_()
                
            # Forward and backward pass
            loss = wrapper(params)
            
            # Get numpy versions for logging
            np_params = params.detach().cpu().numpy()
            np_grad = params.grad.detach().cpu().numpy() if params.grad is not None else None
            
            # Log step
            context.log_step(i, loss.item(), np_params, np_grad)
            
            # Check convergence
            if i > 0 and abs(context.loss_history[-1] - context.loss_history[-2]) < tol:
                context.finish("converged")
                context.current_parameters = np_params
                return context.get_result()
                
            # Update parameters
            with torch.no_grad():
                params -= lr * params.grad
                
        # Update context and return result
        context.finish("max_iterations")
        context.current_parameters = params.detach().cpu().numpy()
        return context.get_result()
    
    @staticmethod
    def adam(context: OptimizationContext, wrapper: ObjectiveWrapper) -> Dict:
        """Adam optimizer implementation"""
        config = context.config
        max_iter = config.get("max_iterations", 1000)
        lr = config.get("initial_learning_rate", 0.001)
        beta1 = config.get("beta1", 0.9)
        beta2 = config.get("beta2", 0.999)
        eps = config.get("epsilon", 1e-8)
        tol = config.get("tolerance", 1e-6)
        
        # Initialize parameters as tensor
        params = torch.tensor(context.current_parameters, requires_grad=True, 
                             dtype=torch.float32, device=device)
        
        # Initialize moment estimates
        m = torch.zeros_like(params)
        v = torch.zeros_like(params)
        
        context.start()
        
        for i in range(max_iter):
            # Reset gradients
            if params.grad is not None:
                params.grad.zero_()
                
            # Forward and backward pass
            loss = wrapper(params)
            
            # Get numpy versions for logging
            np_params = params.detach().cpu().numpy()
            np_grad = params.grad.detach().cpu().numpy() if params.grad is not None else None
            
            # Log step with extra Adam data
            extra_data = {
                "m_norm": float(torch.norm(m).item()),
                "v_norm": float(torch.norm(v).item())
            }
            context.log_step(i, loss.item(), np_params, np_grad, extra_data)
            
            # Check convergence
            if i > 0 and abs(context.loss_history[-1] - context.loss_history[-2]) < tol:
                context.finish("converged")
                context.current_parameters = np_params
                return context.get_result()
                
            # Update moment estimates
            with torch.no_grad():
                m = beta1 * m + (1 - beta1) * params.grad
                v = beta2 * v + (1 - beta2) * (params.grad ** 2)
                
                # Bias correction
                m_hat = m / (1 - beta1 ** (i + 1))
                v_hat = v / (1 - beta2 ** (i + 1))
                
                # Update parameters
                params -= lr * m_hat / (torch.sqrt(v_hat) + eps)
                
        # Update context and return result
        context.finish("max_iterations")
        context.current_parameters = params.detach().cpu().numpy()
        return context.get_result()


# Second-Order Methods
class SecondOrderOptimizer:
    """Implementation of second-order optimization methods"""
    
    @staticmethod
    def bfgs(context: OptimizationContext, wrapper: ObjectiveWrapper) -> Dict:
        """BFGS quasi-Newton method implementation"""
        config = context.config
        max_iter = config.get("max_iterations", 100)
        tol = config.get("tolerance", 1e-6)
        
        # Get initial parameters
        x = context.current_parameters.copy()
        n = len(x)
        
        # Initialize inverse Hessian approximation to identity
        H = np.eye(n)
        
        # Get initial gradient
        result = wrapper.numpy_evaluation(x)
        f_old = result["value"]
        g_old = result["gradients"]
        
        context.start()
        context.log_step(0, f_old, x, g_old)
        
        for i in range(1, max_iter + 1):
            # Compute search direction
            p = -np.dot(H, g_old)
            
            # Line search (simplified)
            alpha = 1.0
            c1 = 1e-4
            c2 = 0.9
            
            # Backtracking line search
            while True:
                x_new = x + alpha * p
                result_new = wrapper.numpy_evaluation(x_new)
                f_new = result_new["value"]
                
                # Armijo condition
                if f_new <= f_old + c1 * alpha * np.dot(g_old, p):
                    break
                
                # Reduce step size
                alpha *= 0.5
                
                # Safety check for too small step
                if alpha < 1e-10:
                    break
            
            # Update position
            x_new = x + alpha * p
            result_new = wrapper.numpy_evaluation(x_new)
            f_new = result_new["value"]
            g_new = result_new["gradients"]
            
            # Compute difference vectors
            s = x_new - x
            y = g_new - g_old
            
            # Skip BFGS update if y's not sufficiently positive definite
            ys = np.dot(y, s)
            if ys > 1e-10:
                # BFGS update
                rho = 1.0 / ys
                Hy = np.dot(H, y)
                
                term1 = np.outer(s, s) * ((rho + np.dot(y, Hy) * rho**2)) / rho
                term2 = -rho * (np.outer(Hy, s) + np.outer(s, Hy))
                
                H = H + term1 + term2
            
            # Log step
            context.log_step(i, f_new, x_new, g_new, {"alpha": alpha})
            
            # Check for convergence
            if np.linalg.norm(g_new) < tol:
                context.finish("converged")
                context.current_parameters = x_new
                return context.get_result()
                
            # Check for small improvement
            if i > 0 and abs(f_new - f_old) < tol:
                context.finish("small_improvement")
                context.current_parameters = x_new
                return context.get_result()
                
            # Update for next iteration
            x = x_new
            f_old = f_new
            g_old = g_new
            
        # Max iterations reached
        context.finish("max_iterations")
        context.current_parameters = x
        return context.get_result()
    
    @staticmethod
    def newton_cg(context: OptimizationContext, wrapper: ObjectiveWrapper) -> Dict:
        """Newton-CG method (truncated Newton with conjugate gradient)"""
        # This would require Hessian or Hessian-vector products
        # For now, we'll implement a simpler conjugate gradient method
        
        config = context.config
        max_iter = config.get("max_iterations", 100)
        tol = config.get("tolerance", 1e-6)
        
        # Get initial parameters
        x = context.current_parameters.copy()
        
        context.start()
        
        for i in range(max_iter):
            # Evaluate function and gradient
            result = wrapper.numpy_evaluation(x)
            f = result["value"]
            g = result["gradients"]
            
            # Log step
            context.log_step(i, f, x, g)
            
            # Check convergence
            if np.linalg.norm(g) < tol:
                context.finish("converged")
                context.current_parameters = x
                return context.get_result()
                
            # Use conjugate gradient direction
            if i == 0:
                d = -g
                beta = 0
            else:
                beta = max(0, np.dot(g, g - g_old) / np.dot(g_old, g_old))
                d = -g + beta * d
            
            # Line search (simplified)
            alpha = 1.0
            
            # Backtracking line search with Armijo condition
            while True:
                x_new = x + alpha * d
                f_new = wrapper.numpy_evaluation(x_new)["value"]
                
                if f_new <= f - 1e-4 * alpha * np.dot(g, d):
                    break
                    
                alpha *= 0.5
                if alpha < 1e-10:
                    break
            
            # Update position
            x_new = x + alpha * d
            
            # Check for small improvement
            result_new = wrapper.numpy_evaluation(x_new)
            f_new = result_new["value"]
            
            if abs(f_new - f) < tol:
                context.finish("small_improvement")
                context.current_parameters = x_new
                return context.get_result()
                
            # Save old gradient for next iteration
            g_old = g
            
            # Update position
            x = x_new
            
        # Max iterations reached
        context.finish("max_iterations")
        context.current_parameters = x
        return context.get_result()


# Population-Based Methods 
class PopulationOptimizer:
    """Implementation of population-based optimization methods"""
    
    @staticmethod
    def genetic_algorithm(context: OptimizationContext, wrapper: ObjectiveWrapper) -> Dict:
        """Genetic algorithm implementation"""
        config = context.config
        max_iter = config.get("max_iterations", 100)
        pop_size = config.get("population_size", 50)
        mutation_rate = config.get("mutation_rate", 0.1)
        crossover_rate = config.get("crossover_rate", 0.8)
        selection_pressure = config.get("selection_pressure", 2.0)
        
        # Initialize population
        n_params = len(context.current_parameters)
        lb = config.get("lower_bound", -10.0)
        ub = config.get("upper_bound", 10.0)
        
        # Create initial population
        population = np.random.uniform(lb, ub, (pop_size, n_params))
        
        # Make sure the initial parameters are in the population
        population[0] = context.current_parameters.copy()
        
        # Fitness function (lower is better for minimization)
        def fitness(individual):
            result = wrapper.numpy_evaluation(individual)
            return -result["value"]  # Negative because higher fitness is better
            
        context.start()
        
        for generation in range(max_iter):
            # Evaluate population fitness
            fitness_values = np.array([fitness(ind) for ind in population])
            
            # Find best individual
            best_idx = np.argmax(fitness_values)
            best_individual = population[best_idx].copy()
            best_fitness = fitness_values[best_idx]
            
            # Log progress
            context.log_step(
                generation, 
                -best_fitness,  # Convert back to loss
                best_individual,
                None,
                {"population_diversity": float(np.std(fitness_values))}
            )
            
            # Check convergence
            if generation > 0:
                prev_best = -context.loss_history[-2]
                if abs(best_fitness - prev_best) < config.get("tolerance", 1e-6):
                    context.finish("converged")
                    context.current_parameters = best_individual
                    return context.get_result()
            
            # Selection (tournament selection)
            next_population = []
            
            for _ in range(pop_size):
                # Tournament selection
                tournament_size = int(pop_size / selection_pressure)
                tournament_idx = np.random.choice(pop_size, tournament_size, replace=False)
                tournament_fitness = fitness_values[tournament_idx]
                winner_idx = tournament_idx[np.argmax(tournament_fitness)]
                
                next_population.append(population[winner_idx].copy())
                
            # Crossover
            for i in range(0, pop_size, 2):
                if i + 1 < pop_size and np.random.random() < crossover_rate:
                    # Simple arithmetic crossover
                    alpha = np.random.random()
                    child1 = alpha * next_population[i] + (1 - alpha) * next_population[i+1]
                    child2 = (1 - alpha) * next_population[i] + alpha * next_population[i+1]
                    
                    next_population[i] = child1
                    next_population[i+1] = child2
                    
            # Mutation
            for i in range(pop_size):
                if np.random.random() < mutation_rate:
                    # Gaussian mutation
                    mutation = np.random.normal(0, 0.1, n_params)
                    next_population[i] += mutation
                    
                    # Ensure bounds
                    next_population[i] = np.clip(next_population[i], lb, ub)
                    
            # Elitism: keep the best individual
            next_population[0] = best_individual
            
            # Update population
            population = np.array(next_population)
            
        # Max iterations reached
        context.finish("max_iterations")
        context.current_parameters = best_individual
        return context.get_result()
    
    @staticmethod
    def particle_swarm(context: OptimizationContext, wrapper: ObjectiveWrapper) -> Dict:
        """Particle Swarm Optimization implementation"""
        config = context.config
        max_iter = config.get("max_iterations", 100)
        pop_size = config.get("swarm_size", 30)
        w = config.get("inertia_weight", 0.7)
        c1 = config.get("cognitive_coef", 1.5)
        c2 = config.get("social_coef", 1.5)
        
        # Initialize particles
        n_params = len(context.current_parameters)
        lb = config.get("lower_bound", -10.0)
        ub = config.get("upper_bound", 10.0)
        
        # Positions and velocities
        positions = np.random.uniform(lb, ub, (pop_size, n_params))
        velocities = np.random.uniform(-1, 1, (pop_size, n_params))
        
        # Set first particle to initial parameters
        positions[0] = context.current_parameters.copy()
        
        # Personal and global best
        personal_best_pos = positions.copy()
        personal_best_val = np.array([wrapper.numpy_evaluation(p)["value"] for p in positions])
        
        global_best_idx = np.argmin(personal_best_val)
        global_best_pos = positions[global_best_idx].copy()
        global_best_val = personal_best_val[global_best_idx]
        
        context.start()
        
        for iteration in range(max_iter):
            # Log progress
            context.log_step(
                iteration,
                global_best_val,
                global_best_pos,
                None,
                {"swarm_diversity": float(np.std(personal_best_val))}
            )
            
            # Check convergence
            if iteration > 0:
                if abs(global_best_val - context.loss_history[-2]) < config.get("tolerance", 1e-6):
                    context.finish("converged")
                    context.current_parameters = global_best_pos
                    return context.get_result()
            
            # Update velocities and positions
            for i in range(pop_size):
                # Update velocity
                r1, r2 = np.random.random(2)
                cognitive = c1 * r1 * (personal_best_pos[i] - positions[i])
                social = c2 * r2 * (global_best_pos - positions[i])
                
                velocities[i] = w * velocities[i] + cognitive + social
                
                # Velocity clamping (optional)
                max_velocity = 0.1 * (ub - lb)
                velocities[i] = np.clip(velocities[i], -max_velocity, max_velocity)
                
                # Update position
                positions[i] += velocities[i]
                positions[i] = np.clip(positions[i], lb, ub)
                
                # Evaluate new position
                val = wrapper.numpy_evaluation(positions[i])["value"]
                
                # Update personal best
                if val < personal_best_val[i]:
                    personal_best_pos[i] = positions[i].copy()
                    personal_best_val[i] = val
                    
                    # Update global best
                    if val < global_best_val:
                        global_best_pos = positions[i].copy()
                        global_best_val = val
        
        # Max iterations reached
        context.finish("max_iterations")
        context.current_parameters = global_best_pos
        return context.get_result()


# Metaheuristic Methods
class MetaheuristicOptimizer:
    """Implementation of metaheuristic optimization methods"""
    
    @staticmethod
    def simulated_annealing(context: OptimizationContext, wrapper: ObjectiveWrapper) -> Dict:
        """Simulated Annealing implementation"""
        config = context.config
        max_iter = config.get("max_iterations", 1000)
        initial_temp = config.get("initial_temperature", 1.0)
        cooling_rate = config.get("cooling_rate", 0.95)
        
        # Get initial solution
        current_solution = context.current_parameters.copy()
        current_value = wrapper.numpy_evaluation(current_solution)["value"]
        
        # Best solution found so far
        best_solution = current_solution.copy()
        best_value = current_value
        
        # Initialize temperature
        temp = initial_temp
        
        context.start()
        context.log_step(0, current_value, current_solution, None, {"temperature": temp})
        
        for iteration in range(1, max_iter + 1):
            # Generate neighbor
            neighbor = current_solution + np.random.normal(0, 0.1, len(current_solution))
            
            # Evaluate neighbor
            neighbor_value = wrapper.numpy_evaluation(neighbor)["value"]
            
            # Decide whether to accept neighbor
            delta = neighbor_value - current_value
            
            # For minimization, accept if better or with probability exp(-delta/temp)
            if delta < 0 or np.random.random() < np.exp(-delta / temp):
                current_solution = neighbor.copy()
                current_value = neighbor_value
                
                # Update best if needed
                if current_value < best_value:
                    best_solution = current_solution.copy()
                    best_value = current_value
            
            # Log progress
            context.log_step(
                iteration,
                best_value,
                best_solution,
                None,
                {"temperature": temp, "acceptance_rate": 1.0 if delta < 0 else np.exp(-delta / temp)}
            )
            
            # Check convergence
            if iteration > 1:
                if abs(context.loss_history[-1] - context.loss_history[-2]) < config.get("tolerance", 1e-6):
                    context.finish("converged")
                    context.current_parameters = best_solution
                    return context.get_result()
            
            # Cool down temperature
            temp *= cooling_rate
            
            # If temperature is very low, consider converged
            if temp < 1e-6:
                context.finish("cooled")
                context.current_parameters = best_solution
                return context.get_result()
        
        # Max iterations reached
        context.finish("max_iterations")
        context.current_parameters = best_solution
        return context.get_result()


# Method registry
OPTIMIZATION_METHODS = {
    # First-order methods
    "sgd": FirstOrderOptimizer.gradient_descent,
    "adam": FirstOrderOptimizer.adam,
    
    # Second-order methods
    "bfgs": SecondOrderOptimizer.bfgs,
    "newton_cg": SecondOrderOptimizer.newton_cg,
    
    # Population-based methods
    "genetic": PopulationOptimizer.genetic_algorithm,
    "pso": PopulationOptimizer.particle_swarm,
    
    # Metaheuristic methods
    "sa": MetaheuristicOptimizer.simulated_annealing
}

def get_optimization_method(method_name):
    """Get optimization method by name"""
    return OPTIMIZATION_METHODS.get(method_name.lower(), FirstOrderOptimizer.adam)
