
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
    
    // Set CSS variables based on theme
    const root = document.documentElement;
    
    if (theme === 'cyberpunk') {
      root.style.setProperty('--primary-color-rgb', '0, 255, 102');
    } else if (theme === 'terminal') {
      root.style.setProperty('--primary-color-rgb', '51, 255, 51');
    } else if (theme === 'hacker') {
      root.style.setProperty('--primary-color-rgb', '0, 255, 0');
    }
    
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
