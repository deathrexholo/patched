import React, { useEffect, useRef, useState } from 'react';
import { useLanguage, languages } from '../../contexts/LanguageContext';
import '../styles/LanguageSelector.css';

const LanguageSelector: React.FC = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (): void => {
    setIsOpen(!isOpen);
  };

  const handleLanguageSelect = (langCode: string): void => {
    changeLanguage(langCode as any);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get the language code for the flag emoji
  const getFlagEmoji = (langCode: string): string => {
    const flagMap: { [key: string]: string } = {
      en: '🇬🇧', // English (UK flag)
      hi: '🇮🇳', // Hindi (India flag)
      bn: '🇧🇩', // Bengali (Bangladesh flag)
      ta: '🇮🇳', // Tamil (India flag)
      te: '🇮🇳', // Telugu (India flag)
      pa: '🇮🇳', // Punjabi (India flag)
      mr: '🇮🇳', // Marathi (India flag)
      kn: '🇮🇳', // Kannada (India flag)
      ml: '🇮🇳', // Malayalam (India flag)
      gu: '🇮🇳', // Gujarati (India flag)
      or: '🇮🇳', // Odia (India flag)
      as: '🇮🇳', // Assamese (India flag)
    };
    return flagMap[langCode] || '🌐';
  };

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button 
        className="language-toggle"
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {getFlagEmoji(currentLanguage)}
      </button>
      
      {isOpen && (
        <div className="language-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-option ${currentLanguage === lang.code ? 'active' : ''}`}
              onClick={() => handleLanguageSelect(lang.code)}
            >
              <span className="language-flag">{getFlagEmoji(lang.code)}</span>
              <span className="language-native">{lang.nativeName}</span>
              <span className="language-name">({lang.name})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
