/**
 * Firestore Query Optimizer
 * Optimizes Firestore queries and manages composite indexes
 */

import { 
  Query, 
  QueryConstraint, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentSnapshot,
  CollectionReference
} from 'firebase/firestore';
import { SearchQuery, SearchFilters } from '@/types/models/search';
import { searchPerformanceMonitor } from './searchPerformanceMonitor';

interface QueryOptimization {
  originalQuery: SearchQuery;
  optimizedConstraints: QueryConstraint[];
  estimatedCost: number;
  indexRequirements: string[];
  recommendations: string[];
}

interface IndexDefinition {
  collection: string;
  fields: Array<{
    fieldPath: string;
    order?: 'ASCENDING' | 'DESCENDING';
  }>;
  queryScope: 'COLLECTION' | 'COLLECTION_GROUP';
}

interface QueryPerformanceMetrics {
  queryType: string;
  executionTime: number;
  resultCount: number;
  indexesUsed: string[];
  cost: number;
}

class FirestoreQueryOptimizer {
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private recommendedIndexes: IndexDefinition[] = [];
  private queryPatterns = new Map<string, number>();

  /**
   * Optimize a search query for Firestore
   */
  optimizeQuery(
    collection: CollectionReference,
    searchQuery: SearchQuery,
    lastDoc?: DocumentSnapshot
  ): QueryOptimization {
    const startTime = performance.now();
    
    const constraints: QueryConstraint[] = [];
    const indexRequirements: string[] = [];
    const recommendations: string[] = [];
    let estimatedCost = 1;

    // Track query pattern
    this.trackQueryPattern(searchQuery);

    // Build optimized constraints
    if (searchQuery.term && searchQuery.term.trim()) {
      const termConstraints = this.buildTextSearchConstraints(searchQuery.term);
      constraints.push(...termConstraints.constraints);
      indexRequirements.push(...termConstraints.indexes);
      estimatedCost += termConstraints.cost;
    }

    // Add filter constraints
    if (searchQuery.filters) {
      const filterConstraints = this.buildFilterConstraints(searchQuery.filters);
      constraints.push(...filterConstraints.constraints);
      indexRequirements.push(...filterConstraints.indexes);
      estimatedCost += filterConstraints.cost;
      recommendations.push(...filterConstraints.recommendations);
    }

    // Add sorting constraints
    if (searchQuery.sortBy) {
      const sortConstraints = this.buildSortConstraints(searchQuery.sortBy, searchQuery.sortOrder);
      constraints.push(...sortConstraints.constraints);
      indexRequirements.push(...sortConstraints.indexes);
      estimatedCost += sortConstraints.cost;
    }

    // Add pagination
    if (searchQuery.limit) {
      constraints.push(limit(searchQuery.limit));
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    // Optimize constraint order
    const optimizedConstraints = this.optimizeConstraintOrder(constraints);

    // Generate index recommendations
    this.generateIndexRecommendations(searchQuery, indexRequirements);

    const executionTime = performance.now() - startTime;
    
    // Record optimization metrics
    searchPerformanceMonitor.recordSearch(
      searchQuery,
      executionTime,
      0, // Result count not known yet
      false,
      false
    );

    return {
      originalQuery: searchQuery,
      optimizedConstraints,
      estimatedCost,
      indexRequirements,
      recommendations
    };
  }

  /**
   * Build text search constraints with optimization
   */
  private buildTextSearchConstraints(term: string): {
    constraints: QueryConstraint[];
    indexes: string[];
    cost: number;
  } {
    const constraints: QueryConstraint[] = [];
    const indexes: string[] = [];
    let cost = 1;

    const normalizedTerm = term.toLowerCase().trim();

    // For exact matches, use equality constraint
    if (normalizedTerm.length < 50 && !normalizedTerm.includes(' ')) {
      constraints.push(where('searchTerms', 'array-contains', normalizedTerm));
      indexes.push('searchTerms (array)');
      cost = 1;
    } else {
      // For complex terms, use range queries
      const termStart = normalizedTerm;
      const termEnd = normalizedTerm + '\uf8ff';
      
      constraints.push(
        where('displayName', '>=', termStart),
        where('displayName', '<=', termEnd)
      );
      
      indexes.push('displayName (ascending)');
      cost = 2;
    }

    return { constraints, indexes, cost };
  }

  /**
   * Build filter constraints with optimization
   */
  private buildFilterConstraints(filters: SearchFilters): {
    constraints: QueryConstraint[];
    indexes: string[];
    recommendations: string[];
    cost: number;
  } {
    const constraints: QueryConstraint[] = [];
    const indexes: string[] = [];
    const recommendations: string[] = [];
    let cost = 0;

    // Date range filters
    if (filters.dateRange) {
      const field = filters.dateRange.field || 'createdAt';
      constraints.push(
        where(field, '>=', filters.dateRange.start),
        where(field, '<=', filters.dateRange.end)
      );
      indexes.push(`${field} (ascending)`);
      cost += 2;
    }

    // Status filters (most selective first)
    if (filters.status && filters.status.length > 0) {
      if (filters.status.length === 1) {
        constraints.push(where('status', '==', filters.status[0]));
        indexes.push('status (ascending)');
        cost += 1;
      } else {
        constraints.push(where('status', 'in', filters.status));
        indexes.push('status (ascending)');
        cost += 2;
      }
    }

    // Role filters
    if (filters.role && filters.role.length > 0) {
      if (filters.role.length === 1) {
        constraints.push(where('role', '==', filters.role[0]));
        indexes.push('role (ascending)');
        cost += 1;
      } else {
        constraints.push(where('role', 'in', filters.role));
        indexes.push('role (ascending)');
        cost += 2;
      }
    }

    // Location filter
    if (filters.location) {
      constraints.push(where('location', '>=', filters.location));
      constraints.push(where('location', '<=', filters.location + '\uf8ff'));
      indexes.push('location (ascending)');
      cost += 2;
    }

    // Sport filter
    if (filters.sport) {
      constraints.push(where('sport', '==', filters.sport));
      indexes.push('sport (ascending)');
      cost += 1;
    }

    // Age range filter
    if (filters.ageRange) {
      if (filters.ageRange.min !== undefined) {
        constraints.push(where('age', '>=', filters.ageRange.min));
        cost += 1;
      }
      if (filters.ageRange.max !== undefined) {
        constraints.push(where('age', '<=', filters.ageRange.max));
        cost += 1;
      }
      if (filters.ageRange.min !== undefined || filters.ageRange.max !== undefined) {
        indexes.push('age (ascending)');
      }
    }

    // Verification status filters
    if (filters.verificationStatus && filters.verificationStatus.length > 0) {
      if (filters.verificationStatus.length === 1) {
        constraints.push(where('verificationStatus', '==', filters.verificationStatus[0]));
      } else {
        constraints.push(where('verificationStatus', 'in', filters.verificationStatus));
      }
      indexes.push('verificationStatus (ascending)');
      cost += 1;
    }

    // Category filters
    if (filters.category && filters.category.length > 0) {
      constraints.push(where('category', 'array-contains-any', filters.category));
      indexes.push('category (array)');
      cost += 2;
    }

    // Event status filters
    if (filters.eventStatus && filters.eventStatus.length > 0) {
      if (filters.eventStatus.length === 1) {
        constraints.push(where('eventStatus', '==', filters.eventStatus[0]));
      } else {
        constraints.push(where('eventStatus', 'in', filters.eventStatus));
      }
      indexes.push('eventStatus (ascending)');
      cost += 1;
    }

    // Generate recommendations for complex queries
    if (cost > 5) {
      recommendations.push('Consider reducing the number of filters to improve query performance');
    }

    if (constraints.length > 10) {
      recommendations.push('Query has many constraints, consider using composite indexes');
    }

    return { constraints, indexes, recommendations, cost };
  }

  /**
   * Build sort constraints with optimization
   */
  private buildSortConstraints(sortBy: string, sortOrder?: 'asc' | 'desc'): {
    constraints: QueryConstraint[];
    indexes: string[];
    cost: number;
  } {
    const constraints: QueryConstraint[] = [];
    const indexes: string[] = [];
    let cost = 1;

    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    
    // Add primary sort
    constraints.push(orderBy(sortBy, order));
    indexes.push(`${sortBy} (${order}ending)`);

    // Add secondary sort for consistency
    if (sortBy !== 'createdAt') {
      constraints.push(orderBy('createdAt', 'desc'));
      indexes.push('createdAt (descending)');
      cost += 1;
    }

    return { constraints, indexes, cost };
  }

  /**
   * Optimize the order of query constraints
   */
  private optimizeConstraintOrder(constraints: QueryConstraint[]): QueryConstraint[] {
    // Firestore query optimization rules:
    // 1. Equality constraints first
    // 2. Range constraints second
    // 3. Array-contains constraints third
    // 4. Order by constraints last
    // 5. Limit constraint last

    const equalityConstraints: QueryConstraint[] = [];
    const rangeConstraints: QueryConstraint[] = [];
    const arrayConstraints: QueryConstraint[] = [];
    const orderConstraints: QueryConstraint[] = [];
    const limitConstraints: QueryConstraint[] = [];
    const otherConstraints: QueryConstraint[] = [];

    constraints.forEach(constraint => {
      const constraintStr = constraint.toString();
      
      if (constraintStr.includes('==')) {
        equalityConstraints.push(constraint);
      } else if (constraintStr.includes('>=') || constraintStr.includes('<=') || 
                 constraintStr.includes('>') || constraintStr.includes('<')) {
        rangeConstraints.push(constraint);
      } else if (constraintStr.includes('array-contains')) {
        arrayConstraints.push(constraint);
      } else if (constraintStr.includes('orderBy')) {
        orderConstraints.push(constraint);
      } else if (constraintStr.includes('limit')) {
        limitConstraints.push(constraint);
      } else {
        otherConstraints.push(constraint);
      }
    });

    return [
      ...equalityConstraints,
      ...rangeConstraints,
      ...arrayConstraints,
      ...otherConstraints,
      ...orderConstraints,
      ...limitConstraints
    ];
  }

  /**
   * Generate composite index recommendations
   */
  private generateIndexRecommendations(query: SearchQuery, indexRequirements: string[]): void {
    if (indexRequirements.length <= 1) return;

    const collection = this.getCollectionName(query.searchType);
    const fields = this.extractFieldsFromIndexRequirements(indexRequirements);

    const indexDef: IndexDefinition = {
      collection,
      fields: fields.map(field => ({
        fieldPath: field.name,
        order: field.order
      })),
      queryScope: 'COLLECTION'
    };

    // Check if this index is already recommended
    const exists = this.recommendedIndexes.some(existing => 
      existing.collection === indexDef.collection &&
      JSON.stringify(existing.fields) === JSON.stringify(indexDef.fields)
    );

    if (!exists) {
      this.recommendedIndexes.push(indexDef);
    }
  }

  /**
   * Get query performance recommendations
   */
  getPerformanceRecommendations(): Array<{
    type: 'index' | 'query' | 'pagination';
    priority: 'high' | 'medium' | 'low';
    description: string;
    implementation: string;
    impact: string;
  }> {
    const recommendations = [];

    // Analyze query patterns
    const slowQueries = this.queryMetrics
      .filter(metric => metric.executionTime > 1000)
      .slice(0, 5);

    if (slowQueries.length > 0) {
      recommendations.push({
        type: 'query' as const,
        priority: 'high' as const,
        description: `${slowQueries.length} queries are executing slowly (>1s)`,
        implementation: 'Optimize query constraints and add appropriate indexes',
        impact: 'Reduce query execution time by 50-80%'
      });
    }

    // Check for missing indexes
    if (this.recommendedIndexes.length > 0) {
      recommendations.push({
        type: 'index' as const,
        priority: 'high' as const,
        description: `${this.recommendedIndexes.length} composite indexes recommended`,
        implementation: 'Create the recommended composite indexes in Firestore',
        impact: 'Significantly improve query performance and reduce costs'
      });
    }

    // Check for inefficient pagination
    const largeLimitQueries = this.queryMetrics
      .filter(metric => metric.resultCount > 100);

    if (largeLimitQueries.length > 0) {
      recommendations.push({
        type: 'pagination' as const,
        priority: 'medium' as const,
        description: 'Some queries return large result sets',
        implementation: 'Implement cursor-based pagination with smaller page sizes',
        impact: 'Reduce memory usage and improve response times'
      });
    }

    return recommendations;
  }

  /**
   * Get recommended composite indexes
   */
  getRecommendedIndexes(): IndexDefinition[] {
    return [...this.recommendedIndexes];
  }

  /**
   * Generate Firestore index configuration
   */
  generateFirestoreIndexes(): string {
    const indexes = this.recommendedIndexes.map(index => ({
      collectionGroup: index.collection,
      queryScope: index.queryScope,
      fields: index.fields
    }));

    return JSON.stringify({ indexes }, null, 2);
  }

  /**
   * Record query performance metrics
   */
  recordQueryPerformance(
    queryType: string,
    executionTime: number,
    resultCount: number,
    indexesUsed: string[] = [],
    cost: number = 1
  ): void {
    this.queryMetrics.push({
      queryType,
      executionTime,
      resultCount,
      indexesUsed,
      cost
    });

    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  /**
   * Get query performance analytics
   */
  getQueryAnalytics(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    mostCommonPatterns: Array<{ pattern: string; count: number }>;
    indexUsage: Array<{ index: string; usage: number }>;
  } {
    const totalQueries = this.queryMetrics.length;
    const averageExecutionTime = totalQueries > 0
      ? this.queryMetrics.reduce((sum, metric) => sum + metric.executionTime, 0) / totalQueries
      : 0;
    
    const slowQueries = this.queryMetrics.filter(metric => metric.executionTime > 1000).length;

    const mostCommonPatterns = Array.from(this.queryPatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const indexUsage = new Map<string, number>();
    this.queryMetrics.forEach(metric => {
      metric.indexesUsed.forEach(index => {
        indexUsage.set(index, (indexUsage.get(index) || 0) + 1);
      });
    });

    const indexUsageArray = Array.from(indexUsage.entries())
      .map(([index, usage]) => ({ index, usage }))
      .sort((a, b) => b.usage - a.usage);

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries,
      mostCommonPatterns,
      indexUsage: indexUsageArray
    };
  }

  /**
   * Private helper methods
   */
  private trackQueryPattern(query: SearchQuery): void {
    const pattern = this.generateQueryPattern(query);
    this.queryPatterns.set(pattern, (this.queryPatterns.get(pattern) || 0) + 1);
  }

  private generateQueryPattern(query: SearchQuery): string {
    const pattern = {
      searchType: query.searchType,
      hasText: !!query.term,
      filterCount: Object.keys(query.filters || {}).length,
      hasSorting: !!query.sortBy,
      hasLimit: !!query.limit
    };
    return JSON.stringify(pattern);
  }

  private getCollectionName(searchType: string): string {
    switch (searchType) {
      case 'users': return 'users';
      case 'videos': return 'talentVideos';
      case 'events': return 'events';
      default: return 'mixed';
    }
  }

  private extractFieldsFromIndexRequirements(requirements: string[]): Array<{
    name: string;
    order: 'ASCENDING' | 'DESCENDING';
  }> {
    return requirements.map(req => {
      const [fieldName, orderInfo] = req.split(' ');
      const order = orderInfo?.includes('desc') ? 'DESCENDING' : 'ASCENDING';
      return { name: fieldName, order };
    });
  }

  /**
   * Clear analytics data
   */
  clearAnalytics(): void {
    this.queryMetrics = [];
    this.queryPatterns.clear();
    this.recommendedIndexes = [];
  }
}

// Create singleton instance
const firestoreQueryOptimizer = new FirestoreQueryOptimizer();

export default firestoreQueryOptimizer;
export { firestoreQueryOptimizer, FirestoreQueryOptimizer };
export type { QueryOptimization, IndexDefinition, QueryPerformanceMetrics };