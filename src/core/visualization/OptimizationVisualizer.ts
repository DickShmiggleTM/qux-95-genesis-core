/**
 * OptimizationVisualizer.ts
 * Visualization tools for optimization progress and results
 * Part of the QUX-95 Neural-Cybernetic Framework
 */

import { EventEmitter } from 'events';
import { Logger } from '../../utils/Logger';
import { OptimizationContext, OptimizationResult } from '../optimization/types/OptimizationTypes';

// Visualization data types
interface DataSeries {
  label: string;
  data: number[];
  color?: string;
}

interface VisualizationData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'scatter' | 'heatmap';
  xAxis?: {
    label: string;
    data?: number[] | string[];
  };
  yAxis?: {
    label: string;
    min?: number;
    max?: number;
  };
  series: DataSeries[];
  timestamp: Date;
}

interface VisualizationOptions {
  width?: number;
  height?: number;
  animated?: boolean;
  theme?: 'light' | 'dark' | 'neural';
  realTime?: boolean;
  updateInterval?: number;
}

/**
 * OptimizationVisualizer provides tools for visualizing optimization progress and results
 */
export class OptimizationVisualizer extends EventEmitter {
  private static instance: OptimizationVisualizer;
  private logger: Logger;
  private isInitialized: boolean = false;
  private visualizations: Map<string, VisualizationData> = new Map();
  private activeStreams: Map<string, NodeJS.Timeout> = new Map();
  
  // Default visualization options
  private defaultOptions: VisualizationOptions = {
    width: 800,
    height: 500,
    animated: true,
    theme: 'neural',
    realTime: false,
    updateInterval: 1000 // ms
  };
  
  private constructor() {
    super();
    this.logger = new Logger('OptimizationVisualizer');
  }
  
  /**
   * Get the singleton instance of the OptimizationVisualizer
   */
  public static getInstance(): OptimizationVisualizer {
    if (!OptimizationVisualizer.instance) {
      OptimizationVisualizer.instance = new OptimizationVisualizer();
    }
    return OptimizationVisualizer.instance;
  }
  
  /**
   * Initialize the visualization system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('OptimizationVisualizer already initialized');
      return;
    }
    
    this.logger.info('Initializing OptimizationVisualizer...');
    
    // Setup event listeners for the visualization system
    this.setupEventListeners();
    
    this.isInitialized = true;
    this.emit('initialized');
    this.logger.info('OptimizationVisualizer initialized successfully');
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Add any necessary event listeners
  }
  
  /**
   * Create a visualization for optimization progress
   */
  public createProgressVisualization(
    contextId: string,
    title: string,
    options: VisualizationOptions = {}
  ): string {
    const vizId = `progress-${contextId}`;
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Create initial visualization data
    const vizData: VisualizationData = {
      id: vizId,
      title: title || `Optimization Progress for ${contextId}`,
      type: 'line',
      xAxis: {
        label: 'Iterations',
        data: []
      },
      yAxis: {
        label: 'Loss Value',
        min: 0
      },
      series: [
        {
          label: 'Loss',
          data: [],
          color: '#ff4500' // Red-orange
        }
      ],
      timestamp: new Date()
    };
    
    // Store the visualization
    this.visualizations.set(vizId, vizData);
    
    // If real-time updates are requested, start a streaming update
    if (mergedOptions.realTime) {
      this.startRealTimeUpdates(contextId, vizId, mergedOptions.updateInterval);
    }
    
    this.logger.debug(`Created progress visualization: ${vizId}`);
    return vizId;
  }
  
  /**
   * Start real-time updates for a visualization
   */
  private startRealTimeUpdates(
    contextId: string,
    vizId: string,
    interval: number = 1000
  ): void {
    // Stop existing stream if any
    this.stopRealTimeUpdates(vizId);
    
    // Create update interval
    const updateTimer = setInterval(() => {
      this.emit('visualization_update_request', {
        contextId,
        vizId
      });
    }, interval);
    
    // Store the timer
    this.activeStreams.set(vizId, updateTimer);
  }
  
  /**
   * Stop real-time updates for a visualization
   */
  public stopRealTimeUpdates(vizId: string): void {
    if (this.activeStreams.has(vizId)) {
      clearInterval(this.activeStreams.get(vizId));
      this.activeStreams.delete(vizId);
    }
  }
  
  /**
   * Update a visualization with new data
   */
  public updateVisualization(
    vizId: string,
    newData: { x?: number | string, y: number, seriesIndex?: number }
  ): void {
    if (!this.visualizations.has(vizId)) {
      this.logger.warn(`Visualization not found: ${vizId}`);
      return;
    }
    
    const vizData = this.visualizations.get(vizId);
    const seriesIndex = newData.seriesIndex || 0;
    
    if (seriesIndex >= vizData.series.length) {
      this.logger.warn(`Series index out of bounds: ${seriesIndex}`);
      return;
    }
    
    // Add new Y data point
    vizData.series[seriesIndex].data.push(newData.y);
    
    // Add new X data point if provided
    if (newData.x !== undefined && vizData.xAxis && vizData.xAxis.data) {
      vizData.xAxis.data.push(newData.x);
    } else if (vizData.xAxis && vizData.xAxis.data) {
      // Otherwise use the current length as the x value
      vizData.xAxis.data.push(vizData.series[seriesIndex].data.length);
    }
    
    // Update timestamp
    vizData.timestamp = new Date();
    
    // Store updated visualization
    this.visualizations.set(vizId, vizData);
    
    // Emit update event
    this.emit('visualization_updated', {
      vizId,
      timestamp: vizData.timestamp
    });
  }
  
  /**
   * Add a new data series to an existing visualization
   */
  public addSeries(
    vizId: string,
    label: string,
    data: number[] = [],
    color?: string
  ): void {
    if (!this.visualizations.has(vizId)) {
      this.logger.warn(`Visualization not found: ${vizId}`);
      return;
    }
    
    const vizData = this.visualizations.get(vizId);
    
    // Add new series
    vizData.series.push({
      label,
      data,
      color
    });
    
    // Store updated visualization
    this.visualizations.set(vizId, vizData);
    
    // Emit update event
    this.emit('visualization_updated', {
      vizId,
      timestamp: new Date()
    });
  }
  
  /**
   * Create a visualization from optimization results
   */
  public visualizeOptimizationResult(
    result: OptimizationResult,
    title?: string,
    options: VisualizationOptions = {}
  ): string {
    const vizId = `result-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Create result visualization data
    const vizData: VisualizationData = {
      id: vizId,
      title: title || `Optimization Result (${result.iterations} iterations)`,
      type: 'bar',
      xAxis: {
        label: 'Parameters',
        data: Array.from({ length: result.parameters.length }, (_, i) => `Param ${i+1}`)
      },
      yAxis: {
        label: 'Value',
      },
      series: [
        {
          label: 'Final Values',
          data: result.parameters,
          color: '#4285f4' // Google blue
        }
      ],
      timestamp: new Date()
    };
    
    // Store the visualization
    this.visualizations.set(vizId, vizData);
    
    this.logger.debug(`Created result visualization: ${vizId}`);
    return vizId;
  }
  
  /**
   * Create a comparison visualization for multiple optimization runs
   */
  public createComparisonVisualization(
    results: OptimizationResult[],
    title: string,
    options: VisualizationOptions = {}
  ): string {
    const vizId = `comparison-${Date.now()}`;
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Extract method names for labels
    const methodNames = results.map(r => r.terminationReason || 'Unknown');
    
    // Create comparison visualization data
    const vizData: VisualizationData = {
      id: vizId,
      title: title || 'Optimization Method Comparison',
      type: 'bar',
      xAxis: {
        label: 'Metrics',
        data: ['Final Loss', 'Iterations', 'Time (s)']
      },
      yAxis: {
        label: 'Value',
        min: 0
      },
      series: results.map((result, index) => ({
        label: methodNames[index],
        data: [
          result.finalLoss,
          result.iterations,
          result.timeTaken / 1000
        ],
        color: this.getColorForIndex(index)
      })),
      timestamp: new Date()
    };
    
    // Store the visualization
    this.visualizations.set(vizId, vizData);
    
    this.logger.debug(`Created comparison visualization: ${vizId}`);
    return vizId;
  }
  
  /**
   * Create a parameter sensitivity heatmap
   */
  public createSensitivityHeatmap(
    parameterName: string,
    values: number[],
    lossValues: number[][],
    title?: string,
    options: VisualizationOptions = {}
  ): string {
    const vizId = `sensitivity-${Date.now()}`;
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Create sensitivity heatmap data
    const vizData: VisualizationData = {
      id: vizId,
      title: title || `Parameter Sensitivity: ${parameterName}`,
      type: 'heatmap',
      xAxis: {
        label: parameterName,
        data: values.map(v => v.toString())
      },
      yAxis: {
        label: 'Trial',
      },
      series: lossValues.map((row, index) => ({
        label: `Trial ${index + 1}`,
        data: row
      })),
      timestamp: new Date()
    };
    
    // Store the visualization
    this.visualizations.set(vizId, vizData);
    
    this.logger.debug(`Created sensitivity heatmap: ${vizId}`);
    return vizId;
  }
  
  /**
   * Create a convergence plot for an optimization context
   */
  public createConvergencePlot(
    context: OptimizationContext,
    title?: string,
    options: VisualizationOptions = {}
  ): string {
    const vizId = `convergence-${context.id}`;
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Extract iteration data
    const iterations = context.steps.map((_, i) => i + 1);
    const lossValues = context.steps.map(step => step.data.loss);
    
    // Create convergence plot data
    const vizData: VisualizationData = {
      id: vizId,
      title: title || `Convergence Plot: ${context.config.primaryMethod}`,
      type: 'line',
      xAxis: {
        label: 'Iteration',
        data: iterations
      },
      yAxis: {
        label: 'Loss',
        min: Math.min(...lossValues) * 0.9,
        max: Math.max(...lossValues) * 1.1
      },
      series: [{
        label: 'Loss',
        data: lossValues,
        color: '#0f9d58' // Google green
      }],
      timestamp: new Date()
    };
    
    // If context has gradient information, add it as a series
    if (context.steps[0].data.gradientNorm !== undefined) {
      const gradientNorms = context.steps.map(step => step.data.gradientNorm);
      
      vizData.series.push({
        label: 'Gradient Norm',
        data: gradientNorms,
        color: '#db4437' // Google red
      });
    }
    
    // Store the visualization
    this.visualizations.set(vizId, vizData);
    
    this.logger.debug(`Created convergence plot: ${vizId}`);
    return vizId;
  }
  
  /**
   * Get generated visualization data
   */
  public getVisualization(vizId: string): VisualizationData | null {
    if (!this.visualizations.has(vizId)) {
      this.logger.warn(`Visualization not found: ${vizId}`);
      return null;
    }
    
    return this.visualizations.get(vizId);
  }
  
  /**
   * Get all visualizations
   */
  public getAllVisualizations(): VisualizationData[] {
    return Array.from(this.visualizations.values());
  }
  
  /**
   * Clear a visualization
   */
  public clearVisualization(vizId: string): boolean {
    if (!this.visualizations.has(vizId)) {
      return false;
    }
    
    // Stop any real-time updates
    this.stopRealTimeUpdates(vizId);
    
    // Remove the visualization
    this.visualizations.delete(vizId);
    
    this.emit('visualization_cleared', { vizId });
    return true;
  }
  
  /**
   * Generate a color based on index
   */
  private getColorForIndex(index: number): string {
    const colors = [
      '#4285f4', // Google blue
      '#db4437', // Google red
      '#0f9d58', // Google green
      '#f4b400', // Google yellow
      '#673ab7', // Deep purple
      '#ff9800', // Orange
      '#795548', // Brown
      '#009688', // Teal
      '#607d8b'  // Blue grey
    ];
    
    return colors[index % colors.length];
  }
  
  /**
   * Export visualization data to JSON
   */
  public exportVisualization(vizId: string): string {
    if (!this.visualizations.has(vizId)) {
      throw new Error(`Visualization not found: ${vizId}`);
    }
    
    return JSON.stringify(this.visualizations.get(vizId));
  }
  
  /**
   * Generate a web-based visualization
   */
  public generateHtmlVisualization(vizId: string): string {
    if (!this.visualizations.has(vizId)) {
      throw new Error(`Visualization not found: ${vizId}`);
    }
    
    const vizData = this.visualizations.get(vizId);
    
    // Generate HTML for the visualization
    // This is a simple example using Canvas.js
    // In a real implementation, this would use D3.js or another visualization library
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${vizData.title}</title>
        <script src="https://cdn.canvasjs.com/canvasjs.min.js"></script>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .chart-container { height: 500px; width: 100%; }
          .chart-title { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
          .neural-theme { background-color: #1e1e2f; color: #ffffff; }
        </style>
      </head>
      <body class="${vizData.type === 'neural' ? 'neural-theme' : ''}">
        <div class="chart-title">${vizData.title}</div>
        <div id="chartContainer" class="chart-container"></div>
        
        <script>
          window.onload = function() {
            var chart = new CanvasJS.Chart("chartContainer", {
              animationEnabled: true,
              theme: "${vizData.type === 'neural' ? 'dark2' : 'light2'}",
              title: {
                text: "${vizData.title}"
              },
              axisX: {
                title: "${vizData.xAxis?.label || ''}",
                labelFormatter: function(e) {
                  var labels = ${JSON.stringify(vizData.xAxis?.data || [])};
                  return labels[e.value] || e.value;
                }
              },
              axisY: {
                title: "${vizData.yAxis?.label || ''}",
                minimum: ${vizData.yAxis?.min || 'null'},
                maximum: ${vizData.yAxis?.max || 'null'}
              },
              data: [
                ${vizData.series.map(series => `{
                  type: "${this.mapTypeToCanvasJs(vizData.type)}",
                  name: "${series.label}",
                  showInLegend: true,
                  color: "${series.color || ''}",
                  dataPoints: ${JSON.stringify(series.data.map((y, i) => ({
                    x: i,
                    y: y
                  })))}
                }`).join(',\n')}
              ]
            });
            chart.render();
          }
        </script>
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * Map visualization type to CanvasJS chart type
   */
  private mapTypeToCanvasJs(type: string): string {
    switch (type) {
      case 'line':
        return 'line';
      case 'bar':
        return 'column';
      case 'scatter':
        return 'scatter';
      case 'heatmap':
        return 'bubble'; // Approximation, CanvasJS doesn't have a true heatmap
      default:
        return 'line';
    }
  }
}

// Export singleton instance
export const optimizationVisualizer = OptimizationVisualizer.getInstance();
