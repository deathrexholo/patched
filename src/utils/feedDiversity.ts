/**
 * Feed Diversity Utilities
 * 
 * Provides algorithms to diversify content feeds by preventing
 * consecutive videos from the same user and ensuring balanced
 * distribution across creators.
 */

export interface FeedDiversityConfig {
  /** Maximum number of consecutive videos from the same user */
  maxConsecutiveFromSameUser: number;
  /** Maximum percentage of feed that can be from a single user (0-1) */
  maxPercentageFromSingleUser: number;
}

export interface FeedItem {
  userId: string;
  [key: string]: any;
}

/**
 * Default configuration for feed diversity
 */
export const DEFAULT_DIVERSITY_CONFIG: FeedDiversityConfig = {
  maxConsecutiveFromSameUser: 2,
  maxPercentageFromSingleUser: 0.3, // 30%
};

/**
 * Diversifies a feed by reordering items to prevent consecutive content
 * from the same user and ensure balanced distribution.
 * 
 * Algorithm:
 * 1. Group items by userId
 * 2. Check if any user exceeds max percentage threshold
 * 3. Interleave items from different users
 * 4. Ensure no more than maxConsecutive items from same user appear together
 * 
 * @param items - Array of feed items with userId property
 * @param config - Configuration for diversity constraints
 * @returns Diversified array of feed items
 */
export function diversifyFeed<T extends FeedItem>(
  items: T[],
  config: Partial<FeedDiversityConfig> = {}
): T[] {
  if (!items || items.length === 0) {
    return items;
  }

  const finalConfig = { ...DEFAULT_DIVERSITY_CONFIG, ...config };

  // Group items by userId (filter out empty userIds)
  const userGroups = new Map<string, T[]>();
  items.forEach(item => {
    if (!item.userId || item.userId.trim() === '') {
      return; // Skip items with empty userId
    }
    if (!userGroups.has(item.userId)) {
      userGroups.set(item.userId, []);
    }
    userGroups.get(item.userId)!.push(item);
  });

  // If no valid items, return empty array
  if (userGroups.size === 0) {
    return [];
  }

  // Check if any user exceeds max percentage
  const totalItems = items.filter(item => item.userId && item.userId.trim() !== '').length;
  const maxItemsPerUser = Math.ceil(totalItems * finalConfig.maxPercentageFromSingleUser);// Trim users who exceed the threshold
  let trimmedCount = 0;
  userGroups.forEach((userItems, userId) => {
    if (userItems.length > maxItemsPerUser) {
      const before = userItems.length;
      userGroups.set(userId, userItems.slice(0, maxItemsPerUser));
      trimmedCount += (before - maxItemsPerUser);}
  });

  if (trimmedCount > 0) {}

  // Convert to array and sort by group size (descending) for better interleaving
  const sortedGroups = Array.from(userGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([userId, items]) => ({ userId, items, index: 0 }));

  // Interleave items from different users
  const diversified: T[] = [];
  let lastUserId: string | null = null;
  let consecutiveCount = 0;

  while (sortedGroups.some(group => group.index < group.items.length)) {
    let itemAdded = false;

    // First, try to find an item from a different user than the last one
    for (const group of sortedGroups) {
      if (group.index >= group.items.length) {
        continue;
      }

      // Prefer items from different users
      if (group.userId !== lastUserId) {
        diversified.push(group.items[group.index]);
        group.index++;
        lastUserId = group.userId;
        consecutiveCount = 1;
        itemAdded = true;
        break;
      }
    }

    // If all remaining items are from the same user, add them respecting the consecutive limit
    if (!itemAdded) {
      for (const group of sortedGroups) {
        if (group.index >= group.items.length) {
          continue;
        }

        // Check if we can add from this user
        if (group.userId === lastUserId && consecutiveCount >= finalConfig.maxConsecutiveFromSameUser) {
          continue;
        }

        // Add item from this group
        diversified.push(group.items[group.index]);
        group.index++;

        // Update tracking
        if (group.userId === lastUserId) {
          consecutiveCount++;
        } else {
          lastUserId = group.userId;
          consecutiveCount = 1;
        }

        itemAdded = true;
        break;
      }
    }

    // If still no item added (shouldn't happen), break to avoid infinite loop
    if (!itemAdded) {break;
    }
  }return diversified;
}

/**
 * Analyzes feed diversity metrics
 * 
 * @param items - Array of feed items with userId property
 * @returns Diversity metrics
 */
export function analyzeFeedDiversity<T extends FeedItem>(items: T[]): {
  totalItems: number;
  uniqueUsers: number;
  maxConsecutiveFromSameUser: number;
  userDistribution: Record<string, number>;
  maxPercentageFromSingleUser: number;
} {
  if (!items || items.length === 0) {
    return {
      totalItems: 0,
      uniqueUsers: 0,
      maxConsecutiveFromSameUser: 0,
      userDistribution: {},
      maxPercentageFromSingleUser: 0,
    };
  }

  const userCounts = new Map<string, number>();
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  let lastUserId = items[0]?.userId;

  items.forEach((item, index) => {
    // Count items per user
    userCounts.set(item.userId, (userCounts.get(item.userId) || 0) + 1);

    // Track consecutive items
    if (index > 0) {
      if (item.userId === lastUserId) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
        lastUserId = item.userId;
      }
    }
  });

  const userDistribution: Record<string, number> = {};
  let maxCount = 0;
  userCounts.forEach((count, userId) => {
    userDistribution[userId] = count;
    maxCount = Math.max(maxCount, count);
  });

  return {
    totalItems: items.length,
    uniqueUsers: userCounts.size,
    maxConsecutiveFromSameUser: maxConsecutive,
    userDistribution,
    maxPercentageFromSingleUser: maxCount / items.length,
  };
}
