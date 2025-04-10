
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Try to load from saved state first
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

  // Apply theme class to body
  useEffect(() => {
    document.body.classList.remove('theme-cyberpunk', 'theme-terminal', 'theme-hacker', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    
    // Set CSS variables based on theme
    const root = document.documentElement;
    
    if (theme === 'cyberpunk') {
      root.style.setProperty('--primary-color-rgb', '0, 255, 102');
    } else if (theme === 'terminal') {
      root.style.setProperty('--primary-color-rgb', '51, 255, 51');
    } else if (theme === 'hacker') {
      root.style.setProperty('--primary-color-rgb', '0, 255, 0');
      // Enable dark mode when hacker theme is selected
      if (!isDarkMode) {
        setIsDarkMode(true);
      }
    } else if (theme === 'dark') {
      root.style.setProperty('--primary-color-rgb', '170, 170, 255');
    }
    
    // Apply dark mode
    if (isDarkMode || theme === 'hacker' || theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
    
    // Also save to system state
    if (savedState) {
      if (!savedState.settings) savedState.settings = {};
      savedState.settings.theme = theme;
      savedState.settings.animationsEnabled = animationsEnabled;
      savedState.settings.isDarkMode = isDarkMode || theme === 'hacker' || theme === 'dark';
      saveSystem.saveSystemState(savedState);
    }
  }, [theme, animationsEnabled, isDarkMode, savedState]);

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

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      animationsEnabled, 
      setAnimationsEnabled,
      isDarkMode,
      toggleDarkMode
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
