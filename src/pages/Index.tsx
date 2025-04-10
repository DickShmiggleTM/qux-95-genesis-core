
import React from 'react';
import Dashboard from '@/components/Dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const Index = () => {
  return (
    <div className="relative">
      <Dashboard />
      
      {/* Advanced Features Link */}
      <div className="absolute top-4 right-4 z-10">
        <Link to="/advanced-features">
          <Button variant="outline" className="bg-black/50 border-primary hover:bg-black/70">
            <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
            Advanced AI Features
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
