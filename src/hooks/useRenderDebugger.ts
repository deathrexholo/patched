/**
 * React Hooks for Render Debugging and Performance Analysis
 * 
 * Provides hooks for tracking component renders, analyzing re-render causes,
 * and debugging performance issues in React components.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { renderTracker, type RenderInfo, type RenderEvent } from '../utils/performance/RenderTracker';
import { performanceTimer } from '../utils/performance/PerformanceTimer';

interface RenderDebugInfo {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  renderReason: string;
  propsChanged: boolean;
  changedProps: string[];
  renderHistory: RenderEvent[];
}

interface UseRenderDebuggerOptions {
  enabled?: boolean;
  trackProps?: boolean;
  trackRenderTime?: boolean;
  logToConsole?: boolean;
  maxHistory?: number;
}

/**
 * Hook for debugging component renders and performance
 */
export function useRenderDebugger(
  componentName: string,
  props?: any,
  options: UseRenderDebuggerOptions = {}
): RenderDebugInfo {
  const {
    enabled = process.env.NODE_ENV === 'development',
    trackProps = true,
    trackRenderTime = true,
    logToConsole = false,
    maxHistory = 10
  } = options;

  const prevPropsRef = useRef<any>(undefined);
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const renderHistoryRef = useRef<RenderEvent[]>([]);

  // Track render timing if enabled
  const renderStartTime = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (trackRenderTime) {
      renderStartTime.current = performanceTimer.start(
        `${componentName}-render`,
        'component',
        { props: trackProps ? props : undefined }
      );
    }

    return () => {
      if (renderStartTime.current && trackRenderTime) {
        const duration = performanceTimer.end(renderStartTime.current);
        if (duration !== null) {
          renderTimesRef.current.push(duration);
          if (renderTimesRef.current.length > maxHistory) {
            renderTimesRef.current.shift();
          }
        }
      }
    };
  }, [enabled, trackRenderTime, componentName, trackProps, props, maxHistory]);

  // Analyze render reason and track changes
  const renderAnalysis = useMemo(() => {
    if (!enabled) {
      return {
        renderReason: 'disabled',
        propsChanged: false,
        changedProps: []
      };
    }

    renderCountRef.current++;
    const currentProps = trackProps ? props : undefined;
    const prevProps = prevPropsRef.current;

    let renderReason = 'initial-render';
    let propsChanged = false;
    let changedProps: string[] = [];

    if (prevProps && currentProps) {
      const propKeys = Object.keys(currentProps);
      const prevPropKeys = Object.keys(prevProps);

      // Check for prop changes
      if (propKeys.length !== prevPropKeys.length) {
        propsChanged = true;
        renderReason = 'props-count-changed';
      } else {
        changedProps = propKeys.filter(key => currentProps[key] !== prevProps[key]);
        if (changedProps.length > 0) {
          propsChanged = true;
          renderReason = `props-changed: ${changedProps.join(', ')}`;
        } else {
          renderReason = 'unknown-rerender';
        }
      }
    } else if (renderCountRef.current > 1) {
      renderReason = 'state-or-context-change';
    }

    // Update previous props reference
    prevPropsRef.current = currentProps;

    // Log to console if enabled
    if (logToConsole && renderCountRef.current > 1) {if (propsChanged && changedProps.length > 0) {changedProps.forEach(prop => {});
      }}

    // Track with render tracker
    if (trackRenderTime) {
      renderTracker.trackRender(
        componentName,
        () => null, // No-op since we're just tracking
        currentProps,
        prevProps,
        renderReason
      );
    }

    return {
      renderReason,
      propsChanged,
      changedProps
    };
  }, [componentName, props, enabled, trackProps, logToConsole]);

  // Get render statistics
  const renderStats = useMemo(() => {
    const stats = renderTracker.getRenderStats(componentName);
    const history = renderTracker.getComponentRenderEvents(componentName, maxHistory);
    
    renderHistoryRef.current = history;

    const averageRenderTime = renderTimesRef.current.length > 0
      ? renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length
      : stats?.averageRenderTime || 0;

    return {
      renderCount: renderCountRef.current,
      lastRenderTime: Date.now(),
      averageRenderTime,
      renderHistory: history
    };
  }, [componentName, maxHistory]);

  return {
    ...renderStats,
    ...renderAnalysis
  };
}

/**
 * Hook for tracking why a component re-rendered
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  const previousProps = useRef<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key]
          };
        }
      });

      if (Object.keys(changedProps).length) {}
    }

    previousProps.current = props;
  }, [name, props]);
}

/**
 * Hook for tracking render performance
 */
export function useRenderPerformance(componentName: string): {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  isSlowRender: boolean;
} {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderTimeRef = useRef(0);

  useEffect(() => {
    const startTime = performance.now();
    renderCountRef.current++;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      renderTimesRef.current.push(renderTime);
      lastRenderTimeRef.current = renderTime;

      // Keep only last 20 render times
      if (renderTimesRef.current.length > 20) {
        renderTimesRef.current.shift();
      }

      // Log slow renders
      if (renderTime > 16 && process.env.NODE_ENV === 'development') {
        console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  const averageRenderTime = useMemo(() => {
    if (renderTimesRef.current.length === 0) return 0;
    return renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;
  }, [renderTimesRef.current.length]);

  return {
    renderCount: renderCountRef.current,
    averageRenderTime,
    lastRenderTime: lastRenderTimeRef.current,
    isSlowRender: lastRenderTimeRef.current > 16
  };
}

/**
 * Hook for tracking component lifecycle and performance
 */
export function useComponentLifecycle(componentName: string): {
  mountTime: number;
  renderCount: number;
  totalLifetime: number;
  isUnmounting: boolean;
} {
  const mountTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    renderCountRef.current++;

    return () => {
      isUnmountingRef.current = true;
      const totalLifetime = performance.now() - mountTimeRef.current;
      
      if (process.env.NODE_ENV === 'development') {}
    };
  }, [componentName]);

  return {
    mountTime: mountTimeRef.current,
    renderCount: renderCountRef.current,
    totalLifetime: performance.now() - mountTimeRef.current,
    isUnmounting: isUnmountingRef.current
  };
}

/**
 * Hook for detecting excessive re-renders
 */
export function useRenderWarning(
  componentName: string,
  threshold: number = 10,
  timeWindow: number = 5000
): {
  renderCount: number;
  isExcessive: boolean;
  reset: () => void;
} {
  const renderTimestampsRef = useRef<number[]>([]);
  const warningShownRef = useRef(false);

  const reset = useCallback(() => {
    renderTimestampsRef.current = [];
    warningShownRef.current = false;
  }, []);

  useEffect(() => {
    const now = Date.now();
    renderTimestampsRef.current.push(now);

    // Remove old timestamps outside the time window
    renderTimestampsRef.current = renderTimestampsRef.current.filter(
      timestamp => now - timestamp <= timeWindow
    );

    const renderCount = renderTimestampsRef.current.length;
    const isExcessive = renderCount > threshold;

    // Show warning once per excessive render period
    if (isExcessive && !warningShownRef.current && process.env.NODE_ENV === 'development') {
      console.warn(
        `⚠️ Excessive re-renders detected in ${componentName}: ${renderCount} renders in ${timeWindow}ms`
      );
      warningShownRef.current = true;
    }

    // Reset warning flag if renders drop below threshold
    if (!isExcessive && warningShownRef.current) {
      warningShownRef.current = false;
    }
  }, [componentName, threshold, timeWindow]);

  return {
    renderCount: renderTimestampsRef.current.length,
    isExcessive: renderTimestampsRef.current.length > threshold,
    reset
  };
}