import React, { createContext, useState, useContext, useEffect } from 'react';
import { saveSystem } from '@/services/saveSystem';

export type ThemeType = 'cyberpunk' | 'terminal' | 'hacker' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isDarkerVariant: boolean;
  toggleDarkerVariant: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savedState = saveSystem.loadSystemState();
  
  const [theme, setThemeState] = useState<ThemeType>(
    (savedState?.settings?.theme as ThemeType) || 'cyberpunk'
  );
  
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(
    savedState?.settings?.animationsEnabled !== false
  );
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    localStorage.getItem('qux95_dark_mode') === 'true' || theme === 'hacker' || theme === 'dark' || false
  );

  const [isDarkerVariant, setIsDarkerVariant] = useState<boolean>(
    localStorage.getItem('qux95_darker_variant') === 'true' || false
  );

  // Apply theme class to body
  useEffect(() => {
    document.body.classList.remove('theme-cyberpunk', 'theme-terminal', 'theme-hacker', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    
    // Set CSS variables based on theme
    const root = document.documentElement;
    
    if (theme === 'cyberpunk') {
      root.style.setProperty('--primary-color-rgb', isDarkerVariant ? '0, 200, 82' : '0, 255, 102');
      root.style.setProperty('--background-color-rgb', isDarkerVariant ? '5, 1, 15' : '13, 2, 33');
    } else if (theme === 'terminal') {
      root.style.setProperty('--primary-color-rgb', isDarkerVariant ? '0, 200, 0' : '51, 255, 51');
      root.style.setProperty('--background-color-rgb', isDarkerVariant ? '0, 10, 0' : '0, 20, 0');
    } else if (theme === 'hacker') {
      root.style.setProperty('--primary-color-rgb', isDarkerVariant ? '0, 200, 0' : '0, 255, 0');
      root.style.setProperty('--background-color-rgb', isDarkerVariant ? '0, 5, 0' : '0, 10, 0');
    } else if (theme === 'dark') {
      root.style.setProperty('--primary-color-rgb', isDarkerVariant ? '120, 120, 200' : '170, 170, 255');
      root.style.setProperty('--background-color-rgb', isDarkerVariant ? '5, 5, 10' : '10, 10, 20');
    }
    
    // Apply dark mode
    if (isDarkMode || theme === 'hacker' || theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Apply darker variant
    if (isDarkerVariant) {
      document.documentElement.classList.add('darker');
    } else {
      document.documentElement.classList.remove('darker');
    }
    
    // Disable animations if needed
    if (!animationsEnabled) {
      document.body.classList.add('disable-animations');
    } else {
      document.body.classList.remove('disable-animations');
    }
    
    // Save to localStorage
    localStorage.setItem('qux95_theme', theme);
    localStorage.setItem('qux95_animations', String(animationsEnabled));
    localStorage.setItem('qux95_dark_mode', String(isDarkMode || theme === 'hacker' || theme === 'dark'));
    localStorage.setItem('qux95_darker_variant', String(isDarkerVariant));
    
    // Also save to system state
    if (savedState) {
      if (!savedState.settings) savedState.settings = {};
      savedState.settings.theme = theme;
      savedState.settings.animationsEnabled = animationsEnabled;
      savedState.settings.isDarkMode = isDarkMode || theme === 'hacker' || theme === 'dark';
      savedState.settings.isDarkerVariant = isDarkerVariant;
      saveSystem.saveSystemState(savedState);
    }
  }, [theme, animationsEnabled, isDarkMode, isDarkerVariant, savedState]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    // If setting to hacker or dark theme, also enable dark mode
    if ((newTheme === 'hacker' || newTheme === 'dark') && !isDarkMode) {
      setIsDarkMode(true);
    }
  };

  const setAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabledState(enabled);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const toggleDarkerVariant = () => {
    setIsDarkerVariant(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      animationsEnabled, 
      setAnimationsEnabled,
      isDarkMode,
      toggleDarkMode,
      isDarkerVariant,
      toggleDarkerVariant
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
