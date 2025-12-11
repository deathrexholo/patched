import { SearchQuery, SearchFilters } from '../../types/models/search';

/**
 * Utility functions for search query manipulation and compatibility
 */
export class SearchQueryUtils {
  /**
   * Check if two search queries are equivalent
   */
  static areQueriesEquivalent(query1: SearchQuery, query2: SearchQuery): boolean {
    return (
      query1.term === query2.term &&
      query1.searchType === query2.searchType &&
      this.areFiltersEquivalent(query1.filters, query2.filters)
    );
  }

  /**
   * Check if two filter objects are equivalent
   */
  static areFiltersEquivalent(filters1: SearchFilters, filters2: SearchFilters): boolean {
    const keys1 = Object.keys(filters1);
    const keys2 = Object.keys(filters2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false;
      }

      const value1 = filters1[key as keyof SearchFilters];
      const value2 = filters2[key as keyof SearchFilters];

      if (!this.areFilterValuesEqual(value1, value2)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if two filter values are equal
   */
  private static areFilterValuesEqual(value1: any, value2: any): boolean {
    if (value1 === value2) return true;
    if (value1 == null || value2 == null) return value1 === value2;

    // Handle arrays
    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) return false;
      return value1.every((item, index) => item === value2[index]);
    }

    // Handle date ranges
    if (value1.start && value1.end && value2.start && value2.end) {
      return (
        new Date(value1.start).getTime() === new Date(value2.start).getTime() &&
        new Date(value1.end).getTime() === new Date(value2.end).getTime() &&
        value1.field === value2.field
      );
    }

    // Handle age ranges
    if (value1.min !== undefined && value1.max !== undefined) {
      return value1.min === value2.min && value1.max === value2.max;
    }

    return false;
  }

  /**
   * Merge search queries, with the second query taking precedence
   */
  static mergeQueries(baseQuery: SearchQuery, overrideQuery: Partial<SearchQuery>): SearchQuery {
    return {
      ...baseQuery,
      ...overrideQuery,
      filters: {
        ...baseQuery.filters,
        ...overrideQuery.filters
      }
    };
  }

  /**
   * Sanitize search query to ensure it's valid
   */
  static sanitizeQuery(query: SearchQuery): SearchQuery {
    return {
      term: query.term?.trim() || '',
      searchType: query.searchType || 'all',
      filters: this.sanitizeFilters(query.filters || {}),
      sortBy: query.sortBy || 'relevance',
      sortOrder: query.sortOrder || 'desc',
      limit: Math.min(Math.max(query.limit || 20, 1), 100),
      offset: Math.max(query.offset || 0, 0),
      fuzzyMatching: query.fuzzyMatching !== false,
      exactMatch: query.exactMatch || false,
      booleanOperators: query.booleanOperators || []
    };
  }

  /**
   * Sanitize search filters
   */
  static sanitizeFilters(filters: SearchFilters): SearchFilters {
    const sanitized: SearchFilters = {};

    // Date range
    if (filters.dateRange) {
      const { start, end, field } = filters.dateRange;
      if (start && end && field) {
        sanitized.dateRange = {
          start: new Date(start),
          end: new Date(end),
          field
        };
      }
    }

    // Arrays
    if (filters.role?.length) {
      sanitized.role = [...new Set(filters.role)]; // Remove duplicates
    }
    if (filters.status?.length) {
      sanitized.status = [...new Set(filters.status)];
    }
    if (filters.verificationStatus?.length) {
      sanitized.verificationStatus = [...new Set(filters.verificationStatus)];
    }
    if (filters.category?.length) {
      sanitized.category = [...new Set(filters.category)];
    }
    if (filters.eventStatus?.length) {
      sanitized.eventStatus = [...new Set(filters.eventStatus)];
    }

    // Strings
    if (filters.location?.trim()) {
      sanitized.location = filters.location.trim();
    }
    if (filters.sport?.trim()) {
      sanitized.sport = filters.sport.trim();
    }

    // Age range
    if (filters.ageRange && filters.ageRange.min !== undefined && filters.ageRange.max !== undefined) {
      const min = Math.max(0, Math.min(filters.ageRange.min, 150));
      const max = Math.max(min, Math.min(filters.ageRange.max, 150));
      sanitized.ageRange = { min, max };
    }

    return sanitized;
  }

