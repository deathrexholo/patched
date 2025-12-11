/**
 * Comprehensive Performance Monitoring Utilities
 * 
 * Provides advanced performance analysis tools including data export/import,
 * comparison analysis, budget checking, regression detection, and report generation.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { 
    EnvironmentDetector, 
    createProductionSafeWrapper, 
    createProductionSafeAsyncWrapper,
    performanceErrorBoundary
} from './ProductionSafety';

// Performance budget thresholds
const DEFAULT_PERFORMANCE_BUDGETS = {
    webVitals: {
        lcp: { good: 2500, poor: 4000 },
        fid: { good: 100, poor: 300 },
        cls: { good: 0.1, poor: 0.25 },
        fcp: { good: 1800, poor: 3000 },
        ttfb: { good: 800, poor: 1800 }
    },
    components: {
        averageRenderTime: { good: 16, poor: 50 },
        maxRenderTime: { good: 32, poor: 100 },
        renderCount: { good: 100, poor: 500 }
    },
    api: {
        averageResponseTime: { good: 500, poor: 2000 },
        maxResponseTime: { good: 1000, poor: 5000 },
        errorRate: { good: 1, poor: 5 }
    },
    memory: {
        heapUsed: { good: 50, poor: 100 },
        heapTotal: { good: 100, poor: 200 },
        leakCount: { good: 0, poor: 3 }
    },
    overall: {
        score: { good: 80, poor: 50 }
    }
};

/**
 * Performance Data Export/Import Utilities
 */
