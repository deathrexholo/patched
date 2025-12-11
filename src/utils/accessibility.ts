/**
 * Accessibility utility functions for testing and validation
 */

export interface AccessibilityCheckResult {
  passed: boolean;
  message: string;
  element?: HTMLElement;
}

/**
 * Check if an element has proper ARIA labels
 */
export const checkAriaLabels = (element: HTMLElement): AccessibilityCheckResult => {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  const ariaDescribedBy = element.getAttribute('aria-describedby');
  
  if (!ariaLabel && !ariaLabelledBy) {
    return {
      passed: false,
      message: 'Element lacks proper ARIA labeling (aria-label or aria-labelledby)',
      element
    };
  }
  
  return {
    passed: true,
    message: 'Element has proper ARIA labeling',
    element
  };
};

/**
 * Check if interactive elements are keyboard accessible
 */
export const checkKeyboardAccessibility = (element: HTMLElement): AccessibilityCheckResult => {
  const tagName = element.tagName.toLowerCase();
  const tabIndex = element.getAttribute('tabindex');
  const role = element.getAttribute('role');
  
  // Check if element is naturally focusable or has tabindex
  const isNaturallyFocusable = ['button', 'a', 'input', 'select', 'textarea'].includes(tagName);
  const hasTabIndex = tabIndex !== null && tabIndex !== '-1';
  
  if (!isNaturallyFocusable && !hasTabIndex && role === 'button') {
    return {
      passed: false,
      message: 'Interactive element is not keyboard accessible (missing tabindex)',
      element
    };
  }
  
  return {
    passed: true,
    message: 'Element is keyboard accessible',
    element
  };
};

/**
 * Check if element has proper focus indicators
 */
export const checkFocusIndicators = (element: HTMLElement): AccessibilityCheckResult => {
  const computedStyle = window.getComputedStyle(element, ':focus');
  const outline = computedStyle.outline;
  const outlineWidth = computedStyle.outlineWidth;
  
  if (outline === 'none' || outlineWidth === '0px') {
    return {
      passed: false,
      message: 'Element lacks visible focus indicators',
      element
    };
  }
  
  return {
    passed: true,
    message: 'Element has proper focus indicators',
    element
  };
};

/**
 * Check if video element has proper accessibility attributes
 */
export const checkVideoAccessibility = (videoElement: HTMLVideoElement): AccessibilityCheckResult[] => {
  const results: AccessibilityCheckResult[] = [];
  
  // Check for aria-label or title
  const ariaLabel = videoElement.getAttribute('aria-label');
  const title = videoElement.getAttribute('title');
  
  results.push({
    passed: !!(ariaLabel || title),
    message: ariaLabel || title ? 'Video has descriptive label' : 'Video lacks descriptive label',
    element: videoElement
  });
  
  // Check for controls accessibility
  const hasControls = videoElement.hasAttribute('controls');
  const hasCustomControls = videoElement.parentElement?.querySelector('[role="button"]');
  
  results.push({
    passed: !!(hasControls || hasCustomControls),
    message: hasControls || hasCustomControls ? 'Video has accessible controls' : 'Video lacks accessible controls',
    element: videoElement
  });
  
  return results;
};

/**
 * Check if modal/dialog has proper accessibility attributes
 */
export const checkModalAccessibility = (modalElement: HTMLElement): AccessibilityCheckResult[] => {
  const results: AccessibilityCheckResult[] = [];
  
  // Check for role="dialog"
  const role = modalElement.getAttribute('role');
  results.push({
    passed: role === 'dialog',
    message: role === 'dialog' ? 'Modal has proper dialog role' : 'Modal lacks dialog role',
    element: modalElement
  });
  
  // Check for aria-modal
  const ariaModal = modalElement.getAttribute('aria-modal');
  results.push({
    passed: ariaModal === 'true',
    message: ariaModal === 'true' ? 'Modal has aria-modal attribute' : 'Modal lacks aria-modal attribute',
    element: modalElement
  });
  
  // Check for aria-labelledby
  const ariaLabelledBy = modalElement.getAttribute('aria-labelledby');
  results.push({
    passed: !!ariaLabelledBy,
    message: ariaLabelledBy ? 'Modal has proper labeling' : 'Modal lacks proper labeling',
    element: modalElement
  });
  
  return results;
};

/**
 * Check if live regions are properly configured
 */
export const checkLiveRegions = (container: HTMLElement): AccessibilityCheckResult[] => {
  const results: AccessibilityCheckResult[] = [];
  const liveRegions = container.querySelectorAll('[aria-live]');
  
  liveRegions.forEach((region) => {
    const ariaLive = region.getAttribute('aria-live');
    const validValues = ['polite', 'assertive', 'off'];
    
    results.push({
      passed: validValues.includes(ariaLive || ''),
      message: validValues.includes(ariaLive || '') 
        ? `Live region has valid aria-live value: ${ariaLive}` 
        : `Live region has invalid aria-live value: ${ariaLive}`,
      element: region as HTMLElement
    });
  });
  
  return results;
};

/**
 * Run comprehensive accessibility check on video player
 */
export const checkVideoPlayerAccessibility = (container: HTMLElement): AccessibilityCheckResult[] => {
  const results: AccessibilityCheckResult[] = [];
  
  // Check video element
  const video = container.querySelector('video');
  if (video) {
    results.push(...checkVideoAccessibility(video));
  }
  
  // Check interactive buttons
  const buttons = container.querySelectorAll('button');
  buttons.forEach((button) => {
    results.push(checkAriaLabels(button));
    results.push(checkKeyboardAccessibility(button));
  });
  
  // Check live regions
  results.push(...checkLiveRegions(container));
  
  // Check for screen reader only content
  const srOnlyElements = container.querySelectorAll('.sr-only');
  results.push({
    passed: srOnlyElements.length > 0,
    message: srOnlyElements.length > 0 
      ? 'Container has screen reader only content' 
      : 'Container lacks screen reader only content',
    element: container
  });
  
  return results;
};

/**
 * Log accessibility check results to console
 */
export const logAccessibilityResults = (results: AccessibilityCheckResult[], componentName: string): void => {const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;console.log(`❌ Failed: ${failed}`);
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';if (!result.passed && result.element) {}
  });};

/**
 * Keyboard navigation test helper
 */
export const testKeyboardNavigation = (container: HTMLElement): void => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );focusableElements.forEach((element, index) => {
    const tagName = element.tagName.toLowerCase();
    const ariaLabel = element.getAttribute('aria-label');
    const title = element.getAttribute('title');
    const text = element.textContent?.trim().substring(0, 30);});};