/**
 * Optimization System Test Suite
 * QUX-95 Neural-Cybernetic Framework
 * 
 * This test file demonstrates the various optimization methods and visualizes their performance
 * for comparison. It tests both first-order and second-order methods on standard test functions.
 */

import { optimizationSystem } from '../src/core/optimization/OptimizationSystem';
import { optimizationVisualizer } from '../src/core/visualization/OptimizationVisualizer';
import { optimizationBridge } from '../src/core/integration/OptimizationBridge';
import { BiomimeticRepairNetwork } from '../src/core/modules/biomimetic/BiomimeticRepairNetwork';
import { CognitiveOrchestrator } from '../src/core/orchestration/CognitiveOrchestrator';
import { OptimizationConfig, OptimizationResult } from '../src/core/optimization/types/OptimizationTypes';
import * as fs from 'fs';
import * as path from 'path';

// Initialize components
async function initializeTestEnvironment() {
  console.log('Initializing optimization test environment...');
  
  // Initialize optimization system
  await optimizationSystem.initialize();
  
  // Initialize visualization tools
  await optimizationVisualizer.initialize();
  
  // Initialize optimization bridge
  await optimizationBridge.initialize();
  
  console.log('Test environment initialized successfully');
}

// Standard test functions for optimization
const testFunctions = {
  /**
   * Quadratic function: f(x) = sum(x_i^2)
   * Minimum at x = [0, 0, ..., 0]
   */
  quadratic: (params: number[]) => {
    const value = params.reduce((sum, x) => sum + x * x, 0);
    const gradients = params.map(x => 2 * x);
    return { value, gradients };
  },
  
  /**
   * Rosenbrock function: f(x) = sum_{i=1}^{n-1} [100(x_{i+1} - x_i^2)^2 + (1 - x_i)^2]
   * Minimum at x = [1, 1, ..., 1]
   */
  rosenbrock: (params: number[]) => {
    let value = 0;
    const gradients = new Array(params.length).fill(0);
    
    for (let i = 0; i < params.length - 1; i++) {
      const term1 = 100 * Math.pow(params[i+1] - params[i] * params[i], 2);
      const term2 = Math.pow(1 - params[i], 2);
      value += term1 + term2;
      
      // Gradients
      gradients[i] += -400 * params[i] * (params[i+1] - params[i] * params[i]) - 2 * (1 - params[i]);
      gradients[i+1] += 200 * (params[i+1] - params[i] * params[i]);
    }
    
    return { value, gradients };
  },
  
  /**
   * Rastrigin function: f(x) = 10n + sum_{i=1}^n [x_i^2 - 10 * cos(2πx_i)]
   * Minimum at x = [0, 0, ..., 0]
   */
  rastrigin: (params: number[]) => {
    const n = params.length;
    let value = 10 * n;
    const gradients = new Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      value += params[i] * params[i] - 10 * Math.cos(2 * Math.PI * params[i]);
      gradients[i] = 2 * params[i] + 10 * 2 * Math.PI * Math.sin(2 * Math.PI * params[i]);
    }
    
    return { value, gradients };
  }
};

