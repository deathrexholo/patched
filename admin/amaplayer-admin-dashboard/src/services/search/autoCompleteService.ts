/**
 * Auto-complete Service
 * Provides intelligent search suggestions based on existing data, popularity, and relevance
 */

import { SearchType, AutoCompleteSuggestion, SearchSuggestionOptions } from '../../types/models/search';
import { fuzzyMatcher } from './fuzzyMatcher';
import { searchCacheService } from './searchCacheService';

interface SuggestionData {
  text: string;
  type: 'term' | 'filter' | 'saved_search';
  category?: string;
  count: number;
  lastUsed: Date;
  popularity: number;
}

interface AutoCompleteConfig {
  maxSuggestions: number;
  cacheTimeout: number; // in milliseconds
  popularityWeight: number;
  recencyWeight: number;
  fuzzyThreshold: number;
}

const DEFAULT_CONFIG: AutoCompleteConfig = {
  maxSuggestions: 10,
  cacheTimeout: 300000, // 5 minutes
  popularityWeight: 0.6,
  recencyWeight: 0.4,
  fuzzyThreshold: 0.7
};

class AutoCompleteService {
  private config: AutoCompleteConfig;
  private suggestionData: Map<string, SuggestionData[]> = new Map();
  private popularTerms: Map<string, number> = new Map();
  private recentSearches: string[] = [];
  private cache: Map<string, { suggestions: AutoCompleteSuggestion[]; timestamp: number }> = new Map();

  constructor(config: AutoCompleteConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._loadSuggestionData();
  }

