/**
 * Fuzzy Matching Service
 * Implements fuzzy string matching using Levenshtein distance algorithm
 */

interface FuzzyMatchOptions {
  maxDistance: number; // Maximum allowed edit distance
  caseSensitive: boolean;
  threshold: number; // Similarity threshold (0-1)
}

interface FuzzyMatchResult {
  match: boolean;
  score: number; // Similarity score (0-1, higher is better)
  distance: number; // Edit distance
}

const DEFAULT_OPTIONS: FuzzyMatchOptions = {
  maxDistance: 2,
  caseSensitive: false,
  threshold: 0.6
};

class FuzzyMatcher {
  private options: FuzzyMatchOptions;

  constructor(options: Partial<FuzzyMatchOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  calculateDistance(str1: string, str2: string): number {
    const s1 = this.options.caseSensitive ? str1 : str1.toLowerCase();
    const s2 = this.options.caseSensitive ? str2 : str2.toLowerCase();

    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    // Create matrix
    const matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  /**
   * Calculate similarity score (0-1, higher is better)
   */
  calculateSimilarity(str1: string, str2: string): number {
    const distance = this.calculateDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1; // Both strings are empty
    
    return 1 - (distance / maxLength);
  }

  /**
   * Check if two strings match within fuzzy criteria
   */
  isMatch(query: string, target: string): FuzzyMatchResult {
    const distance = this.calculateDistance(query, target);
    const score = this.calculateSimilarity(query, target);
    
    const match = distance <= this.options.maxDistance && score >= this.options.threshold;
    
    return {
      match,
      score,
      distance
    };
  }

  /**
   * Find fuzzy matches in an array of strings
   */
  findMatches(query: string, targets: string[]): Array<{ target: string; result: FuzzyMatchResult }> {
    return targets
      .map(target => ({
        target,
        result: this.isMatch(query, target)
      }))
      .filter(item => item.result.match)
      .sort((a, b) => b.result.score - a.result.score); // Sort by score descending
  }

  /**
   * Search for fuzzy matches in object properties
   */
  searchObjects<T>(
    query: string,
    objects: T[],
    searchFields: (keyof T)[]
  ): Array<{ object: T; matches: Array<{ field: keyof T; result: FuzzyMatchResult }> }> {
    const results: Array<{ object: T; matches: Array<{ field: keyof T; result: FuzzyMatchResult }> }> = [];

    for (const obj of objects) {
      const matches: Array<{ field: keyof T; result: FuzzyMatchResult }> = [];

      for (const field of searchFields) {
        const value = obj[field];
        if (typeof value === 'string') {
          const result = this.isMatch(query, value);
          if (result.match) {
            matches.push({ field, result });
          }
        }
      }

      if (matches.length > 0) {
        // Sort matches by score
        matches.sort((a, b) => b.result.score - a.result.score);
        results.push({ object: obj, matches });
      }
    }

    // Sort results by best match score
    results.sort((a, b) => {
      const bestScoreA = Math.max(...a.matches.map(m => m.result.score));
      const bestScoreB = Math.max(...b.matches.map(m => m.result.score));
      return bestScoreB - bestScoreA;
    });

    return results;
  }

  /**
   * Highlight matching parts of a string
   */
  highlightMatches(query: string, target: string, highlightTag = 'mark'): string {
    if (!this.isMatch(query, target).match) {
      return target;
    }

    const queryLower = this.options.caseSensitive ? query : query.toLowerCase();
    const targetLower = this.options.caseSensitive ? target : target.toLowerCase();

    // Simple highlighting for exact substring matches
    if (targetLower.includes(queryLower)) {
      const regex = new RegExp(
        this._escapeRegExp(query),
        this.options.caseSensitive ? 'g' : 'gi'
      );
      return target.replace(regex, `<${highlightTag}>$&</${highlightTag}>`);
    }

    // For fuzzy matches, highlight the entire string
    return `<${highlightTag}>${target}</${highlightTag}>`;
  }

  /**
   * Generate search suggestions based on fuzzy matching
   */
  generateSuggestions(query: string, dictionary: string[], maxSuggestions = 5): string[] {
    if (!query.trim()) return [];

    const matches = this.findMatches(query, dictionary);
    
    return matches
      .slice(0, maxSuggestions)
      .map(match => match.target);
  }

  /**
   * Check if query contains boolean operators
   */
  hasBooleanOperators(query: string): boolean {
    const operators = ['AND', 'OR', 'NOT', '&&', '||', '!'];
    const upperQuery = query.toUpperCase();
    
    return operators.some(op => upperQuery.includes(op));
  }

  /**
   * Parse boolean query into components
   */
  parseBooleanQuery(query: string): {
    terms: string[];
    operators: string[];
    structure: string;
  } {
    // Simple boolean query parsing
    const tokens = query.split(/\s+(AND|OR|NOT|&&|\|\||!)\s+/i);
    const terms: string[] = [];
    const operators: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        // Term
        terms.push(tokens[i].trim());
      } else {
        // Operator
        operators.push(tokens[i].toUpperCase());
      }
    }

    return {
      terms,
      operators,
      structure: query
    };
  }

  /**
   * Escape special regex characters
   */
  private _escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Update fuzzy matching options
   */
  updateOptions(options: Partial<FuzzyMatchOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): FuzzyMatchOptions {
    return { ...this.options };
  }
}

// Create singleton instance with default options
const fuzzyMatcher = new FuzzyMatcher();

// Export specialized matchers for different use cases
export const strictMatcher = new FuzzyMatcher({
  maxDistance: 1,
  threshold: 0.8,
  caseSensitive: false
});

export const relaxedMatcher = new FuzzyMatcher({
  maxDistance: 3,
  threshold: 0.4,
  caseSensitive: false
});

export const exactMatcher = new FuzzyMatcher({
  maxDistance: 0,
  threshold: 1.0,
  caseSensitive: false
});

export default fuzzyMatcher;
export { fuzzyMatcher, FuzzyMatcher };
export type { FuzzyMatchOptions, FuzzyMatchResult };