// Test first-order optimization methods
async function testFirstOrderMethods() {
  console.log('\n--- Testing First-Order Optimization Methods ---');
  
  const dimension = 5;
  const initialParameters = Array(dimension).fill(0).map(() => Math.random() * 2 - 1);
  const methods = ['sgd', 'adam', 'rmsprop', 'adagrad', 'adamw'];
  const results: OptimizationResult[] = [];
  
  // Create a visualization for comparing convergence
  const comparisonVizId = optimizationVisualizer.createComparisonVisualization(
    [], // We'll add results later
    'First-Order Methods Comparison',
    { width: 1000, height: 600 }
  );
  
  // Run each method
  for (const method of methods) {
    console.log(`\nOptimizing with ${method}...`);
    
    // Create optimization config
    const config: OptimizationConfig = {
      primaryMethod: method,
      objectiveType: 'minimize',
      objectiveFunction: testFunctions.rosenbrock,
      initialParameters: [...initialParameters], // Clone to ensure fair comparison
      maxIterations: 1000,
      tolerance: 1e-6,
      initialLearningRate: 0.01,
      beta1: 0.9,
      beta2: 0.999,
      epsilon: 1e-8
    };
    
    // Create visualization for this method
    const vizId = optimizationVisualizer.createProgressVisualization(
      method,
      `${method.toUpperCase()} Convergence`,
      { realTime: true, updateInterval: 100 }
    );
    
    // Create optimization context
    const contextId = optimizationSystem.createOptimizationContext(config);
    
    // Set up progress tracking
    optimizationSystem.on('optimizationProgress', (id, progress) => {
      if (id === contextId) {
        optimizationVisualizer.updateVisualization(vizId, {
          y: progress.currentLoss
        });
      }
    });
    
    // Run optimization
    const result = await optimizationSystem.startOptimization(contextId);
    results.push(result);
    
    console.log(`${method} completed in ${result.iterations} iterations`);
    console.log(`Final loss: ${result.finalLoss}`);
    console.log(`Final parameters: [${result.parameters.map(p => p.toFixed(4)).join(', ')}]`);
    
    // Create convergence plot for this method
    const context = optimizationSystem.getOptimizationContext(contextId);
    optimizationVisualizer.createConvergencePlot(context, `${method.toUpperCase()} Convergence`);
    
    // Stop real-time updates
    optimizationVisualizer.stopRealTimeUpdates(vizId);
  }
  
  // Update comparison visualization with all results
  optimizationVisualizer.createComparisonVisualization(
    results,
    'First-Order Methods Comparison',
    { width: 1000, height: 600 }
  );
  
  return results;
}

// Test second-order optimization methods
async function testSecondOrderMethods() {
  console.log('\n--- Testing Second-Order Optimization Methods ---');
  
  const dimension = 5;
  const initialParameters = Array(dimension).fill(0).map(() => Math.random() * 2 - 1);
  const methods = ['bfgs', 'lbfgs', 'cg'];
  const results: OptimizationResult[] = [];
  
  // Run each method
  for (const method of methods) {
    console.log(`\nOptimizing with ${method}...`);
    
    // Create optimization config
    const config: OptimizationConfig = {
      primaryMethod: method,
      objectiveType: 'minimize',
      objectiveFunction: testFunctions.quadratic,
      initialParameters: [...initialParameters], // Clone to ensure fair comparison
      maxIterations: 50, // Second-order methods typically need fewer iterations
      tolerance: 1e-6,
      initialLearningRate: 1.0 // Used as step size in line search
    };
    
    // Create visualization for this method
    const vizId = optimizationVisualizer.createProgressVisualization(
      method,
      `${method.toUpperCase()} Convergence`,
      { realTime: true, updateInterval: 100 }
    );
    
    // Create optimization context
    const contextId = optimizationSystem.createOptimizationContext(config);
    
    // Set up progress tracking
    optimizationSystem.on('optimizationProgress', (id, progress) => {
      if (id === contextId) {
        optimizationVisualizer.updateVisualization(vizId, {
          y: progress.currentLoss
        });
      }
    });
    
    // Run optimization
    const result = await optimizationSystem.startOptimization(contextId);
    results.push(result);
    
    console.log(`${method} completed in ${result.iterations} iterations`);
    console.log(`Final loss: ${result.finalLoss}`);
    console.log(`Final parameters: [${result.parameters.map(p => p.toFixed(4)).join(', ')}]`);
    
    // Stop real-time updates
    optimizationVisualizer.stopRealTimeUpdates(vizId);
  }
  
  // Create comparison visualization
  optimizationVisualizer.createComparisonVisualization(
    results,
    'Second-Order Methods Comparison',
    { width: 1000, height: 600 }
  );
  
  return results;
}

