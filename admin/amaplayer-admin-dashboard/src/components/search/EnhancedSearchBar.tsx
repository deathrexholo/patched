import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SearchQuery, SearchFilters, SearchType, AutoCompleteSuggestion, SavedSearch } from '../../types/models/search';
import { enhancedSearchService } from '../../services/search/enhancedSearchService';
import { autoCompleteService } from '../../services/search/autoCompleteService';
import SavedSearchService from '../../services/search/savedSearchService';
import LoadingSpinner from '../common/ui/LoadingSpinner';
import AutoCompleteDropdown from './AutoCompleteDropdown';
import SavedSearchesDropdown from './SavedSearchesDropdown';
import SavedSearchDialog from './SavedSearchDialog';
import SavedSearchesManagementPanel from './SavedSearchesManagementPanel';
import './EnhancedSearchBar.css';

interface EnhancedSearchBarProps {
  onSearch: (query: SearchQuery) => void;
  placeholder?: string;
  enableAutoComplete?: boolean;
  enableSavedSearches?: boolean;
  searchTypes: SearchType[];
  initialFilters?: SearchFilters;
  className?: string;
}

interface SearchState {
  term: string;
  searchType: SearchType;
  filters: SearchFilters;
  isLoading: boolean;
  error: string | null;
  showSuggestions: boolean;
  suggestions: AutoCompleteSuggestion[];
  savedSearches: SavedSearch[];
  showSavedSearches: boolean;
  isLoadingSuggestions: boolean;
  showSaveDialog: boolean;
  showManagementPanel: boolean;
  currentQuery: SearchQuery | null;
}

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  onSearch,
  placeholder = "Search users, videos, events...",
  enableAutoComplete = true,
  enableSavedSearches = true,
  searchTypes = ['all'],
  initialFilters = {},
  className = ''
}) => {
  const [state, setState] = useState<SearchState>({
    term: '',
    searchType: searchTypes[0] || 'all',
    filters: initialFilters,
    isLoading: false,
    error: null,
    showSuggestions: false,
    suggestions: [],
    savedSearches: [],
    showSavedSearches: false,
    isLoadingSuggestions: false,
    showSaveDialog: false,
    showManagementPanel: false,
    currentQuery: null
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved searches on mount
  useEffect(() => {
    if (enableSavedSearches) {
      loadSavedSearches();
    }
  }, [enableSavedSearches]);

  const loadSavedSearches = async () => {
    try {
      const savedSearches = await SavedSearchService.getSavedSearches();
      setState(prev => ({ ...prev, savedSearches }));
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  // Handle search term changes with debouncing
  const handleTermChange = useCallback((newTerm: string) => {
    setState(prev => ({ ...prev, term: newTerm, error: null }));

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Auto-complete suggestions
    if (enableAutoComplete && newTerm.trim().length > 1) {
      setState(prev => ({ ...prev, isLoadingSuggestions: true }));
      
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          const suggestions = await autoCompleteService.getSuggestions(
            newTerm,
            state.searchType,
            {
              maxSuggestions: 10,
              includeHistory: true,
              includePopular: true,
              includeSavedSearches: enableSavedSearches
            }
          );
          
          setState(prev => ({
            ...prev,
            suggestions,
            showSuggestions: suggestions.length > 0,
            isLoadingSuggestions: false
          }));
        } catch (error) {
          console.error('Auto-complete error:', error);
          setState(prev => ({
            ...prev,
            isLoadingSuggestions: false,
            showSuggestions: false,
            suggestions: []
          }));
        }
      }, 200); // 200ms delay for auto-complete as per requirements
    } else {
      setState(prev => ({ 
        ...prev, 
        showSuggestions: false, 
        suggestions: [],
        isLoadingSuggestions: false
      }));
    }
  }, [enableAutoComplete, enableSavedSearches, state.searchType]);

  // Execute search
  const executeSearch = useCallback(async (searchTerm?: string) => {
    const term = searchTerm || state.term;
    
    if (!term.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a search term' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      showSuggestions: false,
      showSavedSearches: false
    }));

    const searchQuery: SearchQuery = {
      term: term.trim(),
      searchType: state.searchType,
      filters: state.filters,
      limit: 20,
      fuzzyMatching: true
    };

    try {
      // Update auto-complete service with search activity
      autoCompleteService.updateSuggestionData(term.trim(), state.searchType, 1);
      
      onSearch(searchQuery);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Search failed. Please try again.',
        isLoading: false
      }));
    }
  }, [state.term, state.searchType, state.filters, onSearch]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setState(prev => ({ ...prev, term: suggestion, showSuggestions: false }));
    executeSearch(suggestion);
  };

  // Handle auto-complete dropdown close
  const handleAutoCompleteClose = () => {
    setState(prev => ({ ...prev, showSuggestions: false }));
  };

  // Handle saved search selection
  const handleSavedSearchSelect = async (savedSearch: SavedSearch) => {
    try {
      await SavedSearchService.markSearchAsUsed(savedSearch.id);
    } catch (error) {
      console.error('Error marking search as used:', error);
    }

    setState(prev => ({
      ...prev,
      term: savedSearch.query.term,
      searchType: savedSearch.query.searchType,
      filters: savedSearch.query.filters,
      showSavedSearches: false
    }));
    
    onSearch(savedSearch.query);
  };

  // Handle save current search
  const handleSaveCurrentSearch = () => {
    const searchQuery: SearchQuery = {
      term: state.term.trim(),
      searchType: state.searchType,
      filters: state.filters,
      limit: 20,
      fuzzyMatching: true
    };

    setState(prev => ({
      ...prev,
      currentQuery: searchQuery,
      showSaveDialog: true,
      showSavedSearches: false,
      showSuggestions: false
    }));
  };

  // Handle save dialog close
  const handleSaveDialogClose = () => {
    setState(prev => ({
      ...prev,
      showSaveDialog: false,
      currentQuery: null
    }));
  };

  // Handle save success
  const handleSaveSuccess = (savedSearch: SavedSearch) => {
    loadSavedSearches();
    setState(prev => ({
      ...prev,
      showSaveDialog: false,
      currentQuery: null
    }));
  };

  // Handle management panel
  const handleShowManagement = () => {
    setState(prev => ({
      ...prev,
      showManagementPanel: true,
      showSavedSearches: false
    }));
  };

  const handleManagementClose = () => {
    setState(prev => ({ ...prev, showManagementPanel: false }));
    loadSavedSearches(); // Refresh saved searches after management
  };

  // Handle search type change
  const handleSearchTypeChange = (newType: SearchType) => {
    setState(prev => ({ ...prev, searchType: newType }));
    
    // Refresh suggestions if there's a current term
    if (state.term.trim().length > 1 && enableAutoComplete) {
      handleTermChange(state.term);
    }
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setState(prev => ({ 
          ...prev, 
          showSuggestions: false, 
          showSavedSearches: false 
        }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setState(prev => ({ 
        ...prev, 
        showSuggestions: false, 
        showSavedSearches: false 
      }));
    }
  };

  return (
    <div className={`enhanced-search-bar ${className}`}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          {/* Search Type Selector */}
          {searchTypes.length > 1 && (
            <select
              value={state.searchType}
              onChange={(e) => handleSearchTypeChange(e.target.value as SearchType)}
              className="search-type-selector"
              aria-label="Search type"
            >
              {searchTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          )}

          {/* Main Search Input */}
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              value={state.term}
              onChange={(e) => handleTermChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="search-input"
              aria-label="Search input"
              autoComplete="off"
            />
            
            {/* Search Button */}
            <button
              type="submit"
              disabled={state.isLoading || !state.term.trim()}
              className="search-button"
              aria-label="Execute search"
            >
              {state.isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Save Search Button */}
            {enableSavedSearches && state.term.trim() && (
              <button
                type="button"
                onClick={handleSaveCurrentSearch}
                className="save-search-button"
                aria-label="Save current search"
                title="Save current search"
              >
                <svg className="save-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586l-1.293-1.293z" />
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v1a1 1 0 11-2 0V4H7v1a1 1 0 11-2 0V4z" />
                </svg>
              </button>
            )}

            {/* Saved Searches Button */}
            {enableSavedSearches && (
              <button
                type="button"
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  showSavedSearches: !prev.showSavedSearches,
                  showSuggestions: false
                }))}
                className="saved-searches-button"
                aria-label="Show saved searches"
                title="Show saved searches"
              >
                <svg className="bookmark-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                {state.savedSearches.length > 0 && (
                  <span className="saved-count">{state.savedSearches.length}</span>
                )}
              </button>
            )}
          </div>

          {/* Auto-complete Suggestions */}
          {enableAutoComplete && (
            <AutoCompleteDropdown
              suggestions={state.suggestions}
              isVisible={state.showSuggestions && !state.isLoadingSuggestions}
              onSuggestionSelect={handleSuggestionSelect}
              onClose={handleAutoCompleteClose}
              searchTerm={state.term}
              searchType={state.searchType}
            />
          )}

          {/* Loading indicator for suggestions */}
          {enableAutoComplete && state.isLoadingSuggestions && (
            <div ref={suggestionsRef} className="suggestions-loading">
              <div className="loading-content">
                <LoadingSpinner size="sm" />
                <span>Loading suggestions...</span>
              </div>
            </div>
          )}

          {/* Saved Searches Dropdown */}
          {enableSavedSearches && (
            <SavedSearchesDropdown
              isVisible={state.showSavedSearches}
              onClose={() => setState(prev => ({ ...prev, showSavedSearches: false }))}
              onSearchSelect={handleSavedSearchSelect}
              onManageSearches={handleShowManagement}
            />
          )}
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="search-error" role="alert">
            <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{state.error}</span>
          </div>
        )}
      </form>

      {/* Save Search Dialog */}
      {enableSavedSearches && state.showSaveDialog && state.currentQuery && (
        <SavedSearchDialog
          isOpen={state.showSaveDialog}
          onClose={handleSaveDialogClose}
          searchQuery={state.currentQuery}
          onSave={handleSaveSuccess}
        />
      )}

      {/* Saved Searches Management Panel */}
      {enableSavedSearches && state.showManagementPanel && (
        <SavedSearchesManagementPanel
          isOpen={state.showManagementPanel}
          onClose={handleManagementClose}
          onSearchSelect={handleSavedSearchSelect}
        />
      )}
    </div>
  );
};

export default EnhancedSearchBar;