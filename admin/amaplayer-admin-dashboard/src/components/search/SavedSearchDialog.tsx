import React, { useState, useEffect } from 'react';
import { SearchQuery, SavedSearch } from '../../types/models/search';
import SavedSearchService from '../../services/search/savedSearchService';
import LoadingSpinner from '../common/ui/LoadingSpinner';
import SearchQueryUtils from '../../utils/search/searchQueryUtils';

interface SavedSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: SearchQuery;
  onSave?: (savedSearch: SavedSearch) => void;
  existingSavedSearch?: SavedSearch | null;
}

interface DialogState {
  name: string;
  isLoading: boolean;
  error: string | null;
  existingSearches: SavedSearch[];
  showOverwriteConfirm: boolean;
  conflictingSearch: SavedSearch | null;
}

const SavedSearchDialog: React.FC<SavedSearchDialogProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSave,
  existingSavedSearch = null
}) => {
  const [state, setState] = useState<DialogState>({
    name: existingSavedSearch?.name || '',
    isLoading: false,
    error: null,
    existingSearches: [],
    showOverwriteConfirm: false,
    conflictingSearch: null
  });

  // Load existing searches when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadExistingSearches();
    }
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setState({
        name: existingSavedSearch?.name || '',
        isLoading: false,
        error: null,
        existingSearches: [],
        showOverwriteConfirm: false,
        conflictingSearch: null
      });
    }
  }, [isOpen, existingSavedSearch]);

  const loadExistingSearches = async () => {
    try {
      const searches = await SavedSearchService.getSavedSearches();
      setState(prev => ({ ...prev, existingSearches: searches }));
    } catch (error) {
      console.error('Error loading existing searches:', error);
    }
  };

  const handleNameChange = (newName: string) => {
    setState(prev => ({ 
      ...prev, 
      name: newName, 
      error: null,
      showOverwriteConfirm: false,
      conflictingSearch: null
    }));
  };

  const handleSave = async () => {
    if (!state.name.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a name for this search' }));
      return;
    }

    // Check for name conflicts (excluding current search if editing)
    const conflictingSearch = state.existingSearches.find(search => 
      search.name.toLowerCase() === state.name.trim().toLowerCase() &&
      search.id !== existingSavedSearch?.id
    );

    if (conflictingSearch && !state.showOverwriteConfirm) {
      setState(prev => ({ 
        ...prev, 
        showOverwriteConfirm: true,
        conflictingSearch
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const savedSearch = await SavedSearchService.saveSearch(state.name.trim(), searchQuery);
      
      if (onSave) {
        onSave(savedSearch);
      }
      
      onClose();
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error.message || 'Failed to save search'
      }));
    }
  };

  const handleOverwriteConfirm = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const savedSearch = await SavedSearchService.saveSearch(state.name.trim(), searchQuery);
      
      if (onSave) {
        onSave(savedSearch);
      }
      
      onClose();
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error.message || 'Failed to save search'
      }));
    }
  };

  const handleOverwriteCancel = () => {
    setState(prev => ({ 
      ...prev, 
      showOverwriteConfirm: false,
      conflictingSearch: null
    }));
  };

  const generateSuggestedName = (): string => {
    return SearchQueryUtils.generateSuggestedName(searchQuery);
  };

  const handleSuggestName = () => {
    const suggestedName = generateSuggestedName();
    setState(prev => ({ ...prev, name: suggestedName }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {existingSavedSearch ? 'Update Saved Search' : 'Save Search'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Search Preview */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Search Preview:</h3>
            <div className="text-sm text-gray-600">
              <div>{SearchQueryUtils.getQueryDescription(searchQuery)}</div>
              {SearchQueryUtils.hasActiveFilters(searchQuery) && (
                <div className="mt-1 text-xs text-gray-500">
                  {SearchQueryUtils.getActiveFilterCount(searchQuery)} filter{SearchQueryUtils.getActiveFilterCount(searchQuery) > 1 ? 's' : ''} applied
                </div>
              )}
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-4">
            <label htmlFor="search-name" className="block text-sm font-medium text-gray-700 mb-2">
              Search Name
            </label>
            <div className="flex gap-2">
              <input
                id="search-name"
                type="text"
                value={state.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter a name for this search..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
                disabled={state.isLoading}
              />
              <button
                type="button"
                onClick={handleSuggestName}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
                disabled={state.isLoading}
              >
                Suggest
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {state.name.length}/100 characters
            </div>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700">{state.error}</span>
              </div>
            </div>
          )}

          {/* Overwrite Confirmation */}
          {state.showOverwriteConfirm && state.conflictingSearch && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800">
                    A search with this name already exists
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    "{state.conflictingSearch.name}" will be overwritten with the new search criteria.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleOverwriteConfirm}
                      disabled={state.isLoading}
                      className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {state.isLoading ? <LoadingSpinner size="sm" /> : 'Overwrite'}
                    </button>
                    <button
                      onClick={handleOverwriteCancel}
                      disabled={state.isLoading}
                      className="px-3 py-1 text-sm text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={state.isLoading}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={state.isLoading || !state.name.trim() || state.showOverwriteConfirm}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {state.isLoading && <LoadingSpinner size="sm" />}
            {existingSavedSearch ? 'Update' : 'Save'} Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavedSearchDialog;