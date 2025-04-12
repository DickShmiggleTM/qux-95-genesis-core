/**
 * NeuralCyberneticDashboard.tsx
 * 
 * Dashboard for neural-cybernetic capabilities, including visualizations
 * for the neural mesh network, quantum states, and biomimetic repair network.
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Brain, Cpu, Zap, Code, RefreshCcw, Settings } from 'lucide-react';

import NeuralMeshVisualizer from '../components/visualizations/NeuralMeshVisualizer';
import QuantumStateVisualizer from '../components/visualizations/QuantumStateVisualizer';
import { neuralCyberneticService } from '../services/neuralCyberneticService';

const NeuralCyberneticDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('neural-mesh');
  const [systemStatus, setSystemStatus] = useState<{
    neuralMesh: boolean;
    quantumEngine: boolean;
    biomimeticRepair: boolean;
  }>({
    neuralMesh: true,
    quantumEngine: true,
    biomimeticRepair: true
  });
  
  // Toggle system status
  const toggleSystem = (system: keyof typeof systemStatus) => {
    setSystemStatus(prev => ({
      ...prev,
      [system]: !prev[system]
    }));
    
    toast.success(`${system} ${systemStatus[system] ? 'disabled' : 'enabled'}`, {
      description: `The ${system} system has been ${systemStatus[system] ? 'disabled' : 'enabled'}`
    });
  };
  
  return (
    <div className="container mx-auto p-4">
      <Helmet>
        <title>Neural-Cybernetic Dashboard | QUX-95</title>
      </Helmet>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-terminal text-cyberpunk-neon-green">Neural-Cybernetic Dashboard</h1>
          <p className="text-gray-400">Monitor and control neural-cybernetic systems</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-cyberpunk-neon-green text-cyberpunk-neon-green hover:bg-cyberpunk-dark-blue"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          
          <Button
            variant="outline"
            className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
      
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-cyberpunk-dark border-cyberpunk-neon-green">
          <CardHeader className="pb-2">
            <CardTitle className="text-cyberpunk-neon-green font-terminal text-lg flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              Neural Mesh Network
            </CardTitle>
            <CardDescription>Distributed neural processing network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <Badge variant={systemStatus.neuralMesh ? "default" : "outline"} className={systemStatus.neuralMesh ? "bg-green-500" : "border-red-500 text-red-500"}>
                {systemStatus.neuralMesh ? "Active" : "Inactive"}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                className={systemStatus.neuralMesh ? "border-red-500 text-red-500" : "border-green-500 text-green-500"}
                onClick={() => toggleSystem('neuralMesh')}
              >
                {systemStatus.neuralMesh ? "Disable" : "Enable"}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-cyberpunk-dark border-cyberpunk-neon-blue">
          <CardHeader className="pb-2">
            <CardTitle className="text-cyberpunk-neon-blue font-terminal text-lg flex items-center">
              <Cpu className="h-5 w-5 mr-2" />
              Quantum Decision Engine
            </CardTitle>
            <CardDescription>Quantum-inspired decision making</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <Badge variant={systemStatus.quantumEngine ? "default" : "outline"} className={systemStatus.quantumEngine ? "bg-green-500" : "border-red-500 text-red-500"}>
                {systemStatus.quantumEngine ? "Active" : "Inactive"}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                className={systemStatus.quantumEngine ? "border-red-500 text-red-500" : "border-green-500 text-green-500"}
                onClick={() => toggleSystem('quantumEngine')}
              >
                {systemStatus.quantumEngine ? "Disable" : "Enable"}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-cyberpunk-dark border-cyberpunk-neon-purple">
          <CardHeader className="pb-2">
            <CardTitle className="text-cyberpunk-neon-purple font-terminal text-lg flex items-center">
              <Code className="h-5 w-5 mr-2" />
              Biomimetic Repair Network
            </CardTitle>
            <CardDescription>Self-healing code system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <Badge variant={systemStatus.biomimeticRepair ? "default" : "outline"} className={systemStatus.biomimeticRepair ? "bg-green-500" : "border-red-500 text-red-500"}>
                {systemStatus.biomimeticRepair ? "Active" : "Inactive"}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                className={systemStatus.biomimeticRepair ? "border-red-500 text-red-500" : "border-green-500 text-green-500"}
                onClick={() => toggleSystem('biomimeticRepair')}
              >
                {systemStatus.biomimeticRepair ? "Disable" : "Enable"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-6 bg-cyberpunk-neon-green opacity-30" />
      
      {/* Visualization Tabs */}
      <Tabs defaultValue="neural-mesh" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-cyberpunk-dark-blue mb-4">
          <TabsTrigger value="neural-mesh" className="data-[state=active]:bg-cyberpunk-neon-green data-[state=active]:text-black">
            <Brain className="h-4 w-4 mr-2" />
            Neural Mesh
          </TabsTrigger>
          <TabsTrigger value="quantum-states" className="data-[state=active]:bg-cyberpunk-neon-green data-[state=active]:text-black">
            <Zap className="h-4 w-4 mr-2" />
            Quantum States
          </TabsTrigger>
          <TabsTrigger value="biomimetic-repair" className="data-[state=active]:bg-cyberpunk-neon-green data-[state=active]:text-black">
            <Code className="h-4 w-4 mr-2" />
            Biomimetic Repair
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="neural-mesh" className="border-none p-0">
          <Card className="bg-cyberpunk-dark border-cyberpunk-neon-green">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyberpunk-neon-green font-terminal">Neural Mesh Network Visualization</CardTitle>
              <CardDescription>3D visualization of the neural mesh topology</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px]">
                <NeuralMeshVisualizer autoRefresh={systemStatus.neuralMesh} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="quantum-states" className="border-none p-0">
          <Card className="bg-cyberpunk-dark border-cyberpunk-neon-blue">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyberpunk-neon-blue font-terminal">Quantum State Visualization</CardTitle>
              <CardDescription>Probability distributions of quantum states</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px]">
                <QuantumStateVisualizer showControls={systemStatus.quantumEngine} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="biomimetic-repair" className="border-none p-0">
          <Card className="bg-cyberpunk-dark border-cyberpunk-neon-purple">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyberpunk-neon-purple font-terminal">Biomimetic Repair Network</CardTitle>
              <CardDescription>Code anomaly detection and repair</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-cyberpunk-neon-purple font-terminal mb-4">Biomimetic Repair Visualization</div>
                  <p className="text-gray-400 mb-4">Coming soon...</p>
                  <Button
                    variant="outline"
                    className="border-cyberpunk-neon-purple text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Scan for Anomalies
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NeuralCyberneticDashboard;
