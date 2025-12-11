/**
 * Avatar Utility Functions
 * Helper functions for avatar display and fallbacks
 */

/**
 * Generate initials from a name
 * @param name Full name or username
 * @returns Two-letter initials (e.g., "JD" from "John Doe")
 * @example
 * generateInitials("John Doe") // "JD"
 * generateInitials("Alice") // "AL"
 * generateInitials("AB") // "AB"
 * generateInitials("") // ""
 */
export function generateInitials(name: string): string {
  if (!name || name.trim().length === 0) {
    return '';
  }

  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    // Single word: take first 2 characters
    return trimmed.substring(0, 2).toUpperCase();
  }

  // Multiple words: take first letter of first and last word
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get initials with validation
 * @param name Name to generate initials from
 * @returns Initials string or empty string if name is invalid
 */
export function getInitialsOrEmpty(name?: string): string {
  if (!name) {
    return '';
  }
  return generateInitials(name);
}