  /**
   * Get auto-complete suggestions for a search term
   */
  async getSuggestions(
    term: string,
    searchType: SearchType,
    options: Partial<SearchSuggestionOptions> = {}
  ): Promise<AutoCompleteSuggestion[]> {
    if (!term.trim()) {
      return [];
    }

    const cacheKey = this._generateCacheKey(term, searchType, options);
    
    // Check cache first
    const cached = this._getCachedSuggestions(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestionOptions: SearchSuggestionOptions = {
      maxSuggestions: this.config.maxSuggestions,
      includeHistory: true,
      includePopular: true,
      includeSavedSearches: true,
      fuzzyThreshold: this.config.fuzzyThreshold,
      ...options
    };

    const suggestions = await this._generateSuggestions(term, searchType, suggestionOptions);
    
    // Cache the results
    this._cacheSuggestions(cacheKey, suggestions);
    
    return suggestions;
  }

  /**
   * Update suggestion data based on search activity
   */
  updateSuggestionData(term: string, searchType: SearchType, resultCount: number): void {
    if (!term.trim()) return;

    // Update popular terms
    const currentCount = this.popularTerms.get(term) || 0;
    this.popularTerms.set(term, currentCount + 1);

    // Update recent searches
    this._addToRecentSearches(term);

    // Update suggestion data
    const typeKey = searchType;
    const suggestions = this.suggestionData.get(typeKey) || [];
    
    const existingIndex = suggestions.findIndex(s => s.text.toLowerCase() === term.toLowerCase());
    
    if (existingIndex >= 0) {
      // Update existing suggestion
      suggestions[existingIndex].count += 1;
      suggestions[existingIndex].lastUsed = new Date();
      suggestions[existingIndex].popularity = this._calculatePopularity(
        suggestions[existingIndex].count,
        suggestions[existingIndex].lastUsed
      );
    } else {
      // Add new suggestion
      const newSuggestion: SuggestionData = {
        text: term,
        type: 'term',
        count: 1,
        lastUsed: new Date(),
        popularity: this._calculatePopularity(1, new Date())
      };
      suggestions.push(newSuggestion);
    }

    this.suggestionData.set(typeKey, suggestions);
    this._saveSuggestionData();
    
    // Clear related cache entries
    this._invalidateCache(term, searchType);
  }

  /**
   * Add filter-based suggestions
   */
  addFilterSuggestion(filterType: string, filterValue: string, searchType: SearchType): void {
    const typeKey = searchType;
    const suggestions = this.suggestionData.get(typeKey) || [];
    
    const suggestionText = `${filterType}:${filterValue}`;
    const existingIndex = suggestions.findIndex(s => s.text === suggestionText);
    
    if (existingIndex >= 0) {
      suggestions[existingIndex].count += 1;
      suggestions[existingIndex].lastUsed = new Date();
    } else {
      const newSuggestion: SuggestionData = {
        text: suggestionText,
        type: 'filter',
        category: filterType,
        count: 1,
        lastUsed: new Date(),
        popularity: this._calculatePopularity(1, new Date())
      };
      suggestions.push(newSuggestion);
    }

    this.suggestionData.set(typeKey, suggestions);
    this._saveSuggestionData();
  }

  /**
   * Add saved search suggestions
   */
  addSavedSearchSuggestion(name: string, term: string, searchType: SearchType): void {
    const typeKey = searchType;
    const suggestions = this.suggestionData.get(typeKey) || [];
    
    const newSuggestion: SuggestionData = {
      text: name,
      type: 'saved_search',
      count: 0,
      lastUsed: new Date(),
      popularity: 0.5 // Default popularity for saved searches
    };
    
    suggestions.push(newSuggestion);
    this.suggestionData.set(typeKey, suggestions);
    this._saveSuggestionData();
  }

  /**
   * Get popular search terms
   */
  getPopularTerms(searchType: SearchType, limit: number = 10): string[] {
    const suggestions = this.suggestionData.get(searchType) || [];
    
    return suggestions
      .filter(s => s.type === 'term')
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
      .map(s => s.text);
  }

  /**
   * Get recent search terms
   */
  getRecentSearches(limit: number = 5): string[] {
    return this.recentSearches.slice(0, limit);
  }

  /**
   * Clear suggestion data
   */
  clearSuggestionData(searchType?: SearchType): void {
    if (searchType) {
      this.suggestionData.delete(searchType);
    } else {
      this.suggestionData.clear();
      this.popularTerms.clear();
      this.recentSearches = [];
    }
    
    this._saveSuggestionData();
    this.cache.clear();
  }

  /**
   * Get suggestion statistics
   */
  getStats() {
    const totalSuggestions = Array.from(this.suggestionData.values())
      .reduce((sum, suggestions) => sum + suggestions.length, 0);
    
    return {
      totalSuggestions,
      popularTermsCount: this.popularTerms.size,
      recentSearchesCount: this.recentSearches.length,
      cacheSize: this.cache.size,
      config: this.config
    };
  }

  /**
   * Generate suggestions based on input term and options
   */
  private async _generateSuggestions(
    term: string,
    searchType: SearchType,
    options: SearchSuggestionOptions
  ): Promise<AutoCompleteSuggestion[]> {
    const allSuggestions: AutoCompleteSuggestion[] = [];
    const lowerTerm = term.toLowerCase();

    // Get suggestions for the specific search type and 'all'
    const searchTypes = searchType === 'all' ? ['all', 'users', 'videos', 'events'] : [searchType, 'all'];
    
    for (const type of searchTypes) {
      const suggestions = this.suggestionData.get(type) || [];
      
      // Filter and score suggestions
      const scoredSuggestions = suggestions
        .map(suggestion => {
          const matchResult = fuzzyMatcher.isMatch(term, suggestion.text);
          
          if (!matchResult.match && !suggestion.text.toLowerCase().includes(lowerTerm)) {
            return null;
          }

          const relevanceScore = this._calculateRelevanceScore(
            suggestion,
            term,
            matchResult.score || 0
          );

          return {
            text: suggestion.text,
            type: suggestion.type,
            category: suggestion.category,
            count: suggestion.count,
            highlighted: this._highlightMatch(suggestion.text, term),
            score: relevanceScore
          };
        })
        .filter((s): s is any => s !== null && s.category !== undefined);

      allSuggestions.push(...scoredSuggestions);
    }

    // Add recent searches if enabled
    if (options.includeHistory) {
      const recentSuggestions = this.recentSearches
        .filter(recent => recent.toLowerCase().includes(lowerTerm))
        .slice(0, 3)
        .map(recent => ({
          text: recent,
          type: 'term' as const,
          highlighted: this._highlightMatch(recent, term),
          score: 0.3 // Lower score for recent searches
        }));
      
      allSuggestions.push(...recentSuggestions);
    }

    // Add popular terms if enabled
    if (options.includePopular) {
      const popularSuggestions = Array.from(this.popularTerms.entries())
        .filter(([popularTerm]) => 
          popularTerm.toLowerCase().includes(lowerTerm) &&
          !allSuggestions.some(s => s.text.toLowerCase() === popularTerm.toLowerCase())
        )
        .slice(0, 3)
        .map(([popularTerm, count]) => ({
          text: popularTerm,
          type: 'term' as const,
          count,
          highlighted: this._highlightMatch(popularTerm, term),
          score: 0.4 // Medium score for popular terms
        }));
      
      allSuggestions.push(...popularSuggestions);
    }

    // Remove duplicates and sort by score
    const uniqueSuggestions = this._removeDuplicates(allSuggestions);
    const sortedSuggestions = uniqueSuggestions
      .sort((a, b) => (b as any).score - (a as any).score)
      .slice(0, options.maxSuggestions);

    // Remove score property from final results
    return sortedSuggestions.map((item) => {
      const { score, ...suggestion } = item as any;
      return suggestion as AutoCompleteSuggestion;
    });
  }

  /**
   * Calculate relevance score for a suggestion
   */
  private _calculateRelevanceScore(
    suggestion: SuggestionData,
    term: string,
    fuzzyScore: number
  ): number {
    let score = 0;

    // Exact match gets highest score
    if (suggestion.text.toLowerCase() === term.toLowerCase()) {
      score += 1.0;
    }
    // Starts with term gets high score
    else if (suggestion.text.toLowerCase().startsWith(term.toLowerCase())) {
      score += 0.8;
    }
    // Contains term gets medium score
    else if (suggestion.text.toLowerCase().includes(term.toLowerCase())) {
      score += 0.6;
    }
    // Fuzzy match gets variable score
    else {
      score += fuzzyScore * 0.4;
    }

    // Add popularity boost
    score += suggestion.popularity * this.config.popularityWeight;

    // Add recency boost
    const daysSinceLastUsed = (Date.now() - suggestion.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSinceLastUsed / 30)); // Decay over 30 days
    score += recencyScore * this.config.recencyWeight;

    // Type-based boost
    switch (suggestion.type) {
      case 'saved_search':
        score += 0.2;
        break;
      case 'filter':
        score += 0.1;
        break;
      default:
        break;
    }

    return Math.min(score, 2.0); // Cap at 2.0
  }

