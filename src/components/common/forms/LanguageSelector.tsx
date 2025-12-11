import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  inline?: boolean;
  showLabel?: boolean;
  dropdownPosition?: 'left' | 'right';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = memo(function LanguageSelector({ 
  inline = false, 
  showLabel = false,
  dropdownPosition = 'right'
}) {
  // Debug logging for LanguageSelector rendering
  console.log('🌐 LanguageSelector Debug - Rendering with props:', {
    inline,
    showLabel,
    dropdownPosition,
    timestamp: new Date().toISOString()
  });

  // Always call hooks unconditionally
  const languageContext = useLanguage();
  
  // Safely extract values with fallbacks
  const currentLanguage = languageContext?.currentLanguage ?? 'en';
  const changeLanguage = languageContext?.changeLanguage ?? (() => {
    console.warn('🌐 LanguageSelector Warning - Language change not available, using fallback');
  });
  const languages = languageContext?.languages ?? [{ code: 'en', name: 'English', nativeName: 'English' }];

  console.log('🌐 LanguageSelector Debug - Language context loaded:', {
    currentLanguage,
    availableLanguages: languages?.length || 0,
    hasChangeFunction: typeof changeLanguage === 'function'
  });
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Enhanced click outside handler with error handling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      try {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          console.log('🌐 LanguageSelector Debug - Click outside detected, closing dropdown');
          setIsOpen(false);
        }
      } catch (error) {
        console.error('🌐 LanguageSelector Error - Click outside handler failed:', error);
        // Fallback: close dropdown
        setIsOpen(false);
      }
    };

    if (isOpen) {
      console.log('🌐 LanguageSelector Debug - Adding click outside listener');
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      console.log('🌐 LanguageSelector Debug - Removing click outside listener');
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Enhanced language change handler with error handling
  const handleLanguageChange = useCallback((languageCode: string) => {
    try {
      console.log('🌐 LanguageSelector Debug - Language change requested:', {
        from: currentLanguage,
        to: languageCode,
        timestamp: new Date().toISOString()
      });
      
      changeLanguage(languageCode as any);
      setIsOpen(false);
      
      console.log('🌐 LanguageSelector Debug - Language change successful');
    } catch (error) {
      console.error('🌐 LanguageSelector Error - Failed to change language:', error);
      
      // Fallback: close dropdown and show error
      setIsOpen(false);
      
      // Try to set language via localStorage as fallback
      try {
        localStorage.setItem('preferred-language', languageCode);
        console.log('🌐 LanguageSelector Debug - Saved language preference to localStorage');
      } catch (storageError) {
        console.error('🌐 LanguageSelector Error - Failed to save language preference:', storageError);
      }
    }
  }, [currentLanguage, changeLanguage]);

  // Enhanced language name getter with error handling
  const getCurrentLanguageName = useCallback((): string => {
    try {
      if (!languages || !Array.isArray(languages)) {
        console.warn('🌐 LanguageSelector Warning - Languages array not available');
        return 'English';
      }
      
      const language = languages.find(lang => lang.code === currentLanguage);
      const name = language ? language.name : 'English';
      
      console.log('🌐 LanguageSelector Debug - Current language name:', name);
      return name;
    } catch (error) {
      console.error('🌐 LanguageSelector Error - Failed to get current language name:', error);
      return 'English';
    }
  }, [languages, currentLanguage]);

  // Log component mount/unmount
  useEffect(() => {
    console.log('🌐 LanguageSelector Debug - Component mounted');
    return () => {
      console.log('🌐 LanguageSelector Debug - Component unmounted');
    };
  }, []);

  // Enhanced toggle handler with error handling
  const handleToggle = useCallback(() => {
    try {
      console.log('🌐 LanguageSelector Debug - Toggle clicked:', {
        currentState: isOpen,
        targetState: !isOpen,
        timestamp: new Date().toISOString()
      });
      
      setIsOpen(!isOpen);
    } catch (error) {
      console.error('🌐 LanguageSelector Error - Failed to toggle dropdown:', error);
    }
  }, [isOpen]);

  try {
    console.log('🌐 LanguageSelector Debug - Rendering component');
    
    return (
      <div 
        className={`language-selector ${inline ? 'language-selector-inline' : ''}`} 
        ref={dropdownRef}
      >
        <button 
          className={`language-toggle ${inline ? 'language-toggle-inline' : ''}`}
          onClick={handleToggle}
          aria-label="Select Language"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Globe size={inline ? 18 : 20} className="language-icon" />
          {showLabel && (
            <span className="language-label">
              {getCurrentLanguageName()}
            </span>
          )}
          {inline && <ChevronDown size={16} className={`language-arrow ${isOpen ? 'open' : ''}`} />}
        </button>
        
        {isOpen && (
          <div className={`language-dropdown language-dropdown-${dropdownPosition}`}>
            <div className="language-dropdown-header">
              <Globe size={16} />
              <span>Choose Language</span>
            </div>
            <div className="language-options">
              {languages && Array.isArray(languages) ? languages.map((language) => (
                <button
                  key={language.code}
                  className={`language-option ${currentLanguage === language.code ? 'active' : ''}`}
                  onClick={() => handleLanguageChange(language.code)}
                  role="menuitem"
                  tabIndex={0}
                >
                  <div className="language-info">
                    <span className="language-name">{language.name}</span>
                    <span className="language-native">{language.nativeName}</span>
                  </div>
                  {currentLanguage === language.code && (
                    <span className="language-check">✓</span>
                  )}
                </button>
              )) : (
                <div className="language-option-error">
                  <span>Languages not available</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('🌐 LanguageSelector Error - Failed to render component:', error);
    
    // Fallback UI
    return (
      <div className="language-selector-error">
        <Globe size={inline ? 18 : 20} />
        <span>Language selector unavailable</span>
      </div>
    );
  }
});

export default LanguageSelector;
