
import React from 'react';
import { Link } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import { Button } from '@/components/ui/button';
import { SystemStatusDashboard } from '@/components/LazyComponents';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

export interface IndexProps {
  hardwareInfo?: any;
}

const Index: React.FC<IndexProps> = ({ hardwareInfo }) => {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Dashboard />
      
      <div className="fixed bottom-24 right-4 left-4 md:left-auto md:w-96">
        <SystemStatusDashboard className="animate-fade-in" />
      </div>
      
      <div className={cn(
        "fixed bottom-4 right-4 transition-all duration-300",
        {"hover:scale-105": theme !== "terminal"}
      )}>
        <Link to="/advanced-features">
          <Button className={cn(
            "font-terminal text-sm",
            theme === "terminal" ? "bg-[#33ff33] hover:bg-[#66ff66] text-black" : 
            theme === "hacker" ? "bg-[#0f0] hover:bg-[#00ff33] text-black" : ""
          )}>
            Advanced Features
          </Button>
        </Link>
      </div>
      
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

export default Index;
