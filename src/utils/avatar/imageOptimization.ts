/**
 * Image optimization utilities for Avatar component
 * Handles Firebase Storage URLs, CDN optimization, and timeout protection
 */

const IMAGE_TIMEOUT_MS = 15000; // 15 second timeout for slow CDN responses
const URL_CACHE = new Map<string, string>();

/**
 * Optimize Firebase Storage URLs for better performance
 * - Adds ?alt=media for proper content type
 * - Adds width parameter for CDN caching optimization
 * - Handles various Firebase Storage URL formats
 */
export function optimizeFirebaseImageUrl(url: string, size: number): string {
  if (!url) return '';

  // Check cache first
  const cacheKey = `${url}_${size}`;
  if (URL_CACHE.has(cacheKey)) {
    return URL_CACHE.get(cacheKey)!;
  }

  try {
    // Check if it's a Firebase Storage URL
    if (url.includes('firebasestorage.googleapis.com')) {
      // Already has alt=media parameter
      if (url.includes('alt=media')) {
        return url;
      }

      // Add alt=media and width parameter for CDN optimization
      const separator = url.includes('?') ? '&' : '?';
      const optimizedUrl = `${url}${separator}alt=media&w=${size}`;
      URL_CACHE.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }

    // For other URLs, add width parameter if possible
    if (!url.includes('w=') && !url.includes('width=')) {
      const separator = url.includes('?') ? '&' : '?';
      const optimizedUrl = `${url}${separator}w=${size}`;
      URL_CACHE.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }

    URL_CACHE.set(cacheKey, url);
    return url;
  } catch (error) {
    console.error('Error optimizing image URL:', error);
    return url;
  }
}

/**
 * Create an image with timeout protection
 * Prevents hanging on slow/rate-limited CDN responses (429 errors)
 */
export function loadImageWithTimeout(
  src: string,
  timeout: number = IMAGE_TIMEOUT_MS
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      reject(new Error(`Image load timeout after ${timeout}ms: ${src}`));
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/**
 * Validate if URL is accessible and returns proper image
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return response.ok || response.status === 0; // 0 for CORS
  } catch {
    return false;
  }
}

/**
 * Clear URL cache (useful for testing or memory management)
 */
export function clearUrlCache(): void {
  URL_CACHE.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getUrlCacheStats(): { size: number; entries: string[] } {
  return {
    size: URL_CACHE.size,
    entries: Array.from(URL_CACHE.keys())
  };
}

/**
 * Extract filename from URL for logging/debugging
 */
export function extractFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.substring(pathname.lastIndexOf('/') + 1).split('?')[0];
  } catch {
    return 'unknown';
  }
}