  /**
   * Check if a search query has any active filters
   */
  static hasActiveFilters(query: SearchQuery): boolean {
    const filters = query.filters;
    if (!filters) return false;

    return !!(
      filters.dateRange ||
      filters.role?.length ||
      filters.status?.length ||
      filters.verificationStatus?.length ||
      filters.category?.length ||
      filters.eventStatus?.length ||
      filters.location?.trim() ||
      filters.sport?.trim() ||
      filters.ageRange
    );
  }

  /**
   * Get a human-readable description of the search query
   */
  static getQueryDescription(query: SearchQuery): string {
    const parts: string[] = [];

    if (query.term?.trim()) {
      parts.push(`"${query.term}"`);
    }

    if (query.searchType !== 'all') {
      parts.push(`in ${query.searchType}`);
    }

    const filterCount = this.getActiveFilterCount(query);
    if (filterCount > 0) {
      parts.push(`${filterCount} filter${filterCount > 1 ? 's' : ''}`);
    }

    return parts.join(' • ') || 'Empty search';
  }

  /**
   * Get the number of active filters in a search query
   */
  static getActiveFilterCount(query: SearchQuery): number {
    const filters = query.filters;
    if (!filters) return 0;

    let count = 0;

    if (filters.dateRange) count++;
    if (filters.role?.length) count++;
    if (filters.status?.length) count++;
    if (filters.verificationStatus?.length) count++;
    if (filters.category?.length) count++;
    if (filters.eventStatus?.length) count++;
    if (filters.location?.trim()) count++;
    if (filters.sport?.trim()) count++;
    if (filters.ageRange) count++;

    return count;
  }

  /**
   * Create a search query from a search term and type
   */
  static createBasicQuery(term: string, searchType: SearchQuery['searchType'] = 'all'): SearchQuery {
    return {
      term: term.trim(),
      searchType,
      filters: {},
      limit: 20,
      fuzzyMatching: true
    };
  }

  /**
   * Check if a search query is valid for saving
   */
  static isValidForSaving(query: SearchQuery): { valid: boolean; reason?: string } {
    if (!query.term?.trim() && !this.hasActiveFilters(query)) {
      return { valid: false, reason: 'Search must have either a search term or filters' };
    }

    if (query.term && query.term.length > 500) {
      return { valid: false, reason: 'Search term is too long' };
    }

    return { valid: true };
  }

  /**
   * Generate a suggested name for a search query
   */
  static generateSuggestedName(query: SearchQuery): string {
    const parts: string[] = [];

    if (query.term?.trim()) {
      // Use first few words of the search term
      const words = query.term.trim().split(/\s+/).slice(0, 3);
      parts.push(words.join(' '));
    }

    if (query.searchType !== 'all') {
      parts.push(`(${query.searchType})`);
    }

    // Add filter information
    const filters = query.filters;
    if (filters) {
      if (filters.role?.length === 1) {
        parts.push(`- ${filters.role[0]}`);
      }
      if (filters.status?.length === 1) {
        parts.push(`- ${filters.status[0]}`);
      }
      if (filters.location) {
        parts.push(`- ${filters.location}`);
      }
      if (filters.sport) {
        parts.push(`- ${filters.sport}`);
      }
    }

    const name = parts.join(' ');
    
    // Fallback names
    if (!name.trim()) {
      if (this.hasActiveFilters(query)) {
        return `Filtered ${query.searchType} search`;
      }
      return `${query.searchType} search`;
    }

    return name.length > 50 ? name.substring(0, 47) + '...' : name;
  }

