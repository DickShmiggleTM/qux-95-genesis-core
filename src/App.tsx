
import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import "./styles/themes.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { saveSystem } from './services/saveSystem';
import { toast } from 'sonner';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean, error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application error:', error);
    console.error('Component stack:', info.componentStack);
    
    // Log error to analytics service
    // In a real app, you might send this to a logging service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
          <div className="max-w-md w-full bg-gray-900 p-8 rounded-lg border border-red-500 shadow-lg">
            <h1 className="text-xl font-bold text-red-500 mb-4">System Error Detected</h1>
            <div className="bg-gray-800 p-4 rounded mb-4 overflow-auto max-h-48">
              <p className="font-mono text-sm text-red-300">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <p className="mb-6 text-gray-300">
              The system has encountered an error and needs to restart. Your data has been auto-saved.
            </p>
            <div className="flex justify-center">
              <button 
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                onClick={this.handleReset}
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

// Configure React Query client with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Query error:', error);
        toast.error("Data fetch failed", {
          description: "There was a problem retrieving data"
        });
      }
    },
  },
});

// App wrapper with system initialization
const AppWrapper = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize system on startup
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        // Load saved state (already handled in ThemeProvider)
        // Just need to notify user if there was a previous session
        const savedState = saveSystem.loadSystemState();
        if (savedState) {
          toast.success("System restored", {
            description: `Previous session from ${new Date(savedState.lastSaved).toLocaleString()} loaded`
          });
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-green-500 font-mono">Initializing QUX-95...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

// Main App component
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default AppWrapper;
