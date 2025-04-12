import React from 'react';
import Dashboard from '@/components/Dashboard';
import { useTheme } from '@/contexts/ThemeContext';

export interface IndexProps {
  hardwareInfo?: any;
}

const Index: React.FC<IndexProps> = ({ hardwareInfo }) => {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Dashboard />
      
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
