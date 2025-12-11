/**
 * Performance Debug Hook
 * 
 * Provides easy integration of performance debugging tools and utilities
 * for development environments.
 */

import { useState, useEffect, useCallback } from 'react';
import { performanceMonitoringUtils } from '../utils/performance/PerformanceMonitoringUtils';
import { renderTracker } from '../utils/performance/RenderTracker';
import { performanceTimer } from '../utils/performance/PerformanceTimer';

interface PerformanceDebugState {
  isDebugPanelOpen: boolean;
  isMonitoring: boolean;
  alertCount: number;
  renderCount: number;
  operationCount: number;
}

interface PerformanceDebugActions {
  toggleDebugPanel: () => void;
  openDebugPanel: () => void;
  closeDebugPanel: () => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  clearAllData: () => void;
  generateReport: () => void;
}

export function usePerformanceDebug(): PerformanceDebugState & PerformanceDebugActions {
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [renderCount, setRenderCount] = useState(0);
  const [operationCount, setOperationCount] = useState(0);

  // Update counts periodically
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    const updateCounts = () => {
      const alerts = performanceMonitoringUtils.getRecentAlerts();
      const renderStats = renderTracker.getAllRenderStats();
      const timerStats = performanceTimer.getAllStats();

      setAlertCount(alerts.length);
      setRenderCount(renderStats.size);
      setOperationCount(timerStats.size);
    };

    updateCounts();
    const interval = setInterval(updateCounts, 2000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to alerts for real-time count updates
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    const unsubscribe = performanceMonitoringUtils.subscribeToAlerts(() => {
      setAlertCount(performanceMonitoringUtils.getRecentAlerts().length);
    });

    return unsubscribe;
  }, []);

  // Keyboard shortcut to toggle debug panel (Ctrl+Shift+P)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsDebugPanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDebugPanel = useCallback(() => {
    setIsDebugPanelOpen(prev => !prev);
  }, []);

  const openDebugPanel = useCallback(() => {
    setIsDebugPanelOpen(true);
  }, []);

  const closeDebugPanel = useCallback(() => {
    setIsDebugPanelOpen(false);
  }, []);

  const startMonitoring = useCallback(() => {
    performanceMonitoringUtils.startMonitoring();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    performanceMonitoringUtils.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  const clearAllData = useCallback(() => {
    renderTracker.clear();
    performanceTimer.clear();
    performanceMonitoringUtils.clearAlerts();
    setAlertCount(0);
    setRenderCount(0);
    setOperationCount(0);
  }, []);

  const generateReport = useCallback(() => {
    performanceMonitoringUtils.logPerformanceReport();
  }, []);

  return {
    // State
    isDebugPanelOpen,
    isMonitoring,
    alertCount,
    renderCount,
    operationCount,
    
    // Actions
    toggleDebugPanel,
    openDebugPanel,
    closeDebugPanel,
    startMonitoring,
    stopMonitoring,
    clearAllData,
    generateReport
  };
}

/**
 * Hook for adding performance debugging to any component
 */
export function useComponentPerformanceDebug(
  componentName: string,
  options: {
    trackRenders?: boolean;
    trackProps?: boolean;
    logSlowRenders?: boolean;
    slowRenderThreshold?: number;
  } = {}
) {
  const {
    trackRenders = true,
    trackProps = false,
    logSlowRenders = true,
    slowRenderThreshold = 16
  } = options;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !trackRenders) return;

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Track the render
      renderTracker.trackRender(
        componentName,
        () => null,
        trackProps ? undefined : undefined, // Props would need to be passed in
        undefined,
        'component-render'
      );

      // Log slow renders
      if (logSlowRenders && renderTime > slowRenderThreshold) {
        console.warn(
          `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
        );
      }
    };
  });

  return {
    componentName,
    trackingEnabled: trackRenders && process.env.NODE_ENV === 'development'
  };
}

/**
 * Hook for global performance debugging setup
 */
export function useGlobalPerformanceDebug(options: {
  autoStart?: boolean;
  keyboardShortcuts?: boolean;
  consoleCommands?: boolean;
} = {}) {
  const {
    autoStart = false,
    keyboardShortcuts = true,
    consoleCommands = true
  } = options;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    // Auto-start monitoring if requested
    if (autoStart) {
      performanceMonitoringUtils.startMonitoring();
    }

    // Add console commands for debugging
    if (consoleCommands && typeof window !== 'undefined') {
      (window as any).performanceDebug = {
        start: () => performanceMonitoringUtils.startMonitoring(),
        stop: () => performanceMonitoringUtils.stopMonitoring(),
        report: () => performanceMonitoringUtils.logPerformanceReport(),
        clear: () => {
          renderTracker.clear();
          performanceTimer.clear();
          performanceMonitoringUtils.clearAlerts();
        },
        export: () => performanceMonitoringUtils.exportPerformanceData(),
        renderStats: () => renderTracker.getAllRenderStats(),
        timerStats: () => performanceTimer.getAllStats(),
        alerts: () => performanceMonitoringUtils.getRecentAlerts()
      };}

    return () => {
      // Cleanup
      performanceMonitoringUtils.stopMonitoring();
      
      if (consoleCommands && typeof window !== 'undefined') {
        delete (window as any).performanceDebug;
      }
    };
  }, [autoStart, consoleCommands]);

  return {
    debugToolsEnabled: process.env.NODE_ENV === 'development'
  };
}