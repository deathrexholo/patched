/**
 * Browser detection utilities for cross-browser compatibility
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isMobile: boolean;
  supportsCSS: {
    grid: boolean;
    flexbox: boolean;
    customProperties: boolean;
    backdropFilter: boolean;
  };
}

export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
  const isEdge = /Edg/.test(userAgent);
  const isMobile = /Mobi|Android/i.test(userAgent);

  // Extract version numbers
  let version = 'Unknown';
  if (isChrome) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (isFirefox) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (isSafari) {
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (isEdge) {
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }

  const name = isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : 'Unknown';

  return {
    name,
    version,
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isMobile,
    supportsCSS: {
      grid: CSS.supports('display', 'grid'),
      flexbox: CSS.supports('display', 'flex'),
      customProperties: CSS.supports('--test', 'value'),
      backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)')
    }
  };
}

export function detectMobileDevice(): {
  isMobile: boolean;
  isTablet: boolean;
  isPhone: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'small' | 'medium' | 'large';
  touchSupport: boolean;
} {
  const userAgent = navigator.userAgent;
  const isMobile = /Mobi|Android/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent) || 
                   (window.innerWidth >= 768 && window.innerWidth <= 1024);
  const isPhone = isMobile && !isTablet;
  
  const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  
  let screenSize: 'small' | 'medium' | 'large' = 'large';
  if (window.innerWidth <= 480) {
    screenSize = 'small';
  } else if (window.innerWidth <= 768) {
    screenSize = 'medium';
  }
  
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return {
    isMobile,
    isTablet,
    isPhone,
    orientation,
    screenSize,
    touchSupport
  };
}

export function addBrowserClasses(): void {
  const browser = detectBrowser();
  const mobile = detectMobileDevice();
  const html = document.documentElement;
  
  // Add browser-specific classes
  html.classList.add(`browser-${browser.name.toLowerCase()}`);
  html.classList.add(`browser-version-${browser.version}`);
  
  // Add mobile/device classes
  if (mobile.isMobile) {
    html.classList.add('is-mobile');
  }
  if (mobile.isTablet) {
    html.classList.add('is-tablet');
  }
  if (mobile.isPhone) {
    html.classList.add('is-phone');
  }
  if (mobile.touchSupport) {
    html.classList.add('has-touch');
  }
  
  html.classList.add(`orientation-${mobile.orientation}`);
  html.classList.add(`screen-${mobile.screenSize}`);
  
  // Add CSS support classes
  Object.entries(browser.supportsCSS).forEach(([feature, supported]) => {
    html.classList.add(supported ? `supports-${feature}` : `no-${feature}`);
  });
}

export function logBrowserInfo(): void {
  const browser = detectBrowser();
  const mobile = detectMobileDevice();}