  /**
   * Highlight matching text in suggestion
   */
  private _highlightMatch(text: string, term: string): string {
    if (!term.trim()) return text;

    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Remove duplicate suggestions
   */
  private _removeDuplicates(suggestions: AutoCompleteSuggestion[]): AutoCompleteSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = suggestion.text.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate popularity score based on count and recency
   */
  private _calculatePopularity(count: number, lastUsed: Date): number {
    const daysSinceLastUsed = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0.1, 1 - (daysSinceLastUsed / 30)); // Decay over 30 days
    return Math.log(count + 1) * recencyFactor;
  }

  /**
   * Add term to recent searches
   */
  private _addToRecentSearches(term: string): void {
    // Remove if already exists
    const existingIndex = this.recentSearches.indexOf(term);
    if (existingIndex >= 0) {
      this.recentSearches.splice(existingIndex, 1);
    }

    // Add to beginning
    this.recentSearches.unshift(term);

    // Keep only last 20 searches
    if (this.recentSearches.length > 20) {
      this.recentSearches = this.recentSearches.slice(0, 20);
    }
  }

  /**
   * Generate cache key
   */
  private _generateCacheKey(
    term: string,
    searchType: SearchType,
    options: Partial<SearchSuggestionOptions>
  ): string {
    return `autocomplete:${term.toLowerCase()}:${searchType}:${JSON.stringify(options)}`;
  }

  /**
   * Get cached suggestions
   */
  private _getCachedSuggestions(cacheKey: string): AutoCompleteSuggestion[] | null {
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
      return cached.suggestions;
    }

    // Remove expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache suggestions
   */
  private _cacheSuggestions(cacheKey: string, suggestions: AutoCompleteSuggestion[]): void {
    this.cache.set(cacheKey, {
      suggestions,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Invalidate cache entries related to a term
   */
  private _invalidateCache(term: string, searchType: SearchType): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(term.toLowerCase()) || key.includes(searchType)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Load suggestion data from localStorage
   */
  private _loadSuggestionData(): void {
    try {
      const stored = localStorage.getItem('autoCompleteSuggestions');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Load suggestion data
        if (data.suggestions) {
          for (const [key, suggestions] of Object.entries(data.suggestions)) {
            this.suggestionData.set(key, suggestions as SuggestionData[]);
          }
        }

        // Load popular terms
        if (data.popularTerms) {
          this.popularTerms = new Map(data.popularTerms);
        }

        // Load recent searches
        if (data.recentSearches) {
          this.recentSearches = data.recentSearches;
        }
      }
    } catch (error) {
      console.error('Error loading auto-complete suggestion data:', error);
    }
  }

  /**
   * Save suggestion data to localStorage
   */
  private _saveSuggestionData(): void {
    try {
      const data = {
        suggestions: Object.fromEntries(this.suggestionData.entries()),
        popularTerms: Array.from(this.popularTerms.entries()),
        recentSearches: this.recentSearches,
        timestamp: Date.now()
      };
      
      localStorage.setItem('autoCompleteSuggestions', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving auto-complete suggestion data:', error);
    }
  }
}

// Create singleton instance
const autoCompleteService = new AutoCompleteService();

export default autoCompleteService;
export { autoCompleteService, AutoCompleteService };
export type { AutoCompleteConfig, SuggestionData };