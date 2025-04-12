import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, FileEdit, Wrench, LineChart, Laptop } from 'lucide-react';
import SettingsMenu from './SettingsMenu';

interface HeaderProps {
  onClearChat: () => void;
  settingsProps: React.ComponentProps<typeof SettingsMenu>;
  historyPanel?: React.ReactNode;
  modelSelector?: React.ReactNode;
  onOpenPromptEditor?: () => void;
  onOpenQuxTools?: () => void;
  onToggleChangeLogs?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onClearChat, 
  settingsProps, 
  historyPanel, 
  modelSelector,
  onOpenPromptEditor,
  onOpenQuxTools,
  onToggleChangeLogs
}) => {
  return (
    <div className="flex-shrink-0 bg-cyberpunk-neon-green h-5 flex items-center justify-between px-2 z-10">
      <div className="flex items-center gap-2">
        <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">QUX-95 TERMINAL</div>
        {modelSelector && (
          <div className="ml-3">
            {modelSelector}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onOpenPromptEditor && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
            onClick={onOpenPromptEditor}
            title="Prompt Editor"
          >
            <FileEdit className="h-3 w-3" />
          </Button>
        )}
        {onOpenQuxTools && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
            onClick={onOpenQuxTools}
            title="Qux Tools"
          >
            <Wrench className="h-3 w-3" />
          </Button>
        )}
        {onToggleChangeLogs && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
            onClick={onToggleChangeLogs}
            title="Change Logs"
          >
            <LineChart className="h-3 w-3" />
          </Button>
        )}
        {historyPanel}
        <SettingsMenu {...settingsProps} />
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 text-cyberpunk-dark hover:bg-transparent hover:text-cyberpunk-dark-blue p-0"
          onClick={onClearChat}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default Header;
