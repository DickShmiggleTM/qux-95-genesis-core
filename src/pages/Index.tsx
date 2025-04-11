
import React from 'react';
import { Link } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import { Button } from '@/components/ui/button';

export interface IndexProps {
  hardwareInfo?: any;
}

const Index: React.FC<IndexProps> = ({ hardwareInfo }) => {
  return (
    <div>
      <Dashboard />
      <div className="fixed bottom-4 right-4">
        <Link to="/advanced-features">
          <Button>Advanced Features</Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
