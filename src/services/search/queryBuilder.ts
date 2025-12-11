/**
 * Search Query Builder
 * Builds Firestore queries with boolean operators and complex filters
 */

import {
  Query,
  DocumentData,
  query,
  collection,
  where,
  orderBy,
  limit,
  startAfter,
  WhereFilterOp,
  OrderByDirection,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SearchQuery, SearchFilters, SearchType } from '@/types/models/search';
import { fuzzyMatcher } from './fuzzyMatcher';

interface QueryConstraint {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

interface OrderConstraint {
  field: string;
  direction: OrderByDirection;
}

class QueryBuilder {
  /**
   * Build Firestore query from search parameters
   */
  buildQuery(searchQuery: SearchQuery, lastDoc?: DocumentData): Query<DocumentData> {
    const { searchType, term, filters, sortBy, sortOrder, limit: queryLimit } = searchQuery;
    
    // Get base collection
    const baseQuery = this._getBaseCollection(searchType);
    
    // Build constraints
    const constraints: QueryConstraint[] = [];
    const orderConstraints: OrderConstraint[] = [];
    
    // Add text search constraints
    if (term.trim()) {
      this._addTextSearchConstraints(constraints, term, searchType);
    }
    
    // Add filter constraints
    this._addFilterConstraints(constraints, filters);
    
    // Add sorting
    this._addSortConstraints(orderConstraints, sortBy, sortOrder);
    
    // Build final query
    let finalQuery = baseQuery;
    
    // Apply where constraints
    for (const constraint of constraints) {
      finalQuery = query(finalQuery, where(constraint.field, constraint.operator, constraint.value));
    }
    
    // Apply order constraints
    for (const orderConstraint of orderConstraints) {
      finalQuery = query(finalQuery, orderBy(orderConstraint.field, orderConstraint.direction));
    }
    
    // Apply pagination
    if (lastDoc) {
      finalQuery = query(finalQuery, startAfter(lastDoc));
    }
    
    // Apply limit
    if (queryLimit) {
      finalQuery = query(finalQuery, limit(queryLimit));
    }
    
    return finalQuery;
  }

  /**
   * Build query for auto-complete suggestions
   */
  buildAutoCompleteQuery(term: string, searchType: SearchType): Query<DocumentData> {
    const baseQuery = this._getBaseCollection(searchType);
    
    // For auto-complete, we'll search for documents that start with the term
    const endTerm = term + '\uf8ff'; // Unicode character for range queries
    
    let finalQuery = baseQuery;
    
    // Add constraints based on search type
    switch (searchType) {
      case 'users':
        finalQuery = query(
          finalQuery,
          where('displayName', '>=', term),
          where('displayName', '<=', endTerm),
          orderBy('displayName'),
          limit(10)
        );
        break;
        
      case 'events':
        finalQuery = query(
          finalQuery,
          where('title', '>=', term),
          where('title', '<=', endTerm),
          orderBy('title'),
          limit(10)
        );
        break;
        
      case 'videos':
        finalQuery = query(
          finalQuery,
          where('title', '>=', term),
          where('title', '<=', endTerm),
          orderBy('title'),
          limit(10)
        );
        break;
    }
    
    return finalQuery;
  }

  /**
   * Parse boolean query and build multiple queries
   */
  buildBooleanQuery(searchQuery: SearchQuery): Query<DocumentData>[] {
    const { term } = searchQuery;
    
    if (!fuzzyMatcher.hasBooleanOperators(term)) {
      return [this.buildQuery(searchQuery)];
    }
    
    const parsed = fuzzyMatcher.parseBooleanQuery(term);
    const queries: Query<DocumentData>[] = [];
    
    // For now, we'll create separate queries for each term
    // In a more advanced implementation, we'd handle complex boolean logic
    for (const parsedTerm of parsed.terms) {
      if (parsedTerm.trim()) {
        const termQuery = {
          ...searchQuery,
          term: parsedTerm.trim()
        };
        queries.push(this.buildQuery(termQuery));
      }
    }
    
    return queries.length > 0 ? queries : [this.buildQuery(searchQuery)];
  }

  /**
   * Build query for analytics data collection
   */
  buildAnalyticsQuery(dateRange: { start: Date; end: Date }): Query<DocumentData> {
    const analyticsCollection = collection(db, 'searchAnalytics');
    
    return query(
      analyticsCollection,
      where('timestamp', '>=', Timestamp.fromDate(dateRange.start)),
      where('timestamp', '<=', Timestamp.fromDate(dateRange.end)),
      orderBy('timestamp', 'desc')
    );
  }

  /**
   * Get base collection reference
   */
  private _getBaseCollection(searchType: SearchType): Query<DocumentData> {
    switch (searchType) {
      case 'users':
        return query(collection(db, 'users'));
      case 'events':
        return query(collection(db, 'events'));
      case 'videos':
        return query(collection(db, 'videos'));
      case 'all':
        // For 'all', we'll default to users and handle multiple collections separately
        return query(collection(db, 'users'));
      default:
        throw new Error(`Unsupported search type: ${searchType}`);
    }
  }

