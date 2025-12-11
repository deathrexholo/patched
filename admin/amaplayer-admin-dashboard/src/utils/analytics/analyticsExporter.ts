/**
 * Analytics Export Utility
 * Comprehensive export functionality for search analytics data
 */

import { searchAnalyticsService, SearchAnalytics, SearchPerformanceMetrics } from '../../services/search/searchAnalyticsService';

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  dateRange: { start: Date; end: Date };
  includePerformanceMetrics: boolean;
  includeDetailedBreakdown: boolean;
  customFilename?: string;
}

export interface ExportProgress {
  stage: 'preparing' | 'fetching' | 'processing' | 'generating' | 'downloading' | 'complete';
  progress: number; // 0-100
  message: string;
}

class AnalyticsExporter {
  private progressCallback?: (progress: ExportProgress) => void;

  /**
   * Export analytics data with progress tracking
   */
  async exportAnalytics(
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    this.progressCallback = onProgress;

    try {
      this.updateProgress('preparing', 0, 'Preparing export...');

      // Fetch analytics data
      this.updateProgress('fetching', 20, 'Fetching analytics data...');
      const [analytics, performanceMetrics] = await Promise.all([
        searchAnalyticsService.getSearchAnalytics(options.dateRange),
        options.includePerformanceMetrics 
          ? searchAnalyticsService.getPerformanceMetrics(options.dateRange)
          : Promise.resolve(null)
      ]);

      this.updateProgress('processing', 50, 'Processing data...');

      // Generate export based on format
      let exportData: string | Blob;
      let filename: string;
      let mimeType: string;

      switch (options.format) {
        case 'csv':
          exportData = await this.generateCSV(analytics, performanceMetrics, options);
          filename = this.generateFilename(options, 'csv');
          mimeType = 'text/csv';
          break;
        case 'json':
          exportData = await this.generateJSON(analytics, performanceMetrics, options);
          filename = this.generateFilename(options, 'json');
          mimeType = 'application/json';
          break;
        case 'xlsx':
          exportData = await this.generateXLSX(analytics, performanceMetrics, options);
          filename = this.generateFilename(options, 'xlsx');
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      this.updateProgress('generating', 80, 'Generating file...');

      // Create and download file
      this.updateProgress('downloading', 90, 'Starting download...');
      await this.downloadFile(exportData, filename, mimeType);

      this.updateProgress('complete', 100, 'Export completed successfully!');

    } catch (error) {
      console.error('Export failed:', error);
      this.updateProgress('complete', 0, `Export failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate CSV export
   */
  private async generateCSV(
    analytics: SearchAnalytics,
    performanceMetrics: SearchPerformanceMetrics | null,
    options: ExportOptions
  ): Promise<string> {
    const rows: string[] = [];

    // Header information
    rows.push('Search Analytics Export');
    rows.push(`Export Date,${new Date().toISOString()}`);
    rows.push(`Date Range,${options.dateRange.start.toISOString().split('T')[0]} to ${options.dateRange.end.toISOString().split('T')[0]}`);
    rows.push('');

    // Summary metrics
    rows.push('Summary Metrics');
    rows.push('Metric,Value,Description');
    rows.push(`Total Searches,${analytics.totalSearches},Total number of searches performed`);
    rows.push(`Average Response Time,${analytics.averageResponseTime}ms,Average search response time`);
    
    if (performanceMetrics) {
      rows.push(`Cache Hit Rate,${(performanceMetrics.cacheHitRate * 100).toFixed(1)}%,Percentage of cached results`);
      rows.push(`Error Rate,${(performanceMetrics.errorRate * 100).toFixed(1)}%,Percentage of failed searches`);
    }
    
    rows.push('');

    // Top search terms
    if (analytics.topSearchTerms.length > 0) {
      rows.push('Top Search Terms');
      rows.push('Rank,Search Term,Count,Percentage');
      analytics.topSearchTerms.forEach((term, index) => {
        const percentage = analytics.totalSearches > 0 
          ? ((term.count / analytics.totalSearches) * 100).toFixed(1)
          : '0';
        rows.push(`${index + 1},"${term.term}",${term.count},${percentage}%`);
      });
      rows.push('');
    }

    // Zero result queries
    if (analytics.zeroResultQueries.length > 0) {
      rows.push('Zero Result Queries');
      rows.push('Rank,Query,Count,Impact Level');
      analytics.zeroResultQueries.forEach((query, index) => {
        const impact = query.count > 5 ? 'High' : query.count > 2 ? 'Medium' : 'Low';
        rows.push(`${index + 1},"${query.query}",${query.count},${impact}`);
      });
      rows.push('');
    }

    // Popular filters
    if (analytics.popularFilters.length > 0) {
      rows.push('Popular Filters');
      rows.push('Rank,Filter,Usage Count,Usage Rate');
      analytics.popularFilters.forEach((filter, index) => {
        const usageRate = analytics.totalSearches > 0 
          ? ((filter.count / analytics.totalSearches) * 100).toFixed(1)
          : '0';
        rows.push(`${index + 1},${filter.filter},${filter.count},${usageRate}%`);
      });
      rows.push('');
    }

    // Search trends
    if (analytics.searchTrends.length > 0) {
      rows.push('Search Trends');
      rows.push('Date,Search Count,Day of Week');
      analytics.searchTrends.forEach(trend => {
        const date = new Date(trend.date);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        rows.push(`${trend.date},${trend.count},${dayOfWeek}`);
      });
      rows.push('');
    }

    // Performance metrics (if included)
    if (performanceMetrics && options.includePerformanceMetrics) {
      rows.push('Performance Metrics');
      rows.push('Metric,Value');
      rows.push(`Total Searches,${performanceMetrics.totalSearches}`);
      rows.push(`Average Response Time,${performanceMetrics.averageResponseTime.toFixed(2)}ms`);
      rows.push(`Cache Hit Rate,${(performanceMetrics.cacheHitRate * 100).toFixed(1)}%`);
      rows.push(`Error Rate,${(performanceMetrics.errorRate * 100).toFixed(1)}%`);
      rows.push('');

      // Slow queries
      if (performanceMetrics.slowQueries.length > 0) {
        rows.push('Slow Queries');
        rows.push('Query,Response Time (ms),Status');
        performanceMetrics.slowQueries.forEach(query => {
          const status = query.responseTime > 3000 ? 'Critical' : 'Slow';
          rows.push(`"${query.query}",${query.responseTime},${status}`);
        });
        rows.push('');
      }
    }

    return rows.join('\n');
  }

  /**
   * Generate JSON export
   */
  private async generateJSON(
    analytics: SearchAnalytics,
    performanceMetrics: SearchPerformanceMetrics | null,
    options: ExportOptions
  ): Promise<string> {
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        dateRange: {
          start: options.dateRange.start.toISOString(),
          end: options.dateRange.end.toISOString()
        },
        format: 'json',
        includePerformanceMetrics: options.includePerformanceMetrics,
        includeDetailedBreakdown: options.includeDetailedBreakdown
      },
      analytics,
      performanceMetrics: options.includePerformanceMetrics ? performanceMetrics : null,
      detailedBreakdown: options.includeDetailedBreakdown ? {
        searchTermAnalysis: this.analyzeSearchTerms(analytics),
        temporalAnalysis: this.analyzeTemporalPatterns(analytics),
        performanceAnalysis: performanceMetrics ? this.analyzePerformance(performanceMetrics) : null
      } : null
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate XLSX export (simplified - would need a library like xlsx in production)
   */
  private async generateXLSX(
    analytics: SearchAnalytics,
    performanceMetrics: SearchPerformanceMetrics | null,
    options: ExportOptions
  ): Promise<Blob> {
    // For now, return CSV as blob since we don't have xlsx library
    // In production, you would use a library like 'xlsx' to generate proper Excel files
    const csvData = await this.generateCSV(analytics, performanceMetrics, options);
    return new Blob([csvData], { type: 'text/csv' });
  }

  /**
   * Analyze search terms for detailed breakdown
   */
  private analyzeSearchTerms(analytics: SearchAnalytics) {
    const totalSearches = analytics.totalSearches;
    
    return {
      totalUniqueTerms: analytics.topSearchTerms.length,
      averageSearchesPerTerm: totalSearches > 0 ? totalSearches / analytics.topSearchTerms.length : 0,
      topTermsConcentration: analytics.topSearchTerms.slice(0, 5).reduce((sum, term) => sum + term.count, 0) / totalSearches,
      termLengthDistribution: this.analyzeTermLengths(analytics.topSearchTerms),
      searchPatterns: this.identifySearchPatterns(analytics.topSearchTerms)
    };
  }

  /**
   * Analyze temporal patterns
   */
  private analyzeTemporalPatterns(analytics: SearchAnalytics) {
    const trends = analytics.searchTrends;
    
    if (trends.length === 0) {
      return { message: 'No temporal data available' };
    }

    const dailyCounts = trends.map(t => t.count);
    const avgDaily = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;
    const maxDaily = Math.max(...dailyCounts);
    const minDaily = Math.min(...dailyCounts);

    return {
      averageDailySearches: Math.round(avgDaily),
      peakDailySearches: maxDaily,
      minimumDailySearches: minDaily,
      volatility: this.calculateVolatility(dailyCounts),
      weekdayPattern: this.analyzeWeekdayPattern(trends),
      growthTrend: this.calculateGrowthTrend(dailyCounts)
    };
  }

  /**
   * Analyze performance metrics
   */
  private analyzePerformance(performanceMetrics: SearchPerformanceMetrics) {
    return {
      performanceGrade: this.calculatePerformanceGrade(performanceMetrics),
      bottlenecks: this.identifyBottlenecks(performanceMetrics),
      recommendations: this.generatePerformanceRecommendations(performanceMetrics)
    };
  }

  /**
   * Analyze term lengths
   */
  private analyzeTermLengths(terms: Array<{ term: string; count: number }>) {
    const lengths = terms.map(t => t.term.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    
    return {
      averageLength: Math.round(avgLength * 10) / 10,
      shortTerms: lengths.filter(len => len <= 3).length,
      mediumTerms: lengths.filter(len => len > 3 && len <= 10).length,
      longTerms: lengths.filter(len => len > 10).length
    };
  }

  /**
   * Identify search patterns
   */
  private identifySearchPatterns(terms: Array<{ term: string; count: number }>) {
    const patterns = {
      userSearches: terms.filter(t => t.term.includes('user') || t.term.includes('@')).length,
      videoSearches: terms.filter(t => t.term.includes('video') || t.term.includes('talent')).length,
      eventSearches: terms.filter(t => t.term.includes('event') || t.term.includes('competition')).length,
      locationSearches: terms.filter(t => /\b(in|at|near)\b/.test(t.term.toLowerCase())).length
    };

    return patterns;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance) / mean;
  }

  /**
   * Analyze weekday patterns
   */
  private analyzeWeekdayPattern(trends: Array<{ date: string; count: number }>) {
    const weekdayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // Sunday = 0
    const weekdayTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    trends.forEach(trend => {
      const date = new Date(trend.date);
      const dayOfWeek = date.getDay();
      weekdayCounts[dayOfWeek] += trend.count;
      weekdayTotals[dayOfWeek]++;
    });

    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return Object.keys(weekdayCounts).map(day => ({
      day: weekdayNames[parseInt(day)],
      averageSearches: weekdayTotals[day] > 0 ? Math.round(weekdayCounts[day] / weekdayTotals[day]) : 0,
      totalDays: weekdayTotals[day]
    }));
  }

  /**
   * Calculate growth trend
   */
  private calculateGrowthTrend(values: number[]): string {
    if (values.length < 2) return 'insufficient_data';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const growthRate = (secondAvg - firstAvg) / firstAvg;
    
    if (growthRate > 0.1) return 'growing';
    if (growthRate < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Calculate performance grade
   */
  private calculatePerformanceGrade(metrics: SearchPerformanceMetrics): string {
    let score = 0;
    
    // Response time score (0-30 points)
    if (metrics.averageResponseTime < 200) score += 30;
    else if (metrics.averageResponseTime < 500) score += 20;
    else if (metrics.averageResponseTime < 1000) score += 10;
    
    // Cache hit rate score (0-30 points)
    score += Math.round(metrics.cacheHitRate * 30);
    
    // Error rate score (0-40 points)
    if (metrics.errorRate < 0.01) score += 40;
    else if (metrics.errorRate < 0.05) score += 30;
    else if (metrics.errorRate < 0.1) score += 20;
    else if (metrics.errorRate < 0.2) score += 10;
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(metrics: SearchPerformanceMetrics): string[] {
    const bottlenecks: string[] = [];
    
    if (metrics.averageResponseTime > 1000) {
      bottlenecks.push('High average response time');
    }
    
    if (metrics.cacheHitRate < 0.3) {
      bottlenecks.push('Low cache hit rate');
    }
    
    if (metrics.errorRate > 0.05) {
      bottlenecks.push('High error rate');
    }
    
    if (metrics.slowQueries.length > 5) {
      bottlenecks.push('Multiple slow queries detected');
    }
    
    return bottlenecks;
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(metrics: SearchPerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.averageResponseTime > 500) {
      recommendations.push('Consider optimizing database queries and adding indexes');
    }
    
    if (metrics.cacheHitRate < 0.5) {
      recommendations.push('Increase cache TTL and optimize cache keys');
    }
    
    if (metrics.errorRate > 0.02) {
      recommendations.push('Investigate and fix common error patterns');
    }
    
    if (metrics.slowQueries.length > 0) {
      recommendations.push('Optimize slow queries identified in the report');
    }
    
    return recommendations;
  }

  /**
   * Generate filename based on options
   */
  private generateFilename(options: ExportOptions, extension: string): string {
    if (options.customFilename) {
      return `${options.customFilename}.${extension}`;
    }
    
    const startDate = options.dateRange.start.toISOString().split('T')[0];
    const endDate = options.dateRange.end.toISOString().split('T')[0];
    
    return `search-analytics-${startDate}-to-${endDate}.${extension}`;
  }

  /**
   * Download file
   */
  private async downloadFile(data: string | Blob, filename: string, mimeType: string): Promise<void> {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  }

  /**
   * Update progress
   */
  private updateProgress(stage: ExportProgress['stage'], progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message });
    }
  }
}

// Create singleton instance
export const analyticsExporter = new AnalyticsExporter();
export default analyticsExporter;