  /**
   * Check if a saved search is compatible with current filter options
   * This is useful when filter options change over time
   */
  static checkCompatibility(query: SearchQuery, availableOptions: {
    roles?: string[];
    statuses?: string[];
    verificationStatuses?: string[];
    categories?: string[];
    eventStatuses?: string[];
  }): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];
    const filters = query.filters;

    if (!filters) {
      return { compatible: true, issues: [] };
    }

    // Check role compatibility
    if (filters.role?.length && availableOptions.roles) {
      const invalidRoles = filters.role.filter(role => !availableOptions.roles!.includes(role));
      if (invalidRoles.length > 0) {
        issues.push(`Invalid roles: ${invalidRoles.join(', ')}`);
      }
    }

    // Check status compatibility
    if (filters.status?.length && availableOptions.statuses) {
      const invalidStatuses = filters.status.filter(status => !availableOptions.statuses!.includes(status));
      if (invalidStatuses.length > 0) {
        issues.push(`Invalid statuses: ${invalidStatuses.join(', ')}`);
      }
    }

    // Check verification status compatibility
    if (filters.verificationStatus?.length && availableOptions.verificationStatuses) {
      const invalidStatuses = filters.verificationStatus.filter(
        status => !availableOptions.verificationStatuses!.includes(status)
      );
      if (invalidStatuses.length > 0) {
        issues.push(`Invalid verification statuses: ${invalidStatuses.join(', ')}`);
      }
    }

    // Check category compatibility
    if (filters.category?.length && availableOptions.categories) {
      const invalidCategories = filters.category.filter(
        category => !availableOptions.categories!.includes(category)
      );
      if (invalidCategories.length > 0) {
        issues.push(`Invalid categories: ${invalidCategories.join(', ')}`);
      }
    }

    // Check event status compatibility
    if (filters.eventStatus?.length && availableOptions.eventStatuses) {
      const invalidStatuses = filters.eventStatus.filter(
        status => !availableOptions.eventStatuses!.includes(status)
      );
      if (invalidStatuses.length > 0) {
        issues.push(`Invalid event statuses: ${invalidStatuses.join(', ')}`);
      }
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * Fix compatibility issues in a search query
   */
  static fixCompatibilityIssues(query: SearchQuery, availableOptions: {
    roles?: string[];
    statuses?: string[];
    verificationStatuses?: string[];
    categories?: string[];
    eventStatuses?: string[];
  }): SearchQuery {
    const fixedQuery = { ...query };
    const filters = { ...query.filters };

    // Fix role issues
    if (filters.role?.length && availableOptions.roles) {
      filters.role = filters.role.filter(role => availableOptions.roles!.includes(role));
      if (filters.role.length === 0) {
        delete filters.role;
      }
    }

    // Fix status issues
    if (filters.status?.length && availableOptions.statuses) {
      filters.status = filters.status.filter(status => availableOptions.statuses!.includes(status));
      if (filters.status.length === 0) {
        delete filters.status;
      }
    }

    // Fix verification status issues
    if (filters.verificationStatus?.length && availableOptions.verificationStatuses) {
      filters.verificationStatus = filters.verificationStatus.filter(
        status => availableOptions.verificationStatuses!.includes(status)
      );
      if (filters.verificationStatus.length === 0) {
        delete filters.verificationStatus;
      }
    }

    // Fix category issues
    if (filters.category?.length && availableOptions.categories) {
      filters.category = filters.category.filter(
        category => availableOptions.categories!.includes(category)
      );
      if (filters.category.length === 0) {
        delete filters.category;
      }
    }

    // Fix event status issues
    if (filters.eventStatus?.length && availableOptions.eventStatuses) {
      filters.eventStatus = filters.eventStatus.filter(
        status => availableOptions.eventStatuses!.includes(status)
      );
      if (filters.eventStatus.length === 0) {
        delete filters.eventStatus;
      }
    }

    fixedQuery.filters = filters;
    return fixedQuery;
  }
}

export default SearchQueryUtils;