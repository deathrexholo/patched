/**
 * Utility functions for mobile device detection and responsive behavior
 */

/**
 * Detects if the current device is a mobile device
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0);
};

/**
 * Detects if the current device supports touch
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Gets the current viewport dimensions
 */
export const getViewportDimensions = () => {
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
  };
};

/**
 * Checks if the device is in landscape orientation
 */
export const isLandscape = (): boolean => {
  const { width, height } = getViewportDimensions();
  return width > height;
};

/**
 * Checks if the device is in portrait orientation
 */
export const isPortrait = (): boolean => {
  return !isLandscape();
};

/**
 * Gets the device pixel ratio for high-DPI displays
 */
export const getDevicePixelRatio = (): number => {
  return window.devicePixelRatio || 1;
};

/**
 * Checks if the device has a small screen (mobile phone size)
 */
export const isSmallScreen = (): boolean => {
  const { width } = getViewportDimensions();
  return width < 768;
};

/**
 * Checks if the device has a medium screen (tablet size)
 */
export const isMediumScreen = (): boolean => {
  const { width } = getViewportDimensions();
  return width >= 768 && width < 1024;
};

/**
 * Checks if the device has a large screen (desktop size)
 */
export const isLargeScreen = (): boolean => {
  const { width } = getViewportDimensions();
  return width >= 1024;
};

/**
 * Debounced resize handler for performance
 */
export const createResizeHandler = (callback: () => void, delay: number = 250) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
};

/**
 * Checks if the device supports hover interactions
 */
export const supportsHover = (): boolean => {
  return window.matchMedia('(hover: hover)').matches;
};

/**
 * Checks if the device has a coarse pointer (touch)
 */
export const hasCoarsePointer = (): boolean => {
  return window.matchMedia('(pointer: coarse)').matches;
};

/**
 * Gets safe area insets for devices with notches
 */
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0')
  };
};

export default {
  isMobileDevice,
  isTouchDevice,
  getViewportDimensions,
  isLandscape,
  isPortrait,
  getDevicePixelRatio,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  createResizeHandler,
  supportsHover,
  hasCoarsePointer,
  getSafeAreaInsets
};