// Test hybrid optimization strategies
async function testHybridStrategies() {
  console.log('\n--- Testing Hybrid Optimization Strategies ---');
  
  const dimension = 10;
  const initialParameters = Array(dimension).fill(0).map(() => Math.random() * 2 - 1);
  
  // Create a standard optimization config for comparison
  const standardConfig: OptimizationConfig = {
    primaryMethod: 'adam',
    objectiveType: 'minimize',
    objectiveFunction: testFunctions.rastrigin,
    initialParameters: [...initialParameters],
    maxIterations: 1000,
    tolerance: 1e-6,
    initialLearningRate: 0.01
  };
  
  // Create a hybrid optimization config
  const hybridConfig: OptimizationConfig = {
    primaryMethod: 'adam',
    secondaryMethods: ['lbfgs'],
    isHybrid: true,
    objectiveType: 'minimize',
    objectiveFunction: testFunctions.rastrigin,
    initialParameters: [...initialParameters],
    maxIterations: 1000,
    tolerance: 1e-6,
    initialLearningRate: 0.01,
    hybridConfig: {
      switchThreshold: 0.1, // Switch methods when progress slows down
      methodWeights: {
        adam: 0.7,
        lbfgs: 0.3
      }
    }
  };
  
  // Create standard optimization context
  const standardContextId = optimizationSystem.createOptimizationContext(standardConfig);
  
  // Create hybrid optimization context
  const hybridContextId = optimizationSystem.createOptimizationContext(hybridConfig);
  
  // Apply hybrid strategy
  optimizationBridge.createHybridStrategy(
    hybridContextId,
    'adam',
    ['lbfgs'],
    testFunctions.rastrigin,
    [...initialParameters],
    { learningRateScheduler: 'cosine' }
  );
  
  // Create visualizations
  const standardVizId = optimizationVisualizer.createProgressVisualization(
    'standard',
    'Standard Adam Optimization',
    { realTime: true }
  );
  
  const hybridVizId = optimizationVisualizer.createProgressVisualization(
    'hybrid',
    'Hybrid Adam+L-BFGS Optimization',
    { realTime: true }
  );
  
  // Set up progress tracking
  optimizationSystem.on('optimizationProgress', (id, progress) => {
    if (id === standardContextId) {
      optimizationVisualizer.updateVisualization(standardVizId, {
        y: progress.currentLoss
      });
    } else if (id === hybridContextId) {
      optimizationVisualizer.updateVisualization(hybridVizId, {
        y: progress.currentLoss
      });
    }
  });
  
  // Run optimizations in parallel
  console.log('Running standard and hybrid optimizations in parallel...');
  const [standardResult, hybridResult] = await Promise.all([
    optimizationSystem.startOptimization(standardContextId),
    optimizationSystem.startOptimization(hybridContextId)
  ]);
  
  // Stop real-time updates
  optimizationVisualizer.stopRealTimeUpdates(standardVizId);
  optimizationVisualizer.stopRealTimeUpdates(hybridVizId);
  
  // Compare results
  console.log('\nStandard Optimization:');
  console.log(`Completed in ${standardResult.iterations} iterations`);
  console.log(`Final loss: ${standardResult.finalLoss}`);
  
  console.log('\nHybrid Optimization:');
  console.log(`Completed in ${hybridResult.iterations} iterations`);
  console.log(`Final loss: ${hybridResult.finalLoss}`);
  
  // Create comparison visualization
  optimizationVisualizer.createComparisonVisualization(
    [standardResult, hybridResult],
    'Standard vs Hybrid Optimization',
    { width: 1000, height: 600 }
  );
  
  return { standard: standardResult, hybrid: hybridResult };
}

