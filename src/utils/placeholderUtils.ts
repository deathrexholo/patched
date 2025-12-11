/**
 * Utility functions for generating placeholder images and patterns
 */

export type PlaceholderType = 'avatar' | 'post' | 'custom' | 'gallery' | 'video' | 'document';
export type PlaceholderPattern = 'pattern-1' | 'pattern-2' | 'pattern-3';

/**
 * Generate a data URL for a simple SVG placeholder
 */
export const generateSVGPlaceholder = (
  width: number = 400,
  height: number = 300,
  backgroundColor: string = '#f3f4f6',
  textColor: string = '#9ca3af',
  text?: string
): string => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      ${text ? `
        <text x="50%" y="50%" 
              font-family="system-ui, -apple-system, sans-serif" 
              font-size="16" 
              fill="${textColor}" 
              text-anchor="middle" 
              dominant-baseline="middle">
          ${text}
        </text>
      ` : ''}
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Generate a gradient placeholder data URL
 */
export const generateGradientPlaceholder = (
  width: number = 400,
  height: number = 300,
  colors: string[] = ['#667eea', '#764ba2']
): string => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Get placeholder pattern class name
 */
export const getPlaceholderPattern = (seed?: string): PlaceholderPattern => {
  const patterns: PlaceholderPattern[] = ['pattern-1', 'pattern-2', 'pattern-3'];
  
  if (seed) {
    // Generate consistent pattern based on seed (e.g., user ID)
    const hash = seed.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return patterns[Math.abs(hash) % patterns.length];
  }
  
  return patterns[Math.floor(Math.random() * patterns.length)];
};

/**
 * Get default placeholder colors for different types
 */
export const getPlaceholderColors = (type: PlaceholderType): string[] => {
  const colorMap: Record<PlaceholderType, string[]> = {
    avatar: ['#667eea', '#764ba2'],
    post: ['#f093fb', '#f5576c'],
    custom: ['#4facfe', '#00f2fe'],
    gallery: ['#ff9a9e', '#fecfef'],
    video: ['#a8edea', '#fed6e3'],
    document: ['#667eea', '#764ba2']
  };
  
  return colorMap[type] || colorMap.post;
};

/**
 * Create a placeholder image URL based on dimensions and type
 */
export const createPlaceholderUrl = (
  width: number,
  height: number,
  type: PlaceholderType = 'post',
  text?: string
): string => {
  const colors = getPlaceholderColors(type);
  
  if (text) {
    return generateSVGPlaceholder(width, height, colors[0], '#ffffff', text);
  }
  
  return generateGradientPlaceholder(width, height, colors);
};

/**
 * Check if a URL is from via.placeholder.com or similar external placeholder services
 */
export const isExternalPlaceholder = (url: string): boolean => {
  const externalPlaceholderDomains = [
    'via.placeholder.com',
    'placeholder.com',
    'placehold.it',
    'placekitten.com',
    'picsum.photos',
    'loremflickr.com'
  ];
  
  return externalPlaceholderDomains.some(domain => url.includes(domain));
};

/**
 * Replace external placeholder URLs with local alternatives
 */
export const replaceExternalPlaceholder = (url: string, type: PlaceholderType = 'post'): string => {
  if (!isExternalPlaceholder(url)) {
    return url;
  }
  
  // Extract dimensions from common placeholder URL patterns
  const dimensionMatch = url.match(/(\d+)x?(\d+)?/);
  const width = dimensionMatch ? parseInt(dimensionMatch[1]) : 400;
  const height = dimensionMatch && dimensionMatch[2] ? parseInt(dimensionMatch[2]) : width;
  
  // Extract text from URL if present
  const textMatch = url.match(/[?&]text=([^&]+)/);
  const text = textMatch ? decodeURIComponent(textMatch[1]) : undefined;
  
  return createPlaceholderUrl(width, height, type, text);
};