class PerformanceDataManager {
    static exportData(data: any, options: any = {}) {
        const {
            includeHistorical = true,
            includeRawData = false,
            timeRange = null,
            format = 'json'
        } = options;

        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                source: 'performance-monitoring-system',
                options
            },
            metrics: data.metrics || {},
            insights: data.insights || [],
            alerts: data.alerts || []
        };

        if (includeHistorical && data.historicalData) {
            let historicalData = data.historicalData;

            if (timeRange) {
                const cutoff = Date.now() - timeRange;
                historicalData = historicalData.filter(entry => entry.timestamp >= cutoff);
            }

            (exportData as any).historicalData = historicalData;
        }

        if (includeRawData && data.rawData) {
            (exportData as any).rawData = data.rawData;
        }

        (exportData as any).summary = this.generateSummary(data);

        return format === 'json' ? JSON.stringify(exportData, null, 2) : exportData;
    }

    static importData(importData) {
        let data;

        if (typeof importData === 'string') {
            try {
                data = JSON.parse(importData);
            } catch (error) {
                throw new Error(`Invalid JSON format: ${error.message}`);
            }
        } else {
            data = importData;
        }

        if (!data.metadata || !data.metadata.source) {
            throw new Error('Invalid performance data format: missing metadata');
        }

        const version = data.metadata.version;
        if (version && !this.isVersionCompatible(version)) {
            if (process.env.NODE_ENV === 'development') {
                const logger = require('../logging/LoggingManager').default;
                logger.warn('PERFORMANCE', `Performance data version ${version} may not be fully compatible`);
            }
        }

        return {
            metrics: data.metrics || {},
            historicalData: data.historicalData || [],
            insights: data.insights || [],
            alerts: data.alerts || [],
            summary: data.summary || {},
            metadata: data.metadata
        };
    }

    static generateSummary(data) {
        const summary = {
            dataPoints: 0,
            timeRange: { start: null, end: null },
            averageScore: 0,
            totalInsights: 0,
            totalAlerts: 0
        };

        if (data.historicalData && data.historicalData.length > 0) {
            const timestamps = data.historicalData.map(d => d.timestamp).sort();
            summary.dataPoints = data.historicalData.length;
            summary.timeRange.start = new Date(timestamps[0]).toISOString();
            summary.timeRange.end = new Date(timestamps[timestamps.length - 1]).toISOString();

            const scores = data.historicalData.map(d => d.overallScore || 0);
            summary.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        }

        summary.totalInsights = data.insights ? data.insights.length : 0;
        summary.totalAlerts = data.alerts ? data.alerts.length : 0;

        return summary;
    }

    static isVersionCompatible(version) {
        const [major] = version.split('.').map(Number);
        return major === 1;
    }

    static downloadAsFile(data, filename = 'performance-data.json', options = {}) {
        const exportedData = this.exportData(data, options);
        const blob = new Blob([typeof exportedData === 'string' ? exportedData : JSON.stringify(exportedData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

/**
 * Performance Comparison Tools
 */
class PerformanceComparator {
    static compare(baseline, current) {
        const comparison = {
            timestamp: Date.now(),
            baseline: {
                timestamp: baseline.timestamp,
                overallScore: baseline.overallScore || 0
            },
            current: {
                timestamp: current.timestamp,
                overallScore: current.overallScore || 0
            },
            changes: {},
            summary: {
                improved: 0,
                degraded: 0,
                unchanged: 0,
                significantChanges: []
            }
        };

        const scoreDiff = current.overallScore - baseline.overallScore;
        (comparison.changes as any).overallScore = {
            baseline: baseline.overallScore,
            current: current.overallScore,
            difference: scoreDiff,
            percentChange: baseline.overallScore > 0 ? (scoreDiff / baseline.overallScore) * 100 : 0,
            status: this.getChangeStatus(scoreDiff, 5)
        };

        if (baseline.webVitals && current.webVitals) {
            (comparison.changes as any).webVitals = this.compareWebVitals(baseline.webVitals, current.webVitals);
        }

        this.generateComparisonSummary(comparison);

        return comparison;
    }

    static compareWebVitals(baseline, current) {
        const vitalsComparison = {};
        const vitalsMetrics = ['lcp', 'fid', 'cls', 'fcp', 'ttfb'];

        vitalsMetrics.forEach(metric => {
            if (baseline[metric] !== null && current[metric] !== null) {
                const diff = current[metric] - baseline[metric];
                vitalsComparison[metric] = {
                    baseline: baseline[metric],
                    current: current[metric],
                    difference: diff,
                    percentChange: baseline[metric] > 0 ? (diff / baseline[metric]) * 100 : 0,
                    status: this.getChangeStatus(-diff, this.getVitalsThreshold(metric))
                };
            }
        });

        return vitalsComparison;
    }

    static getChangeStatus(diff, threshold) {
        if (Math.abs(diff) < threshold) return 'unchanged';
        return diff > 0 ? 'improved' : 'degraded';
    }

    static getVitalsThreshold(metric) {
        const thresholds = { lcp: 100, fid: 10, cls: 0.01, fcp: 100, ttfb: 50 };
        return thresholds[metric] || 10;
    }

    static generateComparisonSummary(comparison) {
        const summary = comparison.summary;
        const significantThreshold = 10;

        Object.values(comparison.changes).forEach(category => {
            if (typeof category === 'object' && category !== null) {
                Object.values(category).forEach(metric => {
                    if (metric && metric.status) {
                        switch (metric.status) {
                            case 'improved':
                                summary.improved++;
                                break;
                            case 'degraded':
                                summary.degraded++;
                                break;
                            case 'unchanged':
                                summary.unchanged++;
                                break;
                        }

                        if (Math.abs(metric.percentChange || 0) >= significantThreshold) {
                            summary.significantChanges.push({
                                metric: metric,
                                percentChange: metric.percentChange,
                                status: metric.status
                            });
                        }
                    }
                });
            }
        });

        summary.significantChanges.sort((a, b) =>
            Math.abs(b.percentChange) - Math.abs(a.percentChange)
        );
    }
}

/**
 * Performance Budget Checker
 */
class PerformanceBudgetChecker {
    private budgets: any;

    constructor(budgets = DEFAULT_PERFORMANCE_BUDGETS) {
        this.budgets = budgets;
    }

    checkBudgets(metrics) {
        const results = {
            timestamp: Date.now(),
            overallStatus: 'good',
            violations: [],
            warnings: [],
            passed: [],
            summary: {
                total: 0,
                passed: 0,
                warnings: 0,
                violations: 0
            }
        };

        if (metrics.webVitals) {
            this.checkWebVitalsBudgets(metrics.webVitals, results);
        }

        if (metrics.overallScore !== undefined) {
            this.checkOverallBudget(metrics.overallScore, results);
        }

        results.summary.total = results.passed.length + results.warnings.length + results.violations.length;
        results.summary.passed = results.passed.length;
        results.summary.warnings = results.warnings.length;
        results.summary.violations = results.violations.length;

        if (results.violations.length > 0) {
            results.overallStatus = 'poor';
        } else if (results.warnings.length > 0) {
            results.overallStatus = 'needs-improvement';
        }

        return results;
    }

    checkWebVitalsBudgets(webVitals, results) {
        const vitalsMetrics = ['lcp', 'fid', 'cls', 'fcp', 'ttfb'];

        vitalsMetrics.forEach(metric => {
            if (webVitals[metric] !== null && webVitals[metric] !== undefined) {
                const value = webVitals[metric];
                const budget = this.budgets.webVitals[metric];

                if (budget) {
                    const check = {
                        category: 'webVitals',
                        metric,
                        value,
                        budget,
                        status: this.getBudgetStatus(value, budget, false)
                    };

                    this.categorizeCheck(check, results);
                }
            }
        });
    }

    checkOverallBudget(overallScore, results) {
        const budget = this.budgets.overall.score;
        const check = {
            category: 'overall',
            metric: 'score',
            value: overallScore,
            budget,
            status: this.getBudgetStatus(overallScore, budget, true)
        };

        this.categorizeCheck(check, results);
    }

    getBudgetStatus(value, budget, higherIsBetter = false) {
        if (higherIsBetter) {
            if (value >= budget.good) return 'passed';
            if (value >= budget.poor) return 'warning';
            return 'violation';
        } else {
            if (value <= budget.good) return 'passed';
            if (value <= budget.poor) return 'warning';
            return 'violation';
        }
    }

    categorizeCheck(check, results) {
        switch (check.status) {
            case 'passed':
                results.passed.push(check);
                break;
            case 'warning':
                results.warnings.push(check);
                break;
            case 'violation':
                results.violations.push(check);
                break;
        }
    }
}

/**
 * Performance Regression Detector
 */
class PerformanceRegressionDetector {
    private options: {
        minDataPoints: number;
        regressionThreshold: number;
        trendWindow: number;
        significanceLevel: number;
    };

    constructor(options = {}) {
        this.options = {
            minDataPoints: 5,
            regressionThreshold: 10,
            trendWindow: 10,
            significanceLevel: 0.05,
            ...options
        };
    }

    detectRegressions(historicalData) {
        if (!historicalData || historicalData.length < this.options.minDataPoints) {
            return {
                hasRegressions: false,
                regressions: [],
                summary: { total: 0, critical: 0, moderate: 0, minor: 0 },
                message: 'Insufficient data for regression analysis'
            };
        }

        const results = {
            timestamp: Date.now(),
            hasRegressions: false,
            regressions: [],
            summary: { total: 0, critical: 0, moderate: 0, minor: 0 },
            dataPoints: historicalData.length,
            analysisWindow: Math.min(this.options.trendWindow, historicalData.length)
        };

        const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);
        const recentData = sortedData.slice(-this.options.trendWindow);

        const metricsToAnalyze = [
            { path: 'overallScore', name: 'Overall Score', higherIsBetter: true }
        ];

        metricsToAnalyze.forEach(metric => {
            const regression = this.analyzeMetricRegression(recentData, metric);
            if (regression.hasRegression) {
                results.regressions.push(regression);
                results.hasRegressions = true;

                results.summary.total++;
                switch (regression.severity) {
                    case 'critical':
                        results.summary.critical++;
                        break;
                    case 'moderate':
                        results.summary.moderate++;
                        break;
                    case 'minor':
                        results.summary.minor++;
                        break;
                }
            }
        });

        return results;
    }

    analyzeMetricRegression(data, metric) {
        const values = data.map(d => this.getNestedValue(d, metric.path)).filter(v => v !== null && v !== undefined);

        if (values.length < this.options.minDataPoints) {
            return { hasRegression: false, metric: metric.name };
        }

        const trend = this.calculateTrend(values);
        const isRegression = metric.higherIsBetter ? trend.slope < 0 : trend.slope > 0;
        const percentChange = this.calculatePercentChange(values);
        const isSignificant = Math.abs(percentChange) >= this.options.regressionThreshold;

        if (!isRegression || !isSignificant) {
            return { hasRegression: false, metric: metric.name };
        }

        const severity = this.calculateSeverity(Math.abs(percentChange));

        return {
            hasRegression: true,
            metric: metric.name,
            metricPath: metric.path,
            severity,
            percentChange,
            trend: {
                slope: trend.slope,
                rSquared: trend.rSquared,
                confidence: trend.rSquared > 0.7 ? 'high' : trend.rSquared > 0.4 ? 'medium' : 'low'
            },
            values: {
                first: values[0],
                last: values[values.length - 1],
                min: Math.min(...values),
                max: Math.max(...values),
                average: values.reduce((sum, v) => sum + v, 0) / values.length
            },
            dataPoints: values.length,
            recommendation: this.generateRecommendation(metric.name, severity, percentChange)
        };
    }

    calculateTrend(values) {
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = values;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const yMean = sumY / n;
        const ssRes = y.reduce((sum, yi, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

        return { slope, intercept, rSquared };
    }

    calculatePercentChange(values) {
        if (values.length < 2) return 0;
        const first = values[0];
        const last = values[values.length - 1];
        return first > 0 ? ((last - first) / first) * 100 : 0;
    }

    calculateSeverity(percentChange) {
        if (percentChange >= 30) return 'critical';
        if (percentChange >= 20) return 'moderate';
        return 'minor';
    }

    generateRecommendation(metricName, severity, percentChange) {
        const recommendations = {
            'Overall Score': 'Review all performance metrics and focus on the most degraded areas'
        };

        const baseRecommendation = recommendations[metricName] || 'Investigate and optimize this metric';
        const urgency = severity === 'critical' ? 'URGENT: ' : severity === 'moderate' ? 'Important: ' : '';

        return `${urgency}${baseRecommendation} (${Math.abs(percentChange).toFixed(1)}% degradation detected)`;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }
}

/**
 * Performance Report Generator
 */
class PerformanceReportGenerator {
    static generateReport(data: any, options: any = {}) {
        const {
            includeComparison = false,
            baselineData = null,
            includeBudgetCheck = true,
            includeRegressionAnalysis = true,
            format = 'detailed'
        } = options;

        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                reportType: format,
                dataRange: this.getDataRange(data),
                version: '1.0.0'
            },
            executive: {},
            performance: {},
            analysis: {},
            recommendations: []
        };

        report.executive = this.generateExecutiveSummary(data);
        report.performance = this.generatePerformanceSection(data);

        if (includeBudgetCheck) {
            const budgetChecker = new PerformanceBudgetChecker();
            (report.analysis as any).budgetCheck = budgetChecker.checkBudgets(data.metrics || {});
        }

        if (includeRegressionAnalysis && data.historicalData) {
            const regressionDetector = new PerformanceRegressionDetector();
            (report.analysis as any).regressions = regressionDetector.detectRegressions(data.historicalData);
        }

        if (includeComparison && baselineData) {
            (report.analysis as any).comparison = PerformanceComparator.compare(baselineData, data.metrics || {});
        }

        report.recommendations = this.generateRecommendations(report);

        return this.formatReport(report, format);
    }

    static generateExecutiveSummary(data) {
        const metrics = data.metrics || {};

        return {
            overallScore: metrics.overallScore || 0,
            status: this.getScoreStatus(metrics.overallScore || 0),
            keyMetrics: {
                webVitals: this.summarizeWebVitals(metrics.webVitals)
            },
            criticalIssues: [],
            dataPoints: data.historicalData ? data.historicalData.length : 0
        };
    }

    static generatePerformanceSection(data) {
        const metrics = data.metrics || {};

        return {
            webVitals: {
                ...metrics.webVitals,
                assessment: this.assessWebVitals(metrics.webVitals)
            },
            timestamp: metrics.timestamp
        };
    }

    static generateRecommendations(report) {
        const recommendations = [];
        const { performance } = report;

        if (performance.webVitals) {
            if (performance.webVitals.lcp > 2500) {
                recommendations.push({
                    category: 'webVitals',
                    priority: 'high',
                    title: 'Optimize Largest Contentful Paint',
                    description: 'LCP is above the recommended threshold',
                    actions: [
                        'Optimize images and use modern formats (WebP, AVIF)',
                        'Implement lazy loading for below-the-fold content',
                        'Reduce server response times'
                    ]
                });
            }
        }

        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

        return recommendations;
    }

    static formatReport(report, format) {
        switch (format) {
            case 'executive':
                return {
                    metadata: report.metadata,
                    summary: report.executive,
                    criticalRecommendations: report.recommendations.filter(r =>
                        r.priority === 'critical' || r.priority === 'high'
                    ).slice(0, 5)
                };

            case 'summary':
                return {
                    metadata: report.metadata,
                    summary: report.executive,
                    performance: {
                        overallScore: report.performance.webVitals?.score?.overall || 0,
                        webVitals: report.performance.webVitals
                    },
                    topRecommendations: report.recommendations.slice(0, 3)
                };

            case 'detailed':
            default:
                return report;
        }
    }

    static getScoreStatus(score) {
        if (score >= 80) return 'good';
        if (score >= 50) return 'needs-improvement';
        return 'poor';
    }

    static summarizeWebVitals(webVitals) {
        if (!webVitals) return { status: 'no-data' };
        return {
            status: webVitals.score?.status || 'unknown',
            score: webVitals.score?.overall || 0,
            lcp: webVitals.lcp,
            fid: webVitals.fid,
            cls: webVitals.cls
        };
    }

    static assessWebVitals(webVitals) {
        if (!webVitals) return 'No Web Vitals data available';

        const issues = [];
        if (webVitals.lcp > 4000) issues.push('LCP is poor');
        else if (webVitals.lcp > 2500) issues.push('LCP needs improvement');

        if (webVitals.fid > 300) issues.push('FID is poor');
        else if (webVitals.fid > 100) issues.push('FID needs improvement');

        if (webVitals.cls > 0.25) issues.push('CLS is poor');
        else if (webVitals.cls > 0.1) issues.push('CLS needs improvement');

        return issues.length > 0 ? issues.join(', ') : 'Web Vitals are performing well';
    }

    static getDataRange(data) {
        if (!data.historicalData || data.historicalData.length === 0) {
            return { start: null, end: null, dataPoints: 0 };
        }

        const timestamps = data.historicalData.map(d => d.timestamp).sort();
        return {
            start: new Date(timestamps[0]).toISOString(),
            end: new Date(timestamps[timestamps.length - 1]).toISOString(),
            dataPoints: data.historicalData.length
        };
    }
}

// Production-safe wrapper implementations
const productionSafeUtilities = {
    exportData: () => '{}',
    importData: () => ({}),
    downloadAsFile: () => { },
    compare: () => ({ changes: {}, summary: { improved: 0, degraded: 0, unchanged: 0 } }),
    checkBudgets: () => ({ overallStatus: 'good', violations: [], warnings: [], passed: [] }),
    detectRegressions: () => ({ hasRegressions: false, regressions: [] }),
    generateReport: () => ({ metadata: {}, executive: {}, performance: {}, recommendations: [] })
};

// Export utilities with production safety
const PerformanceUtilities = {
    // Data Management
    exportData: createProductionSafeWrapper(
        (data, options) => PerformanceDataManager.exportData(data, options),
        productionSafeUtilities.exportData
    ),

    importData: createProductionSafeWrapper(
        (importData) => PerformanceDataManager.importData(importData),
        productionSafeUtilities.importData
    ),

    downloadAsFile: createProductionSafeWrapper(
        (data, filename, options) => PerformanceDataManager.downloadAsFile(data, filename, options),
        productionSafeUtilities.downloadAsFile
    ),

    // Comparison Tools
    compare: createProductionSafeWrapper(
        (baseline, current) => PerformanceComparator.compare(baseline, current),
        productionSafeUtilities.compare
    ),

    // Budget Checking
    checkBudgets: createProductionSafeWrapper(
        (metrics, budgets) => {
            const checker = new PerformanceBudgetChecker(budgets);
            return checker.checkBudgets(metrics);
        },
        productionSafeUtilities.checkBudgets
    ),

    // Regression Detection
    detectRegressions: createProductionSafeWrapper(
        (historicalData, options) => {
            const detector = new PerformanceRegressionDetector(options);
            return detector.detectRegressions(historicalData);
        },
        productionSafeUtilities.detectRegressions
    ),

    // Report Generation
    generateReport: createProductionSafeWrapper(
        (data, options) => PerformanceReportGenerator.generateReport(data, options),
        productionSafeUtilities.generateReport
    ),

    // Utility Classes (for advanced usage)
    DataManager: EnvironmentDetector.isProduction() ? null : PerformanceDataManager,
    Comparator: EnvironmentDetector.isProduction() ? null : PerformanceComparator,
    BudgetChecker: EnvironmentDetector.isProduction() ? null : PerformanceBudgetChecker,
    RegressionDetector: EnvironmentDetector.isProduction() ? null : PerformanceRegressionDetector,
    ReportGenerator: EnvironmentDetector.isProduction() ? null : PerformanceReportGenerator,

    // Default budgets for reference
    DEFAULT_BUDGETS: DEFAULT_PERFORMANCE_BUDGETS
};

export { PerformanceUtilities };
export default PerformanceUtilities;