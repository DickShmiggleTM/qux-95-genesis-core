
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import SettingsMenu from './SettingsMenu';

interface HeaderProps {
  onClearChat: () => void;
  settingsProps: React.ComponentProps<typeof SettingsMenu>;
}

const Header: React.FC<HeaderProps> = ({ onClearChat, settingsProps }) => {
  return (
    <div className="absolute top-0 left-0 right-0 bg-cyberpunk-neon-green h-5 flex items-center justify-between px-2 z-10">
      <div className="text-cyberpunk-dark text-xs font-pixel tracking-tighter">QUX-95 TERMINAL</div>
      <div className="flex items-center gap-1">
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
