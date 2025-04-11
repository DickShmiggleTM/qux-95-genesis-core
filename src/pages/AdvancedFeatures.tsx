
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SystemStatusDashboard from '@/components/SystemStatusDashboard';
import ComputerVision from '@/components/ComputerVision';
import NLPAnalysis from '@/components/NLPAnalysis';
import RecommendationSystem from '@/components/RecommendationSystem';

export interface AdvancedFeaturesProps {
  hardwareInfo?: any;
}

const AdvancedFeatures: React.FC<AdvancedFeaturesProps> = ({ hardwareInfo }) => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Advanced Features</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="border p-4 rounded">
          <h2 className="text-xl mb-2">System Status</h2>
          <SystemStatusDashboard />
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-xl mb-2">Computer Vision</h2>
          <ComputerVision />
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-xl mb-2">NLP Analysis</h2>
          <NLPAnalysis />
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-xl mb-2">Recommendation System</h2>
          <RecommendationSystem />
        </div>
      </div>
      
      <Link to="/">
        <Button>Back to Home</Button>
      </Link>
    </div>
  );
};

export default AdvancedFeatures;
