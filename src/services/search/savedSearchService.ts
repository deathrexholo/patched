import { SavedSearch, SearchQuery, SearchError, SearchErrorType } from '../../types/models/search';

/**
 * Service for managing saved searches using local storage
 */
export class SavedSearchService {
  private static readonly STORAGE_KEY = 'admin_saved_searches';
  private static readonly MAX_SAVED_SEARCHES = 50;

  /**
   * Get all saved searches from local storage
   */
  static async getSavedSearches(): Promise<SavedSearch[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const searches: SavedSearch[] = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      return searches.map(search => ({
        ...search,
        createdAt: new Date(search.createdAt),
        lastUsed: search.lastUsed ? new Date(search.lastUsed) : undefined,
        query: {
          ...search.query,
          filters: {
            ...search.query.filters,
            dateRange: search.query.filters.dateRange ? {
              ...search.query.filters.dateRange,
              start: new Date(search.query.filters.dateRange.start),
              end: new Date(search.query.filters.dateRange.end)
            } : undefined
          }
        }
      }));
    } catch (error) {
      console.error('Error loading saved searches:', error);
      return [];
    }
  }

  /**
   * Save a new search query with a custom name
   */
  static async saveSearch(name: string, query: SearchQuery): Promise<SavedSearch> {
    try {
      // Validate input
      const validationError = this.validateSavedSearch(name, query);
      if (validationError) {
        throw validationError;
      }

      const searches = await this.getSavedSearches();
      
      // Check if name already exists
      const existingIndex = searches.findIndex(search => search.name === name);
      
      const savedSearch: SavedSearch = {
        id: existingIndex >= 0 ? searches[existingIndex].id : this.generateId(),
        name: name.trim(),
        query: this.sanitizeQuery(query),
        createdAt: existingIndex >= 0 ? searches[existingIndex].createdAt : new Date(),
        lastUsed: new Date(),
        useCount: existingIndex >= 0 ? searches[existingIndex].useCount + 1 : 1
      };

      if (existingIndex >= 0) {
        // Update existing search
        searches[existingIndex] = savedSearch;
      } else {
        // Add new search
        searches.push(savedSearch);
        
        // Enforce maximum limit
        if (searches.length > this.MAX_SAVED_SEARCHES) {
          // Remove oldest searches (by creation date)
          searches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          searches.splice(0, searches.length - this.MAX_SAVED_SEARCHES);
        }
      }

      await this.storeSavedSearches(searches);
      return savedSearch;
    } catch (error) {
      console.error('Error saving search:', error);
      throw this.createError(SearchErrorType.NETWORK_ERROR, 'Failed to save search', error);
    }
  }

  /**
   * Delete a saved search by ID
   */
  static async deleteSavedSearch(id: string): Promise<void> {
    try {
      const searches = await this.getSavedSearches();
      const filteredSearches = searches.filter(search => search.id !== id);
      
      if (filteredSearches.length === searches.length) {
        throw this.createError(SearchErrorType.INVALID_QUERY, 'Saved search not found');
      }

      await this.storeSavedSearches(filteredSearches);
    } catch (error) {
      console.error('Error deleting saved search:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw this.createError(SearchErrorType.NETWORK_ERROR, 'Failed to delete saved search', error);
    }
  }

  /**
   * Update a saved search
   */
  static async updateSavedSearch(id: string, updates: Partial<Pick<SavedSearch, 'name' | 'query'>>): Promise<SavedSearch> {
    try {
      const searches = await this.getSavedSearches();
      const searchIndex = searches.findIndex(search => search.id === id);
      
      if (searchIndex === -1) {
        throw this.createError(SearchErrorType.INVALID_QUERY, 'Saved search not found');
      }

      const existingSearch = searches[searchIndex];
      
      // Validate updates
      if (updates.name !== undefined) {
        const nameValidation = this.validateSearchName(updates.name);
        if (nameValidation) {
          throw nameValidation;
        }
        
        // Check for name conflicts (excluding current search)
        const nameExists = searches.some(search => 
          search.id !== id && search.name === updates.name?.trim()
        );
        if (nameExists) {
          throw this.createError(SearchErrorType.INVALID_QUERY, 'A saved search with this name already exists');
        }
      }

      if (updates.query !== undefined) {
        const queryValidation = this.validateSearchQuery(updates.query);
        if (queryValidation) {
          throw queryValidation;
        }
      }

      // Apply updates
      const updatedSearch: SavedSearch = {
        ...existingSearch,
        name: updates.name?.trim() ?? existingSearch.name,
        query: updates.query ? this.sanitizeQuery(updates.query) : existingSearch.query,
        lastUsed: new Date()
      };

      searches[searchIndex] = updatedSearch;
      await this.storeSavedSearches(searches);
      
      return updatedSearch;
    } catch (error) {
      console.error('Error updating saved search:', error);
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('already exists'))) {
        throw error;
      }
      throw this.createError(SearchErrorType.NETWORK_ERROR, 'Failed to update saved search', error);
    }
  }

  /**
   * Get a saved search by ID
   */
  static async getSavedSearchById(id: string): Promise<SavedSearch | null> {
    try {
      const searches = await this.getSavedSearches();
      return searches.find(search => search.id === id) || null;
    } catch (error) {
      console.error('Error getting saved search:', error);
      return null;
    }
  }

  /**
   * Update the last used timestamp and use count for a saved search
   */
  static async markSearchAsUsed(id: string): Promise<void> {
    try {
      const searches = await this.getSavedSearches();
      const searchIndex = searches.findIndex(search => search.id === id);
      
      if (searchIndex >= 0) {
        searches[searchIndex].lastUsed = new Date();
        searches[searchIndex].useCount += 1;
        await this.storeSavedSearches(searches);
      }
    } catch (error) {
      console.error('Error marking search as used:', error);
      // Don't throw error for this operation as it's not critical
    }
  }

  /**
   * Get frequently used saved searches (sorted by use count)
   */
  static async getFrequentlyUsedSearches(limit: number = 5): Promise<SavedSearch[]> {
    try {
      const searches = await this.getSavedSearches();
      return searches
        .sort((a, b) => b.useCount - a.useCount)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting frequently used searches:', error);
      return [];
    }
  }

  /**
   * Clear all saved searches
   */
  static async clearAllSavedSearches(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing saved searches:', error);
      throw this.createError(SearchErrorType.NETWORK_ERROR, 'Failed to clear saved searches', error);
    }
  }

  /**
   * Export saved searches as JSON
   */
  static async exportSavedSearches(): Promise<string> {
    try {
      const searches = await this.getSavedSearches();
      return JSON.stringify(searches, null, 2);
    } catch (error) {
      console.error('Error exporting saved searches:', error);
      throw this.createError(SearchErrorType.NETWORK_ERROR, 'Failed to export saved searches', error);
    }
  }

  /**
   * Import saved searches from JSON
   */
  static async importSavedSearches(jsonData: string, overwrite: boolean = false): Promise<number> {
    try {
      const importedSearches: SavedSearch[] = JSON.parse(jsonData);
      
      // Validate imported data
      if (!Array.isArray(importedSearches)) {
        throw this.createError(SearchErrorType.INVALID_QUERY, 'Invalid import data format');
      }

      const validSearches = importedSearches.filter(search => {
        const validation = this.validateSavedSearch(search.name, search.query);
        return !validation;
      });

      if (validSearches.length === 0) {
        throw this.createError(SearchErrorType.INVALID_QUERY, 'No valid searches found in import data');
      }

      let existingSearches = overwrite ? [] : await this.getSavedSearches();
      
      // Merge searches, avoiding duplicates by name
      const mergedSearches = [...existingSearches];
      let importedCount = 0;

      for (const importedSearch of validSearches) {
        const existingIndex = mergedSearches.findIndex(search => search.name === importedSearch.name);
        
        if (existingIndex >= 0) {
          if (overwrite) {
            mergedSearches[existingIndex] = {
              ...importedSearch,
              id: mergedSearches[existingIndex].id,
              createdAt: new Date(importedSearch.createdAt),
              lastUsed: importedSearch.lastUsed ? new Date(importedSearch.lastUsed) : undefined
            };
            importedCount++;
          }
        } else {
          mergedSearches.push({
            ...importedSearch,
            id: this.generateId(),
            createdAt: new Date(importedSearch.createdAt),
            lastUsed: importedSearch.lastUsed ? new Date(importedSearch.lastUsed) : undefined
          });
          importedCount++;
        }
      }

      // Enforce maximum limit
      if (mergedSearches.length > this.MAX_SAVED_SEARCHES) {
        mergedSearches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        mergedSearches.splice(0, mergedSearches.length - this.MAX_SAVED_SEARCHES);
      }

      await this.storeSavedSearches(mergedSearches);
      return importedCount;
    } catch (error) {
      console.error('Error importing saved searches:', error);
      if (error instanceof Error && error.message.includes('Invalid')) {
        throw error;
      }
      throw this.createError(SearchErrorType.NETWORK_ERROR, 'Failed to import saved searches', error);
    }
  }

  // Private helper methods

  private static async storeSavedSearches(searches: SavedSearch[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(searches));
    } catch (error) {
      throw this.createError(SearchErrorType.NETWORK_ERROR, 'Failed to store saved searches', error);
    }
  }

  private static validateSavedSearch(name: string, query: SearchQuery): SearchError | null {
    const nameError = this.validateSearchName(name);
    if (nameError) return nameError;

    const queryError = this.validateSearchQuery(query);
    if (queryError) return queryError;

    return null;
  }

  private static validateSearchName(name: string): SearchError | null {
    if (!name || typeof name !== 'string') {
      return this.createError(SearchErrorType.INVALID_QUERY, 'Search name is required');
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return this.createError(SearchErrorType.INVALID_QUERY, 'Search name cannot be empty');
    }

    if (trimmedName.length > 100) {
      return this.createError(SearchErrorType.INVALID_QUERY, 'Search name cannot exceed 100 characters');
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_()]+$/.test(trimmedName)) {
      return this.createError(SearchErrorType.INVALID_QUERY, 'Search name contains invalid characters');
    }

    return null;
  }

  private static validateSearchQuery(query: SearchQuery): SearchError | null {
    if (!query || typeof query !== 'object') {
      return this.createError(SearchErrorType.INVALID_QUERY, 'Invalid search query');
    }

    if (!query.searchType || !['users', 'videos', 'events', 'all'].includes(query.searchType)) {
      return this.createError(SearchErrorType.INVALID_QUERY, 'Invalid search type');
    }

    if (query.term && typeof query.term !== 'string') {
      return this.createError(SearchErrorType.INVALID_QUERY, 'Search term must be a string');
    }

    if (query.filters && typeof query.filters !== 'object') {
      return this.createError(SearchErrorType.INVALID_QUERY, 'Invalid search filters');
    }

    return null;
  }

  private static sanitizeQuery(query: SearchQuery): SearchQuery {
    return {
      ...query,
      term: query.term?.trim() || '',
      filters: query.filters || {},
      sortBy: query.sortBy || 'relevance',
      sortOrder: query.sortOrder || 'desc',
      limit: Math.min(query.limit || 20, 100),
      offset: Math.max(query.offset || 0, 0)
    };
  }

  private static generateId(): string {
    return `saved_search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static createError(type: SearchErrorType, message: string, details?: any): SearchError {
    return {
      type,
      message,
      details,
      retryable: type === SearchErrorType.NETWORK_ERROR || type === SearchErrorType.TIMEOUT
    };
  }
}

export default SavedSearchService;