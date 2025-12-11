import React, { memo, useCallback, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { ThemeToggleProps } from '../../../types/components/common';
import './ThemeToggle.css';

interface ThemeToggleComponentProps {
  inline?: boolean;
  showLabel?: boolean;
}

const ThemeToggle = memo<ThemeToggleComponentProps>(function ThemeToggle({ inline = false, showLabel = false }) {
  // Debug logging for ThemeToggle rendering// Always call hooks unconditionally
  const themeContext = useTheme();
  
  // Safely extract values with fallbacks
  const isDarkMode = themeContext?.isDarkMode ?? false;
  const toggleTheme = themeContext?.toggleTheme ?? (() => {
    console.warn('🎨 ThemeToggle Warning - Theme toggle not available, using fallback');
  });// Enhanced error handling for theme toggle
  const handleThemeToggle = useCallback(() => {
    try {toggleTheme();} catch (error) {
      console.error('🎨 ThemeToggle Error - Failed to toggle theme:', error);
      
      // Fallback: try to manually set theme via document
      try {
        const newTheme = isDarkMode ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);} catch (fallbackError) {
        console.error('🎨 ThemeToggle Error - Fallback theme toggle failed:', fallbackError);
      }
    }
  }, [isDarkMode, toggleTheme]);

  // Log component mount/unmount
  useEffect(() => {return () => {};
  }, []);

  const buttonClass = inline ? 'theme-toggle-inline' : 'theme-toggle';
  const iconSize = inline ? 18 : 20;

  try {
    if (inline) {return (
        <div className="theme-toggle-inline-container">
          {showLabel && (
            <span className="theme-toggle-label">
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
          )}
          <div className="theme-toggle-switch">
            <button
              className={`theme-toggle-option ${!isDarkMode ? 'active' : ''}`}
              onClick={!isDarkMode ? null : handleThemeToggle}
              aria-label="Switch to light mode"
              aria-pressed={!isDarkMode}
            >
              <Sun size={iconSize} />
            </button>
            <button
              className={`theme-toggle-option ${isDarkMode ? 'active' : ''}`}
              onClick={isDarkMode ? null : handleThemeToggle}
              aria-label="Switch to dark mode"
              aria-pressed={isDarkMode}
            >
              <Moon size={iconSize} />
            </button>
          </div>
        </div>
      );
    }return (
      <button 
        className={buttonClass}
        onClick={handleThemeToggle}
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      >
        {isDarkMode ? (
          <Sun size={iconSize} className="theme-icon" />
        ) : (
          <Moon size={iconSize} className="theme-icon" />
        )}
      </button>
    );
  } catch (error) {
    console.error('🎨 ThemeToggle Error - Failed to render component:', error);
    
    // Fallback UI
    return (
      <div className="theme-toggle-error">
        <span>Theme toggle unavailable</span>
      </div>
    );
  }
});

export default ThemeToggle;