  /**
   * Add text search constraints
   */
  private _addTextSearchConstraints(
    constraints: QueryConstraint[],
    term: string,
    searchType: SearchType
  ): void {
    const searchTerm = term.toLowerCase().trim();
    
    switch (searchType) {
      case 'users':
        // Search in display name, email, and username
        constraints.push({
          field: 'displayName',
          operator: '>=',
          value: searchTerm
        });
        constraints.push({
          field: 'displayName',
          operator: '<=',
          value: searchTerm + '\uf8ff'
        });
        break;
        
      case 'events':
        // Search in title and description
        constraints.push({
          field: 'title',
          operator: '>=',
          value: searchTerm
        });
        constraints.push({
          field: 'title',
          operator: '<=',
          value: searchTerm + '\uf8ff'
        });
        break;
        
      case 'videos':
        // Search in title and description
        constraints.push({
          field: 'title',
          operator: '>=',
          value: searchTerm
        });
        constraints.push({
          field: 'title',
          operator: '<=',
          value: searchTerm + '\uf8ff'
        });
        break;
    }
  }

  /**
   * Add filter constraints
   */
  private _addFilterConstraints(
    constraints: QueryConstraint[],
    filters: SearchFilters
  ): void {
    // Date range filter
    if (filters.dateRange) {
      const { start, end, field } = filters.dateRange;
      constraints.push({
        field,
        operator: '>=',
        value: Timestamp.fromDate(start)
      });
      constraints.push({
        field,
        operator: '<=',
        value: Timestamp.fromDate(end)
      });
    }

    // Role filter (for users)
    if (filters.role && filters.role.length > 0) {
      constraints.push({
        field: 'role',
        operator: 'in',
        value: filters.role
      });
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      constraints.push({
        field: 'isActive',
        operator: '==',
        value: filters.status.includes('active')
      });
    }

    // Location filter
    if (filters.location) {
      constraints.push({
        field: 'location',
        operator: '>=',
        value: filters.location.toLowerCase()
      });
      constraints.push({
        field: 'location',
        operator: '<=',
        value: filters.location.toLowerCase() + '\uf8ff'
      });
    }

    // Sport filter
    if (filters.sport) {
      constraints.push({
        field: 'sports',
        operator: 'array-contains',
        value: filters.sport
      });
    }

    // Verification status filter (for videos)
    if (filters.verificationStatus && filters.verificationStatus.length > 0) {
      constraints.push({
        field: 'verificationStatus',
        operator: 'in',
        value: filters.verificationStatus
      });
    }

    // Event status filter
    if (filters.eventStatus && filters.eventStatus.length > 0) {
      constraints.push({
        field: 'status',
        operator: 'in',
        value: filters.eventStatus
      });
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
      constraints.push({
        field: 'category',
        operator: 'in',
        value: filters.category
      });
    }
  }

  /**
   * Add sort constraints
   */
  private _addSortConstraints(
    orderConstraints: OrderConstraint[],
    sortBy?: string,
    sortOrder?: string
  ): void {
    const direction: OrderByDirection = sortOrder === 'desc' ? 'desc' : 'asc';
    
    switch (sortBy) {
      case 'date':
        orderConstraints.push({ field: 'createdAt', direction });
        break;
      case 'name':
        orderConstraints.push({ field: 'displayName', direction });
        break;
      case 'status':
        orderConstraints.push({ field: 'isActive', direction });
        break;
      case 'relevance':
      default:
        // For relevance, we'll sort by creation date as a fallback
        orderConstraints.push({ field: 'createdAt', direction: 'desc' });
        break;
    }
  }

  /**
   * Validate query constraints
   */
  validateQuery(searchQuery: SearchQuery): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check search term
    if (!searchQuery.term.trim() && Object.keys(searchQuery.filters).length === 0) {
      errors.push('Search term or filters are required');
    }

    // Check search type
    if (!['users', 'videos', 'events', 'all'].includes(searchQuery.searchType)) {
      errors.push('Invalid search type');
    }

    // Check limit
    if (searchQuery.limit && (searchQuery.limit < 1 || searchQuery.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }

    // Check date range
    if (searchQuery.filters.dateRange) {
      const { start, end } = searchQuery.filters.dateRange;
      if (start >= end) {
        errors.push('Start date must be before end date');
      }
    }

    // Check age range
    if (searchQuery.filters.ageRange) {
      const { min, max } = searchQuery.filters.ageRange;
      if (min < 0 || max < 0 || min > max) {
        errors.push('Invalid age range');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get estimated query cost (for optimization)
   */
  getQueryCost(searchQuery: SearchQuery): number {
    let cost = 1; // Base cost

    // Text search increases cost
    if (searchQuery.term.trim()) {
      cost += 2;
    }

    // Each filter increases cost
    const filterCount = Object.keys(searchQuery.filters).length;
    cost += filterCount;

    // Boolean operators increase cost significantly
    if (fuzzyMatcher.hasBooleanOperators(searchQuery.term)) {
      cost *= 3;
    }

    // Large limits increase cost
    if (searchQuery.limit && searchQuery.limit > 50) {
      cost += 2;
    }

    return cost;
  }
}

// Create singleton instance
const queryBuilder = new QueryBuilder();

export default queryBuilder;
export { queryBuilder, QueryBuilder };