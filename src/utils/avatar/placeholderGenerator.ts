/**
 * SVG Placeholder Generator for Avatar fallbacks
 * Generates lightweight, customizable placeholder SVG images as data URLs
 */

interface PlaceholderOptions {
  width?: number;
  height?: number;
  text?: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

/**
 * Color palette for consistent avatar initials backgrounds
 */
const COLOR_PALETTE = [
  '#667eea', // Indigo
  '#764ba2', // Purple
  '#f093fb', // Pink
  '#4facfe', // Blue
  '#00f2fe', // Cyan
  '#43e97b', // Green
  '#fa709a', // Rose
  '#fee140', // Yellow
  '#30cfd0', // Teal
  '#330867'  // Dark Purple
];

/**
 * Generate a consistent color based on text hash
 */
function getColorFromText(text: string, palette: string[] = COLOR_PALETTE): string {
  if (!text) return palette[0];

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

/**
 * Generate SVG placeholder image as data URL
 */
export function generatePlaceholderSVG(
  width: number = 48,
  height: number = 48,
  text: string = '?',
  bgColor?: string,
  textColor: string = '#ffffff'
): string {
  // Use text to determine background color if not specified
  const finalBgColor = bgColor || getColorFromText(text);

  // Calculate font size based on dimensions
  const fontSize = Math.min(width, height) * 0.4;
  const textX = width / 2;
  const textY = height / 2 + fontSize / 3;

  const svg = `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
      style="background-color: ${finalBgColor}; border-radius: 50%; display: block;"
    >
      <text
        x="${textX}"
        y="${textY}"
        font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="${textColor}"
        user-select="none"
      >
        ${escapeXml(text)}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate avatar placeholder with initials
 */
export function getPlaceholderSVG(
  width: number = 48,
  height: number = 48,
  initials: string = '?',
  bgColor?: string,
  textColor: string = '#ffffff'
): string {
  // Limit to 2 characters max
  const limitedInitials = initials.substring(0, 2).toUpperCase();
  return generatePlaceholderSVG(width, height, limitedInitials, bgColor, textColor);
}

/**
 * Generate icon-based placeholder (user icon, lock icon, etc.)
 */
export function generateIconPlaceholder(
  width: number = 48,
  height: number = 48,
  iconType: 'user' | 'lock' | 'folder' | 'image' = 'user',
  bgColor: string = '#667eea',
  iconColor: string = '#ffffff'
): string {
  const iconPaths = {
    user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5s-5 2.24-5 5v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 15c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v8z',
    folder: 'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
    image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'
  };

  const viewBox = '0 0 24 24';
  const iconPath = iconPaths[iconType];
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / 24;

  const svg = `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
      style="background-color: ${bgColor}; border-radius: 50%; display: block;"
    >
      <g transform="translate(${centerX - 12 * scale}, ${centerY - 12 * scale}) scale(${scale})">
        <path d="${iconPath}" fill="${iconColor}" />
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Generate gradient placeholder
 */
export function generateGradientPlaceholder(
  width: number = 48,
  height: number = 48,
  color1: string = '#667eea',
  color2: string = '#764ba2',
  text?: string
): string {
  const textContent = text ? `
    <text
      x="${width / 2}"
      y="${height / 2}"
      font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
      font-size="${Math.min(width, height) * 0.4}"
      font-weight="600"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="#ffffff"
    >
      ${escapeXml(text.substring(0, 2).toUpperCase())}
    </text>
  ` : '';

  const svg = `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
      style="border-radius: 50%; display: block;"
    >
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)" />
      ${textContent}
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Presets for common avatar types
 */
export const AvatarPlaceholderPresets = {
  user: (size: number = 48) => generateIconPlaceholder(size, size, 'user'),
  profile: (size: number = 48) => generateIconPlaceholder(size, size, 'user'),
  locked: (size: number = 48) => generateIconPlaceholder(size, size, 'lock'),
  folder: (size: number = 48) => generateIconPlaceholder(size, size, 'folder'),
  image: (size: number = 48) => generateIconPlaceholder(size, size, 'image'),
  loading: (size: number = 48) => `
    data:image/svg+xml;base64,${btoa(`
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="#e2e8f0" stroke-width="2" fill="none" />
        <circle cx="12" cy="12" r="10" stroke="#667eea" stroke-width="2" fill="none" stroke-dasharray="15.7 31.4" opacity="0.8">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
        </circle>
      </svg>
    `)}
  `
};
