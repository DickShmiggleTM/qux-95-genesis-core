
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SystemStatusDashboard } from '@/components/LazyComponents';
import ComputerVision from '@/components/ComputerVision';
import NLPAnalysis from '@/components/NLPAnalysis';
import RecommendationSystem from '@/components/RecommendationSystem';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

export interface AdvancedFeaturesProps {
  hardwareInfo?: any;
}

const AdvancedFeatures: React.FC<AdvancedFeaturesProps> = ({ hardwareInfo }) => {
  const { theme } = useTheme();

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className={cn(
        "text-2xl font-bold mb-4 transition-all duration-300",
        theme === "terminal" ? "font-terminal neon-glow" : 
        theme === "hacker" ? "font-terminal green-glow" : ""
      )}>Advanced Features</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 animate-fade-in">
        <div className={cn(
          "border p-4 rounded transition-all duration-500",
          theme === "terminal" ? "border-[#33ff33]" : 
          theme === "hacker" ? "border-[#0f0]" : ""
        )}>
          <h2 className="text-xl mb-2">System Status</h2>
          <SystemStatusDashboard />
        </div>
        
        <div className={cn(
          "border p-4 rounded transition-all duration-500",
          theme === "terminal" ? "border-[#33ff33]" : 
          theme === "hacker" ? "border-[#0f0]" : ""
        )}>
          <h2 className="text-xl mb-2">Computer Vision</h2>
          <ComputerVision />
        </div>
        
        <div className={cn(
          "border p-4 rounded transition-all duration-500",
          theme === "terminal" ? "border-[#33ff33]" : 
          theme === "hacker" ? "border-[#0f0]" : ""
        )}>
          <h2 className="text-xl mb-2">NLP Analysis</h2>
          <NLPAnalysis />
        </div>
        
        <div className={cn(
          "border p-4 rounded transition-all duration-500",
          theme === "terminal" ? "border-[#33ff33]" : 
          theme === "hacker" ? "border-[#0f0]" : ""
        )}>
          <h2 className="text-xl mb-2">Recommendation System</h2>
          <RecommendationSystem />
        </div>
      </div>
      
      <Link to="/">
        <Button className={cn(
          "font-terminal transition-all duration-300",
          theme === "terminal" ? "bg-[#33ff33] hover:bg-[#66ff66] text-black" : 
          theme === "hacker" ? "bg-[#0f0] hover:bg-[#00ff33] text-black" : ""
        )}>
          Back to Home
        </Button>
      </Link>
      
      {/* Theme visual effects */}
      {theme !== "dark" && (
        <>
          <div className="scanline pointer-events-none"></div>
          <div className="scanline-2 pointer-events-none"></div>
          <div className="crt pointer-events-none"></div>
        </>
      )}
    </div>
  );
};

export default AdvancedFeatures;
