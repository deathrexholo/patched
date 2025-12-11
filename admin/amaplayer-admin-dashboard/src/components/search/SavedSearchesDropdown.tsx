import React, { useState, useEffect, useRef } from 'react';
import { SavedSearch } from '../../types/models/search';
import SavedSearchService from '../../services/search/savedSearchService';
import LoadingSpinner from '../common/ui/LoadingSpinner';

interface SavedSearchesDropdownProps {
  isVisible: boolean;
  onClose: () => void;
  onSearchSelect: (savedSearch: SavedSearch) => void;
  onManageSearches?: () => void;
  className?: string;
}

interface DropdownState {
  savedSearches: SavedSearch[];
  frequentSearches: SavedSearch[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  filteredSearches: SavedSearch[];
}

const SavedSearchesDropdown: React.FC<SavedSearchesDropdownProps> = ({
  isVisible,
  onClose,
  onSearchSelect,
  onManageSearches,
  className = ''
}) => {
  const [state, setState] = useState<DropdownState>({
    savedSearches: [],
    frequentSearches: [],
    isLoading: false,
    error: null,
    searchTerm: '',
    filteredSearches: []
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load saved searches when dropdown becomes visible
  useEffect(() => {
    if (isVisible) {
      loadSavedSearches();
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  // Filter searches based on search term
  useEffect(() => {
    if (state.searchTerm.trim()) {
      const filtered = state.savedSearches.filter(search =>
        search.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        search.query.term.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
      setState(prev => ({ ...prev, filteredSearches: filtered }));
    } else {
      setState(prev => ({ ...prev, filteredSearches: state.savedSearches }));
    }
  }, [state.searchTerm, state.savedSearches]);

  const loadSavedSearches = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [allSearches, frequentSearches] = await Promise.all([
        SavedSearchService.getSavedSearches(),
        SavedSearchService.getFrequentlyUsedSearches(5)
      ]);

      setState(prev => ({
        ...prev,
        savedSearches: allSearches,
        frequentSearches,
        filteredSearches: allSearches,
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load saved searches',
        isLoading: false
      }));
    }
  };

  const handleSearchSelect = async (savedSearch: SavedSearch) => {
    try {
      // Mark search as used
      await SavedSearchService.markSearchAsUsed(savedSearch.id);
      onSearchSelect(savedSearch);
      onClose();
    } catch (error) {
      console.error('Error marking search as used:', error);
      // Still proceed with search selection even if tracking fails
      onSearchSelect(savedSearch);
      onClose();
    }
  };

  const handleSearchTermChange = (newTerm: string) => {
    setState(prev => ({ ...prev, searchTerm: newTerm }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatLastUsed = (date?: Date): string => {
    if (!date) return 'Never used';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const formatSearchPreview = (savedSearch: SavedSearch): string => {
    const { query } = savedSearch;
    const parts: string[] = [];
    
    if (query.term) {
      parts.push(`"${query.term}"`);
    }
    
    if (query.searchType !== 'all') {
      parts.push(`in ${query.searchType}`);
    }
    
    const filterCount = Object.keys(query.filters).length;
    if (filterCount > 0) {
      parts.push(`${filterCount} filter${filterCount > 1 ? 's' : ''}`);
    }
    
    return parts.join(' • ') || 'No criteria';
  };

  if (!isVisible) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Header with search */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">Saved Searches</h3>
          {onManageSearches && (
            <button
              onClick={onManageSearches}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Manage
            </button>
          )}
        </div>
        
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={state.searchTerm}
            onChange={(e) => handleSearchTermChange(e.target.value)}
            placeholder="Search saved searches..."
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute right-2 top-1.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {state.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-gray-600">Loading saved searches...</span>
          </div>
        ) : state.error ? (
          <div className="p-4 text-center">
            <div className="text-red-600 text-sm mb-2">
              <svg className="w-5 h-5 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {state.error}
            </div>
            <button
              onClick={loadSavedSearches}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : state.filteredSearches.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {state.searchTerm ? 'No matching saved searches found' : 'No saved searches yet'}
          </div>
        ) : (
          <>
            {/* Frequent searches section */}
            {!state.searchTerm && state.frequentSearches.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Frequently Used
                </div>
                {state.frequentSearches.map((savedSearch) => (
                  <button
                    key={`frequent-${savedSearch.id}`}
                    onClick={() => handleSearchSelect(savedSearch)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {savedSearch.name}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {savedSearch.useCount}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {formatSearchPreview(savedSearch)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 ml-2">
                        {formatLastUsed(savedSearch.lastUsed)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* All searches section */}
            <div>
              {!state.searchTerm && state.frequentSearches.length > 0 && (
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  All Searches
                </div>
              )}
              {state.filteredSearches.map((savedSearch) => {
                // Skip if already shown in frequent searches
                const isFrequent = state.frequentSearches.some(fs => fs.id === savedSearch.id);
                if (!state.searchTerm && isFrequent) return null;

                return (
                  <button
                    key={savedSearch.id}
                    onClick={() => handleSearchSelect(savedSearch)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {savedSearch.name}
                          </span>
                          {savedSearch.useCount > 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {savedSearch.useCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {formatSearchPreview(savedSearch)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 ml-2">
                        {formatLastUsed(savedSearch.lastUsed)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {!state.isLoading && !state.error && state.savedSearches.length > 0 && (
        <div className="p-2 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            {state.savedSearches.length} saved search{state.savedSearches.length !== 1 ? 'es' : ''}
            {state.searchTerm && ` • ${state.filteredSearches.length} matching`}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedSearchesDropdown;