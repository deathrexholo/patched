import React, { useState, useEffect } from 'react';
import { SearchQuery, SavedSearch } from '../../types/models/search';
import SavedSearchService from '../../services/search/savedSearchService';
import SavedSearchDialog from './SavedSearchDialog';
import LoadingSpinner from '../common/ui/LoadingSpinner';

interface SavedSearchesManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchSelect?: (savedSearch: SavedSearch) => void;
  className?: string;
}

interface ManagementState {
  savedSearches: SavedSearch[];
  isLoading: boolean;
  error: string | null;
  selectedSearches: Set<string>;
  sortBy: 'name' | 'created' | 'lastUsed' | 'useCount';
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
  filteredSearches: SavedSearch[];
  showEditDialog: boolean;
  editingSearch: SavedSearch | null;
  showDeleteConfirm: boolean;
  deletingSearches: SavedSearch[];
  showExportDialog: boolean;
  showImportDialog: boolean;
  importData: string;
  importOverwrite: boolean;
}

const SavedSearchesManagementPanel: React.FC<SavedSearchesManagementPanelProps> = ({
  isOpen,
  onClose,
  onSearchSelect,
  className = ''
}) => {
  const [state, setState] = useState<ManagementState>({
    savedSearches: [],
    isLoading: false,
    error: null,
    selectedSearches: new Set(),
    sortBy: 'lastUsed',
    sortOrder: 'desc',
    searchTerm: '',
    filteredSearches: [],
    showEditDialog: false,
    editingSearch: null,
    showDeleteConfirm: false,
    deletingSearches: [],
    showExportDialog: false,
    showImportDialog: false,
    importData: '',
    importOverwrite: false
  });

  // Load saved searches when panel opens
  useEffect(() => {
    if (isOpen) {
      loadSavedSearches();
    }
  }, [isOpen]);

  // Filter and sort searches
  useEffect(() => {
    let filtered = state.savedSearches;

    // Apply search filter
    if (state.searchTerm.trim()) {
      filtered = filtered.filter(search =>
        search.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        search.query.term.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'lastUsed':
          aValue = a.lastUsed?.getTime() || 0;
          bValue = b.lastUsed?.getTime() || 0;
          break;
        case 'useCount':
          aValue = a.useCount;
          bValue = b.useCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return state.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return state.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setState(prev => ({ ...prev, filteredSearches: filtered }));
  }, [state.savedSearches, state.searchTerm, state.sortBy, state.sortOrder]);

  const loadSavedSearches = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const searches = await SavedSearchService.getSavedSearches();
      setState(prev => ({
        ...prev,
        savedSearches: searches,
        isLoading: false,
        selectedSearches: new Set()
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load saved searches',
        isLoading: false
      }));
    }
  };

  const handleSearchSelect = (savedSearch: SavedSearch) => {
    if (onSearchSelect) {
      onSearchSelect(savedSearch);
      onClose();
    }
  };

  const handleEditSearch = (savedSearch: SavedSearch) => {
    setState(prev => ({
      ...prev,
      editingSearch: savedSearch,
      showEditDialog: true
    }));
  };

  const handleDeleteSearch = (savedSearch: SavedSearch) => {
    setState(prev => ({
      ...prev,
      deletingSearches: [savedSearch],
      showDeleteConfirm: true
    }));
  };

  const handleBulkDelete = () => {
    const searchesToDelete = state.savedSearches.filter(search =>
      state.selectedSearches.has(search.id)
    );
    setState(prev => ({
      ...prev,
      deletingSearches: searchesToDelete,
      showDeleteConfirm: true
    }));
  };

  const confirmDelete = async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await Promise.all(
        state.deletingSearches.map(search =>
          SavedSearchService.deleteSavedSearch(search.id)
        )
      );
      
      await loadSavedSearches();
      setState(prev => ({
        ...prev,
        showDeleteConfirm: false,
        deletingSearches: [],
        selectedSearches: new Set()
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to delete searches',
        isLoading: false
      }));
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set(state.filteredSearches.map(search => search.id));
    setState(prev => ({ ...prev, selectedSearches: allIds }));
  };

  const handleSelectNone = () => {
    setState(prev => ({ ...prev, selectedSearches: new Set() }));
  };

  const handleSearchToggle = (searchId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedSearches);
      if (newSelected.has(searchId)) {
        newSelected.delete(searchId);
      } else {
        newSelected.add(searchId);
      }
      return { ...prev, selectedSearches: newSelected };
    });
  };

  const handleExport = async () => {
    try {
      const exportData = await SavedSearchService.exportSavedSearches();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saved-searches-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setState(prev => ({ ...prev, showExportDialog: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || 'Failed to export searches' }));
    }
  };

  const handleImport = async () => {
    if (!state.importData.trim()) {
      setState(prev => ({ ...prev, error: 'Please paste the import data' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const importedCount = await SavedSearchService.importSavedSearches(
        state.importData,
        state.importOverwrite
      );
      
      await loadSavedSearches();
      setState(prev => ({
        ...prev,
        showImportDialog: false,
        importData: '',
        importOverwrite: false,
        error: null
      }));
      
      // Show success message (you might want to use a toast notification here)
      alert(`Successfully imported ${importedCount} saved searches`);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to import searches',
        isLoading: false
      }));
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatSearchPreview = (savedSearch: SavedSearch): string => {
    const { query } = savedSearch;
    const parts: string[] = [];
    
    if (query.term) parts.push(`"${query.term}"`);
    if (query.searchType !== 'all') parts.push(`in ${query.searchType}`);
    
    const filterCount = Object.keys(query.filters).length;
    if (filterCount > 0) parts.push(`${filterCount} filter${filterCount > 1 ? 's' : ''}`);
    
    return parts.join(' • ') || 'No criteria';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden ${className}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Manage Saved Searches</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={state.searchTerm}
                    onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                    placeholder="Search saved searches..."
                    className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <svg className="absolute left-2 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Sort */}
                <select
                  value={`${state.sortBy}-${state.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as [typeof state.sortBy, typeof state.sortOrder];
                    setState(prev => ({ ...prev, sortBy, sortOrder }));
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="lastUsed-desc">Last Used (Recent)</option>
                  <option value="lastUsed-asc">Last Used (Oldest)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="created-desc">Created (Recent)</option>
                  <option value="created-asc">Created (Oldest)</option>
                  <option value="useCount-desc">Most Used</option>
                  <option value="useCount-asc">Least Used</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {/* Bulk actions */}
                {state.selectedSearches.size > 0 && (
                  <>
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Delete Selected ({state.selectedSearches.size})
                    </button>
                    <div className="w-px h-6 bg-gray-300" />
                  </>
                )}

                {/* Export/Import */}
                <button
                  onClick={() => setState(prev => ({ ...prev, showExportDialog: true }))}
                  className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, showImportDialog: true }))}
                  className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Import
                </button>
              </div>
            </div>

            {/* Selection controls */}
            {state.filteredSearches.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <button
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={handleSelectNone}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Select None
                </button>
                <span>
                  {state.selectedSearches.size} of {state.filteredSearches.length} selected
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-96">
            {state.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-600">Loading saved searches...</span>
              </div>
            ) : state.error ? (
              <div className="p-6 text-center">
                <div className="text-red-600 mb-4">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>{state.error}</div>
                </div>
                <button
                  onClick={loadSavedSearches}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            ) : state.filteredSearches.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {state.searchTerm ? 'No matching saved searches found' : 'No saved searches yet'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {state.filteredSearches.map((savedSearch) => (
                  <div key={savedSearch.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={state.selectedSearches.has(savedSearch.id)}
                        onChange={() => handleSearchToggle(savedSearch.id)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900 mb-1">
                              {savedSearch.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {formatSearchPreview(savedSearch)}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Created: {formatDate(savedSearch.createdAt)}</span>
                              <span>Used: {savedSearch.useCount} times</span>
                              {savedSearch.lastUsed && (
                                <span>Last used: {formatDate(savedSearch.lastUsed)}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {onSearchSelect && (
                              <button
                                onClick={() => handleSearchSelect(savedSearch)}
                                className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                              >
                                Use
                              </button>
                            )}
                            <button
                              onClick={() => handleEditSearch(savedSearch)}
                              className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSearch(savedSearch)}
                              className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {state.filteredSearches.length} of {state.savedSearches.length} searches
                {state.searchTerm && ' (filtered)'}
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {state.showEditDialog && state.editingSearch && (
        <SavedSearchDialog
          isOpen={state.showEditDialog}
          onClose={() => setState(prev => ({ ...prev, showEditDialog: false, editingSearch: null }))}
          searchQuery={state.editingSearch.query}
          existingSavedSearch={state.editingSearch}
          onSave={() => {
            loadSavedSearches();
            setState(prev => ({ ...prev, showEditDialog: false, editingSearch: null }));
          }}
        />
      )}

      {/* Delete Confirmation */}
      {state.showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm Deletion
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete {state.deletingSearches.length} saved search{state.deletingSearches.length !== 1 ? 'es' : ''}? 
                This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false, deletingSearches: [] }))}
                  disabled={state.isLoading}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={state.isLoading}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {state.isLoading && <LoadingSpinner size="sm" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {state.showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Export Saved Searches
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                This will download all your saved searches as a JSON file that can be imported later.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setState(prev => ({ ...prev, showExportDialog: false }))}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {state.showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Import Saved Searches
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste JSON data:
                </label>
                <textarea
                  value={state.importData}
                  onChange={(e) => setState(prev => ({ ...prev, importData: e.target.value }))}
                  placeholder="Paste the exported JSON data here..."
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={state.importOverwrite}
                    onChange={(e) => setState(prev => ({ ...prev, importOverwrite: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Overwrite existing searches with same names
                  </span>
                </label>
              </div>
              {state.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-700">{state.error}</div>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    showImportDialog: false, 
                    importData: '', 
                    importOverwrite: false,
                    error: null
                  }))}
                  disabled={state.isLoading}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={state.isLoading || !state.importData.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {state.isLoading && <LoadingSpinner size="sm" />}
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SavedSearchesManagementPanel;