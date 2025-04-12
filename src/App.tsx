
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { saveSystem } from './services/saveSystem';
import { toast } from 'sonner';
import { memoryManager } from './services/memory/MemoryManager';
import { detectHardwareCapabilities } from './utils/browserCapabilities';

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdvancedFeatures = lazy(() => import("./pages/AdvancedFeatures"));
const NeuralCyberneticDashboard = lazy(() => import("./pages/NeuralCyberneticDashboard"));

// Error boundary component with improved handling
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean, error: Error | null, errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error info for better debugging
    this.setState({ errorInfo });

    console.error('Application error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Log to memory system for later analysis
    try {
      memoryManager.storeMemory(
        `Error: ${error.message}\n${errorInfo.componentStack}`,
        'error',
        { name: error.name, stack: error.stack },
        1.0 // High importance for errors
      );
    } catch (e) {
      console.error('Failed to log error to memory system:', e);
    }

    // In a production system, we would send this to a logging service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
          <div className="max-w-md w-full bg-gray-900 p-8 rounded-lg border border-red-500 shadow-lg">
            <h1 className="text-xl font-bold text-red-500 mb-4" role="alert">System Error Detected</h1>
            <div className="bg-gray-800 p-4 rounded mb-4 overflow-auto max-h-48">
              <p className="font-mono text-sm text-red-300">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-400 cursor-pointer">View component stack</summary>
                  <pre className="mt-2 text-xs text-gray-400 overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <p className="mb-6 text-gray-300">
              The system has encountered an error and needs to restart. Your data has been auto-saved.
            </p>
            <div className="flex justify-center">
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                onClick={this.handleReset}
                aria-label="Restart System"
              >
                Restart System
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
const AppLoading = () => (
  <div
    className="min-h-screen flex flex-col items-center justify-center bg-black"
    aria-label="Loading application"
  >
    <div className="w-12 h-12 border-t-2 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
    <div className="text-green-500 font-mono">Initializing QUX-95...</div>
  </div>
);

// Configure React Query client with improved error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
      meta: {
        errorHandler: (error: unknown) => {
          console.error('Query error:', error);

          // Log to memory system
          memoryManager.storeMemory(
            `Query error: ${error instanceof Error ? error.message : String(error)}`,
            'error',
            { type: 'query', stack: error instanceof Error ? error.stack : undefined },
            0.8 // High importance for query errors
          );

          toast.error("Data fetch failed", {
            description: "There was a problem retrieving data"
          });
        }
      }
    },
  },
});

// Modify Index and AdvancedFeatures props interfaces to accept hardwareInfo
interface PageProps {
  hardwareInfo?: any;
}

// App wrapper with system initialization and hardware detection
const AppWrapper = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);

  // Initialize system on startup
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        // Detect hardware capabilities
        const hardware = await detectHardwareCapabilities();
        setHardwareInfo(hardware);

        // Load saved state
        const savedState = saveSystem.loadSystemState();

        if (savedState) {
          toast.success("System restored", {
            description: `Previous session data loaded successfully`
          });

          // Initialize memory manager with optimal settings based on hardware
          const memoryCapacity = hardware.memory < 4 ?
            { shortTermCapacity: 30, longTermCapacity: 500 } :
            { shortTermCapacity: 50, longTermCapacity: 1000 };

          memoryManager.setOptions(memoryCapacity);
        }
      } catch (error) {
        console.error("Failed to initialize system:", error);
        toast.error("System initialization error", {
          description: "Some features may be unavailable"
        });
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSystem();

    // Set up global error handler
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      console.error("Global error:", { message, source, lineno, colno, error });

      // Log to memory system
      try {
        memoryManager.storeMemory(
          `Global error: ${message}\nSource: ${source}:${lineno}:${colno}`,
          'error',
          { stack: error?.stack },
          0.9 // High importance
        );
      } catch (e) {
        console.error('Failed to log error to memory:', e);
      }

      toast.error("System error detected", {
        description: "An error occurred but has been contained"
      });

      // Call original handler if exists
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    return () => {
      window.onerror = originalOnError;
    };
  }, []);

  if (!isInitialized) {
    return <AppLoading />;
  }

  return (
    <ErrorBoundary>
      <App hardwareInfo={hardwareInfo} />
    </ErrorBoundary>
  );
};

// Main App component with hardware info passed down
const App = ({ hardwareInfo }: { hardwareInfo: any }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<AppLoading />}>
            <Routes>
              <Route path="/" element={<Index hardwareInfo={hardwareInfo} />} />
              <Route path="/advanced-features" element={<AdvancedFeatures hardwareInfo={hardwareInfo} />} />
              <Route path="/neural-cybernetic" element={<NeuralCyberneticDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// Import ThemeProvider
import { ThemeProvider } from "./contexts/ThemeContext";

export default AppWrapper;
