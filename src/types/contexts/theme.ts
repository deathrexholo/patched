/**
 * Theme Context Type Definitions
 * 
 * Defines types for the ThemeContext which manages the application's
 * theme state (dark mode / light mode) and provides theme-related methods.
 */

import { ReactNode } from 'react';

/**
 * Available theme modes
 */
export type ThemeMode = 'dark' | 'light';

/**
 * The value provided by the ThemeContext
 */
export interface ThemeContextValue {
  /** Whether dark mode is currently enabled */
  isDarkMode: boolean;
  
  /** Toggle between dark and light mode */
  toggleTheme: () => void;
  
  /** The current theme as a string ('dark' or 'light') */
  theme: ThemeMode;
}

/**
 * Props for the ThemeProvider component
 */
export interface ThemeProviderProps {
  /** Child components that will have access to the theme context */
  children: ReactNode;
}
