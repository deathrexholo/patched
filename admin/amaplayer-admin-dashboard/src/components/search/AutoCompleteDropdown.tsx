import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AutoCompleteSuggestion, SearchType } from '../../types/models/search';
import './AutoCompleteDropdown.css';

interface AutoCompleteDropdownProps {
  suggestions: AutoCompleteSuggestion[];
  isVisible: boolean;
  onSuggestionSelect: (suggestion: string) => void;
  onClose: () => void;
  searchTerm: string;
  searchType: SearchType;
  className?: string;
}

interface KeyboardNavigationState {
  selectedIndex: number;
  isNavigating: boolean;
}

const AutoCompleteDropdown: React.FC<AutoCompleteDropdownProps> = ({
  suggestions,
  isVisible,
  onSuggestionSelect,
  onClose,
  searchTerm,
  searchType,
  className = ''
}) => {
  const [navigationState, setNavigationState] = useState<KeyboardNavigationState>({
    selectedIndex: -1,
    isNavigating: false
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset navigation when suggestions change
  useEffect(() => {
    setNavigationState({
      selectedIndex: -1,
      isNavigating: false
    });
    suggestionRefs.current = suggestionRefs.current.slice(0, suggestions.length);
  }, [suggestions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isVisible || suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setNavigationState(prev => ({
          selectedIndex: Math.min(prev.selectedIndex + 1, suggestions.length - 1),
          isNavigating: true
        }));
        break;

      case 'ArrowUp':
        event.preventDefault();
        setNavigationState(prev => ({
          selectedIndex: Math.max(prev.selectedIndex - 1, -1),
          isNavigating: true
        }));
        break;

      case 'Enter':
        event.preventDefault();
        if (navigationState.selectedIndex >= 0 && navigationState.selectedIndex < suggestions.length) {
          const selectedSuggestion = suggestions[navigationState.selectedIndex];
          onSuggestionSelect(selectedSuggestion.text);
        }
        break;

      case 'Escape':
        event.preventDefault();
        onClose();
        break;

      case 'Tab':
        // Allow tab to close dropdown
        onClose();
        break;

      default:
        // Reset navigation on other keys
        setNavigationState(prev => ({
          ...prev,
          isNavigating: false
        }));
        break;
    }
  }, [isVisible, suggestions, navigationState.selectedIndex, onSuggestionSelect, onClose]);

  // Attach keyboard event listeners
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    if (navigationState.isNavigating && navigationState.selectedIndex >= 0) {
      const selectedElement = suggestionRefs.current[navigationState.selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [navigationState.selectedIndex, navigationState.isNavigating]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: AutoCompleteSuggestion) => {
    onSuggestionSelect(suggestion.text);
  };

  // Handle mouse enter for suggestion items
  const handleSuggestionMouseEnter = (index: number) => {
    setNavigationState({
      selectedIndex: index,
      isNavigating: false
    });
  };

  // Render suggestion text with highlighting
  const renderSuggestionText = (suggestion: AutoCompleteSuggestion) => {
    if (suggestion.highlighted) {
      return (
        <span 
          dangerouslySetInnerHTML={{ __html: suggestion.highlighted }}
          className="suggestion-text-highlighted"
        />
      );
    }

    // Fallback highlighting if not provided
    const text = suggestion.text;
    const term = searchTerm.toLowerCase();
    const index = text.toLowerCase().indexOf(term);
    
    if (index >= 0) {
      const before = text.substring(0, index);
      const match = text.substring(index, index + term.length);
      const after = text.substring(index + term.length);
      
      return (
        <span className="suggestion-text-highlighted">
          {before}
          <mark>{match}</mark>
          {after}
        </span>
      );
    }

    return <span className="suggestion-text">{text}</span>;
  };

  // Get suggestion icon based on type
  const getSuggestionIcon = (suggestion: AutoCompleteSuggestion) => {
    switch (suggestion.type) {
      case 'saved_search':
        return (
          <svg className="suggestion-icon saved-search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        );
      case 'filter':
        return (
          <svg className="suggestion-icon filter-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="suggestion-icon search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Get suggestion category label
  const getCategoryLabel = (suggestion: AutoCompleteSuggestion) => {
    if (suggestion.category) {
      return suggestion.category;
    }

    switch (suggestion.type) {
      case 'saved_search':
        return 'Saved Search';
      case 'filter':
        return 'Filter';
      default:
        return 'Search Term';
    }
  };

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      ref={dropdownRef}
      className={`autocomplete-dropdown ${className}`}
      role="listbox"
      aria-label="Search suggestions"
    >
      <div className="dropdown-header">
        <span className="suggestions-count">
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="close-button"
          aria-label="Close suggestions"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <ul className="suggestions-list" role="listbox">
        {suggestions.map((suggestion, index) => (
          <li key={`${suggestion.text}-${index}`} role="option">
            <button
              ref={el => { if (el) suggestionRefs.current[index] = el; }}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => handleSuggestionMouseEnter(index)}
              className={`suggestion-item ${
                navigationState.selectedIndex === index ? 'selected' : ''
              } ${suggestion.type}`}
              aria-selected={navigationState.selectedIndex === index}
              role="option"
            >
              <div className="suggestion-content">
                <div className="suggestion-main">
                  {getSuggestionIcon(suggestion)}
                  <div className="suggestion-text-container">
                    {renderSuggestionText(suggestion)}
                    {suggestion.count && suggestion.count > 0 && (
                      <span className="suggestion-count">
                        ({suggestion.count} searches)
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="suggestion-meta">
                  <span className="suggestion-category">
                    {getCategoryLabel(suggestion)}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="dropdown-footer">
        <div className="keyboard-hints">
          <span className="hint">
            <kbd>↑</kbd><kbd>↓</kbd> Navigate
          </span>
          <span className="hint">
            <kbd>Enter</kbd> Select
          </span>
          <span className="hint">
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
};

export default AutoCompleteDropdown;