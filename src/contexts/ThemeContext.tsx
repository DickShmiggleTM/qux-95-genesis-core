
import React, { createContext, useState, useContext, useEffect } from 'react';

type ThemeType = 'cyberpunk' | 'terminal' | 'hacker';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('cyberpunk');
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);

  // Apply theme class to body
  useEffect(() => {
    document.body.classList.remove('theme-cyberpunk', 'theme-terminal', 'theme-hacker');
    document.body.classList.add(`theme-${theme}`);
    
    // Disable animations if needed
    if (!animationsEnabled) {
      document.body.classList.add('disable-animations');
    } else {
      document.body.classList.remove('disable-animations');
    }
  }, [theme, animationsEnabled]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      animationsEnabled, 
      setAnimationsEnabled 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
