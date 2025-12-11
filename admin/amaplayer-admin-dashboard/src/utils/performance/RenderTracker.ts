/**
 * Render Tracking Utilities for Performance Monitoring
 * 
 * Provides comprehensive render tracking, re-render analysis, and debugging tools
 * for identifying performance issues in React components.
 */

interface RenderInfo {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  averageRenderTime: number;
  props: any;
  propsChanged: boolean;
  stateChanged: boolean;
  contextChanged: boolean;
  renderReason: string;
}

interface RenderEvent {
  componentName: string;
  timestamp: number;
  duration: number;
  renderCount: number;
  reason: string;
  props?: any;
  prevProps?: any;
}

class RenderTracker {
  private static instance: RenderTracker;
  private renderData = new Map<string, RenderInfo>();
  private renderEvents: RenderEvent[] = [];
  private isEnabled = process.env.NODE_ENV === 'development';
  private maxEvents = 1000;
  private subscribers = new Set<(event: RenderEvent) => void>();

  static getInstance(): RenderTracker {
    if (!RenderTracker.instance) {
      RenderTracker.instance = new RenderTracker();
    }
    return RenderTracker.instance;
  }

  /**
   * Track a component render with timing and reason analysis
   */
  trackRender(
    componentName: string,
    renderFn: () => any,
    props?: any,
    prevProps?: any,
    reason?: string
  ): any {
    if (!this.isEnabled) {
      return renderFn();
    }

    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.recordRender(componentName, duration, props, prevProps, reason);
    return result;
  }

  /**
   * Record render information and update statistics
   */
  private recordRender(
    componentName: string,
    duration: number,
    props?: any,
    prevProps?: any,
    reason?: string
  ): void {
    const timestamp = Date.now();
    
    // Update component render data
    const existing = this.renderData.get(componentName);
    const renderCount = existing ? existing.renderCount + 1 : 1;
    const totalRenderTime = existing ? existing.totalRenderTime + duration : duration;
    const averageRenderTime = totalRenderTime / renderCount;

    // Analyze render reason
    const renderReason = reason || this.analyzeRenderReason(props, prevProps);
    const propsChanged = this.hasPropsChanged(props, prevProps);

    const renderInfo: RenderInfo = {
      componentName,
      renderCount,
      lastRenderTime: timestamp,
      totalRenderTime,
      averageRenderTime,
      props,
      propsChanged,
      stateChanged: renderReason.includes('state'),
      contextChanged: renderReason.includes('context'),
      renderReason
    };

    this.renderData.set(componentName, renderInfo);

    // Create render event
    const renderEvent: RenderEvent = {
      componentName,
      timestamp,
      duration,
      renderCount,
      reason: renderReason,
      props,
      prevProps
    };

    // Add to events list (with size limit)
    this.renderEvents.push(renderEvent);
    if (this.renderEvents.length > this.maxEvents) {
      this.renderEvents.shift();
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(renderEvent));
  }

  /**
   * Analyze why a component re-rendered
   */
  private analyzeRenderReason(props?: any, prevProps?: any): string {
    if (!prevProps) return 'initial-render';
    if (!props) return 'unmount';

    const reasons: string[] = [];

    // Check for prop changes
    if (this.hasPropsChanged(props, prevProps)) {
      const changedProps = this.getChangedProps(props, prevProps);
      reasons.push(`props-changed: ${changedProps.join(', ')}`);
    }

    // Check for reference changes
    if (this.hasReferenceChanges(props, prevProps)) {
      reasons.push('reference-changed');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'unknown';
  }

  /**
   * Check if props have changed
   */
  private hasPropsChanged(props: any, prevProps: any): boolean {
    if (!props && !prevProps) return false;
    if (!props || !prevProps) return true;

    const propKeys = Object.keys(props);
    const prevPropKeys = Object.keys(prevProps);

    if (propKeys.length !== prevPropKeys.length) return true;

    return propKeys.some(key => props[key] !== prevProps[key]);
  }

  /**
   * Get list of changed prop names
   */
  private getChangedProps(props: any, prevProps: any): string[] {
    if (!props || !prevProps) return [];

    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(props), ...Object.keys(prevProps)]);

    allKeys.forEach(key => {
      if (props[key] !== prevProps[key]) {
        changed.push(key);
      }
    });

    return changed;
  }

  /**
   * Check for reference changes (functions, objects, arrays)
   */
  private hasReferenceChanges(props: any, prevProps: any): boolean {
    if (!props || !prevProps) return false;

    return Object.keys(props).some(key => {
      const current = props[key];
      const previous = prevProps[key];

      if (current === previous) return false;

      // Check for function reference changes
      if (typeof current === 'function' && typeof previous === 'function') {
        return current !== previous;
      }

      // Check for object/array reference changes
      if (
        (typeof current === 'object' && current !== null) ||
        (typeof previous === 'object' && previous !== null)
      ) {
        return current !== previous;
      }

      return false;
    });
  }

  /**
   * Get render statistics for a component
   */
  getRenderStats(componentName: string): RenderInfo | null {
    return this.renderData.get(componentName) || null;
  }

  /**
   * Get render statistics for all components
   */
  getAllRenderStats(): Map<string, RenderInfo> {
    return new Map(this.renderData);
  }

  /**
   * Get recent render events
   */
  getRecentRenderEvents(limit: number = 50): RenderEvent[] {
    return this.renderEvents.slice(-limit);
  }

  /**
   * Get render events for a specific component
   */
  getComponentRenderEvents(componentName: string, limit: number = 50): RenderEvent[] {
    return this.renderEvents
      .filter(event => event.componentName === componentName)
      .slice(-limit);
  }

  /**
   * Subscribe to render events
   */
  subscribe(callback: (event: RenderEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Get components with excessive re-renders
   */
  getExcessiveRerenders(threshold: number = 10): RenderInfo[] {
    const excessive: RenderInfo[] = [];
    
    this.renderData.forEach(info => {
      if (info.renderCount > threshold) {
        excessive.push(info);
      }
    });

    return excessive.sort((a, b) => b.renderCount - a.renderCount);
  }

  /**
   * Get components with slow renders
   */
  getSlowRenders(thresholdMs: number = 16): RenderInfo[] {
    const slow: RenderInfo[] = [];
    
    this.renderData.forEach(info => {
      if (info.averageRenderTime > thresholdMs) {
        slow.push(info);
      }
    });

    return slow.sort((a, b) => b.averageRenderTime - a.averageRenderTime);
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.renderData.clear();
    this.renderEvents.length = 0;
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled && process.env.NODE_ENV === 'development';
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalComponents: number;
    totalRenders: number;
    averageRenderTime: number;
    excessiveRerenders: number;
    slowRenders: number;
  } {
    let totalRenders = 0;
    let totalRenderTime = 0;
    let excessiveRerenders = 0;
    let slowRenders = 0;

    this.renderData.forEach(info => {
      totalRenders += info.renderCount;
      totalRenderTime += info.totalRenderTime;
      
      if (info.renderCount > 10) excessiveRerenders++;
      if (info.averageRenderTime > 16) slowRenders++;
    });

    return {
      totalComponents: this.renderData.size,
      totalRenders,
      averageRenderTime: totalRenders > 0 ? totalRenderTime / totalRenders : 0,
      excessiveRerenders,
      slowRenders
    };
  }
}

export const renderTracker = RenderTracker.getInstance();
export type { RenderInfo, RenderEvent };