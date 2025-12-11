import { createContext, useContext, useState, useEffect, ReactElement } from 'react';
import { ThemeContextValue, ThemeProviderProps, ThemeMode } from '../types/contexts/theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('amaplayer-theme');
    const isDark = savedTheme ? JSON.parse(savedTheme) : true; // Default to dark mode
    
    // Set theme immediately to prevent flash
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    return isDark;
  });

  useEffect(() => {
    localStorage.setItem('amaplayer-theme', JSON.stringify(isDarkMode));
    
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = (): void => {
    setIsDarkMode(prev => !prev);
  };

  const theme: ThemeMode = isDarkMode ? 'dark' : 'light';

  const value: ThemeContextValue = {
    isDarkMode,
    toggleTheme,
    theme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
