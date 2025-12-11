/**
 * Local placeholder image utilities
 * Replaces external via.placeholder.com with local SVG data URLs
 */

// Unicode-safe base64 encoding function
const unicodeSafeBtoa = (str: string): string => {
  try {
    // Convert Unicode string to UTF-8 bytes, then encode to base64
    return btoa(unescape(encodeURIComponent(str)));
  } catch (error) {
    console.error('Error encoding string to base64:', error);
    // Fallback: use URL encoding instead of base64
    return encodeURIComponent(str);
  }
};

// Generate SVG data URL for placeholder images
const generatePlaceholderSVG = (width: number, height: number, text: string, bgColor = '#2d3748', textColor = '#00ff88') => {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${bgColor}"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 8}">${text}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${unicodeSafeBtoa(svg)}`;
};

// Common placeholder images
export const PlaceholderImages = {
  // User avatars
  userAvatar: (size: number = 40) => generatePlaceholderSVG(size, size, '👤'),
  
  // Profile images
  profileImage: (size: number = 150) => generatePlaceholderSVG(size, size, '👤'),
  
  // Cover photos
  coverPhoto: () => generatePlaceholderSVG(800, 300, 'Cover Photo'),
  
  // Loading states
  loading: (width: number = 400, height: number = 300) => generatePlaceholderSVG(width, height, 'Loading...'),
  
  // Error states
  imageNotFound: (width: number = 400, height: number = 300) => generatePlaceholderSVG(width, height, 'Image Not Found', '#e2e8f0', '#64748b'),
  
  // Video thumbnails
  videoStory: () => generatePlaceholderSVG(300, 400, 'Video Story', '#333', '#fff'),
  
  // Generic placeholder
  generic: (width: number = 100, height: number = 100, text: string = '?') => generatePlaceholderSVG(width, height, text)
};

// Helper function to get appropriate placeholder based on context
export const getPlaceholderImage = (type: 'avatar' | 'profile' | 'cover' | 'loading' | 'error' | 'video', size?: number) => {
  switch (type) {
    case 'avatar':
      return PlaceholderImages.userAvatar(size || 40);
    case 'profile':
      return PlaceholderImages.profileImage(size || 150);
    case 'cover':
      return PlaceholderImages.coverPhoto();
    case 'loading':
      return PlaceholderImages.loading();
    case 'error':
      return PlaceholderImages.imageNotFound();
    case 'video':
      return PlaceholderImages.videoStory();
    default:
      return PlaceholderImages.generic(size || 100, size || 100);
  }
};

// Transparent 1x1 pixel for lazy loading
export const TRANSPARENT_PIXEL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+';