// Test optimization integration with BiomimeticRepairNetwork
async function testRepairNetworkOptimization() {
  console.log('\n--- Testing BiomimeticRepairNetwork Optimization ---');
  
  // Create a repair network instance
  const repairNetwork = new BiomimeticRepairNetwork();
  await repairNetwork.onLoad();
  
  // Simulate some anomalies
  const anomalyTypes = ['error', 'warning', 'smell', 'vulnerability', 'performance'];
  const anomalyCount = 20;
  
  console.log(`Generating ${anomalyCount} random anomalies...`);
  
  for (let i = 0; i < anomalyCount; i++) {
    const anomalyType = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
    const severity = Math.floor(Math.random() * 10) + 1;
    
    repairNetwork.detectAnomaly({
      type: anomalyType as any,
      severity,
      location: {
        file: `src/test/sample-${i}.ts`,
        lineStart: Math.floor(Math.random() * 100),
        lineEnd: Math.floor(Math.random() * 100) + 100,
        columnStart: 0,
        columnEnd: 80
      },
      message: `Sample ${anomalyType} anomaly #${i}`,
      metadata: {
        testCase: true,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Get repair statistics before optimization
  const beforeStats = repairNetwork.getRepairStatistics();
  console.log('\nRepair Statistics Before Optimization:');
  console.log(`Total anomalies: ${beforeStats.anomalies.detected}`);
  console.log(`Resolved anomalies: ${beforeStats.anomalies.resolved}`);
  console.log(`Success rate: ${(beforeStats.repairs.successful / beforeStats.repairs.total * 100).toFixed(2)}%`);
  
  // Trigger self-optimization
  console.log('\nTriggering self-optimization...');
  
  // Wait for optimization to complete (simulate by waiting)
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get repair statistics after optimization
  const afterStats = repairNetwork.getRepairStatistics();
  console.log('\nRepair Statistics After Optimization:');
  console.log(`Total anomalies: ${afterStats.anomalies.detected}`);
  console.log(`Resolved anomalies: ${afterStats.anomalies.resolved}`);
  console.log(`Success rate: ${(afterStats.repairs.successful / afterStats.repairs.total * 100).toFixed(2)}%`);
  
  // Create visualization of before/after comparison
  const datasets = [
    {
      label: 'Before Optimization',
      data: [
        beforeStats.repairs.successful / beforeStats.repairs.total * 100,
        beforeStats.anomalies.resolved / beforeStats.anomalies.detected * 100,
        100 - (beforeStats.selfLearning.learningRate * 100)
      ]
    },
    {
      label: 'After Optimization',
      data: [
        afterStats.repairs.successful / afterStats.repairs.total * 100,
        afterStats.anomalies.resolved / afterStats.anomalies.detected * 100,
        100 - (afterStats.selfLearning.learningRate * 100)
      ]
    }
  ];
  
  // Create visualization for repair network optimization
  optimizationVisualizer.createConvergencePlot(
    optimizationSystem.getOptimizationContext(afterStats.selfLearning.contextId),
    'BiomimeticRepairNetwork Optimization',
    { width: 1000, height: 600 }
  );
  
  return { before: beforeStats, after: afterStats };
}

// Export visualizations to HTML files
function exportVisualizations() {
  console.log('\n--- Exporting Visualizations ---');
  
  const visualizations = optimizationVisualizer.getAllVisualizations();
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, 'visualization-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Export each visualization
  for (const viz of visualizations) {
    const html = optimizationVisualizer.generateHtmlVisualization(viz.id);
    const filePath = path.join(outputDir, `${viz.id}.html`);
    
    fs.writeFileSync(filePath, html);
    console.log(`Exported visualization to ${filePath}`);
  }
  
  console.log(`All visualizations exported to ${outputDir}`);
}

// Main test function
async function runOptimizationTests() {
  try {
    // Initialize test environment
    await initializeTestEnvironment();
    
    // Run tests
    const firstOrderResults = await testFirstOrderMethods();
    const secondOrderResults = await testSecondOrderMethods();
    const hybridResults = await testHybridStrategies();
    const repairNetworkResults = await testRepairNetworkOptimization();
    
    // Export visualizations
    exportVisualizations();
    
    console.log('\n--- All Optimization Tests Completed Successfully ---');
    
    return {
      firstOrderResults,
      secondOrderResults,
      hybridResults,
      repairNetworkResults
    };
  } catch (error) {
    console.error('Error running optimization tests:', error);
    throw error;
  }
}

// Run the tests
runOptimizationTests()
  .then(() => {
    console.log('Tests completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });
