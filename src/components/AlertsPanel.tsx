import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Bell, CheckCircle, Info, X, XCircle } from 'lucide-react';

// Alert types
export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  source: string;
  read: boolean;
  metadata?: Record<string, any>;
}

interface AlertsPanelProps {
  className?: string;
  position?: 'right' | 'left' | 'bottom';
  maxHeight?: string;
}

// Mock data for alerts
const mockAlerts: SystemAlert[] = [
  {
    id: 'alert-001',
    title: 'Neural Mesh Optimization Complete',
    message: 'The neural mesh network has been optimized with a 15% improvement in efficiency.',
    severity: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    source: 'neural-mesh',
    read: false
  },
  {
    id: 'alert-002',
    title: 'Quantum State Collapse',
    message: 'A quantum state has collapsed unexpectedly. This may affect decision-making accuracy.',
    severity: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    source: 'quantum-engine',
    read: false
  },
  {
    id: 'alert-003',
    title: 'Code Anomaly Detected',
    message: 'Critical code anomaly detected in module: src/core/modules/quantum/QuantumDecisionEngine.ts',
    severity: 'critical',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    source: 'biomimetic-repair',
    read: false,
    metadata: {
      file: 'src/core/modules/quantum/QuantumDecisionEngine.ts',
      line: 157,
      type: 'null-reference'
    }
  },
  {
    id: 'alert-004',
    title: 'System Update Available',
    message: 'A new system update is available for QUX-95. Version 1.2.5 includes performance improvements and bug fixes.',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    source: 'system',
    read: true
  },
  {
    id: 'alert-005',
    title: 'Memory Optimization Complete',
    message: 'Long-term memory has been optimized. Redundant entries removed and indexing improved.',
    severity: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    source: 'memory-system',
    read: true
  }
];

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  className,
  position = 'right',
  maxHeight = '80vh'
}) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>(mockAlerts);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Calculate unread count
  useEffect(() => {
    setUnreadCount(alerts.filter(alert => !alert.read).length);
  }, [alerts]);
  
  // Mark alert as read
  const markAsRead = (id: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === id ? { ...alert, read: true } : alert
      )
    );
  };
  
  // Mark all as read
  const markAllAsRead = () => {
    setAlerts(prev => 
      prev.map(alert => ({ ...alert, read: true }))
    );
  };
  
  // Dismiss alert
  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };
  
  // Clear all alerts
  const clearAllAlerts = () => {
    setAlerts([]);
  };
  
  // Get severity icon
  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };
  
  // Get severity badge
  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <Badge className="bg-red-500 text-white">
            Critical
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-yellow-500 text-black">
            Warning
          </Badge>
        );
      case 'info':
        return (
          <Badge className="bg-blue-500 text-white">
            Info
          </Badge>
        );
      case 'success':
        return (
          <Badge className="bg-green-500 text-white">
            Success
          </Badge>
        );
    }
  };
  
  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "relative border-cyberpunk-neon-purple text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue",
            unreadCount > 0 && "animate-pulse"
          )}
        >
          <Bell className="h-4 w-4 mr-1" />
          ALERTS
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 bg-cyberpunk-neon-pink text-black text-xs h-5 w-5 flex items-center justify-center p-0 rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side={position} 
        className={cn(
          "bg-cyberpunk-dark border-cyberpunk-neon-purple",
          "flex flex-col",
          className
        )}
        style={{ maxHeight }}
      >
        <SheetHeader className="border-b border-cyberpunk-neon-purple pb-2">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-cyberpunk-neon-purple font-terminal">
              SYSTEM ALERTS
            </SheetTitle>
            
            <div className="flex gap-2">
              {alerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-cyberpunk-neon-purple text-cyberpunk-neon-purple hover:bg-cyberpunk-dark-blue"
                  onClick={markAllAsRead}
                >
                  Mark All Read
                </Button>
              )}
              
              {alerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-red-500 text-red-500 hover:bg-red-950"
                  onClick={clearAllAlerts}
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1 pr-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
              <Bell className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-center">No alerts to display</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {alerts.map(alert => (
                <div 
                  key={alert.id}
                  className={cn(
                    "bg-cyberpunk-dark-blue border rounded-md p-3 relative",
                    !alert.read ? "border-cyberpunk-neon-purple" : "border-gray-700",
                    !alert.read && "shadow-[0_0_8px_rgba(157,0,255,0.3)]"
                  )}
                  onClick={() => markAsRead(alert.id)}
                >
                  <div className="absolute top-2 right-2 flex gap-1">
                    {!alert.read && (
                      <Badge className="bg-cyberpunk-neon-purple text-black text-xs">
                        New
                      </Badge>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-gray-400 hover:text-white hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          "font-bold",
                          alert.severity === 'critical' && "text-red-400",
                          alert.severity === 'warning' && "text-yellow-400",
                          alert.severity === 'info' && "text-blue-400",
                          alert.severity === 'success' && "text-green-400"
                        )}>
                          {alert.title}
                        </h4>
                        
                        {getSeverityBadge(alert.severity)}
                      </div>
                      
                      <p className="text-gray-300 mb-2">{alert.message}</p>
                      
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Source: {alert.source}</span>
                        <span>{formatTimestamp(alert.timestamp)}</span>
                      </div>
                      
                      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                        <>
                          <Separator className="my-2 bg-gray-700" />
                          <div className="text-xs text-gray-400 bg-cyberpunk-dark p-2 rounded">
                            {Object.entries(alert.metadata).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-semibold">{key}:</span>
                                <span>{value.toString()}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default AlertsPanel;
