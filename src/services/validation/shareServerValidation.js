/**
 * Server-Side Share Validation Service
 * Provides comprehensive validation and error handling for share operations
 */

import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS, SHARE_TYPES, PRIVACY_LEVELS, VALIDATION_RULES } from '../../constants/sharing';
import errorHandler from '../../utils/errorHandler';

class ShareServerValidation {
  constructor() {
    this.validationCache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
  }

  /**
   * Comprehensive server-side validation for share operations
   * @param {Object} shareData - Share data to validate
   * @param {string} userId - User performing the share
   * @returns {Promise<{isValid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateShareOperation(shareData, userId) {
    const errors = [];
    const warnings = [];

    try {
      // Validate required fields
      const fieldValidation = this.validateRequiredFields(shareData);
      if (!fieldValidation.isValid) {
        errors.push(...fieldValidation.errors);
      }

      // Validate share type
      const typeValidation = this.validateShareType(shareData.shareType);
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors);
      }

      // Validate targets
      const targetsValidation = this.validateTargets(shareData.shareType, shareData.targets);
      if (!targetsValidation.isValid) {
        errors.push(...targetsValidation.errors);
      }

      // Validate message content
      const messageValidation = this.validateMessage(shareData.message);
      if (!messageValidation.isValid) {
        errors.push(...messageValidation.errors);
      }
      if (messageValidation.warnings.length > 0) {
        warnings.push(...messageValidation.warnings);
      }

      // Validate privacy level
      const privacyValidation = this.validatePrivacy(shareData.privacy);
      if (!privacyValidation.isValid) {
        errors.push(...privacyValidation.errors);
      }

      // Validate post exists and is shareable
      const postValidation = await this.validatePost(shareData.postId, userId);
      if (!postValidation.isValid) {
        errors.push(...postValidation.errors);
      }

      // Validate user authentication
      const authValidation = await this.validateUserAuth(userId);
      if (!authValidation.isValid) {
        errors.push(...authValidation.errors);
      }

      // Log validation results
      if (errors.length > 0) {
        errorHandler.logError(
          new Error('Share validation failed'),
          'ShareServerValidation',
          'warning',
          {
            shareData,
            userId,
            errors,
            warnings
          }
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errorHandler.logError(
        error,
        'ShareServerValidation-validateShareOperation',
        'error',
        { shareData, userId }
      );

      return {
        isValid: false,
        errors: ['Validation error occurred'],
        warnings: []
      };
    }
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(shareData) {
    const errors = [];
    const requiredFields = ['postId', 'sharerId', 'shareType', 'targets', 'privacy'];

    requiredFields.forEach(field => {
      if (!shareData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate share type
   */
  validateShareType(shareType) {
    const errors = [];

    if (!shareType) {
      errors.push('Share type is required');
    } else if (!Object.values(SHARE_TYPES).includes(shareType)) {
      errors.push(`Invalid share type: ${shareType}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate targets based on share type
   */
  validateTargets(shareType, targets) {
    const errors = [];

    if (!Array.isArray(targets)) {
      errors.push('Targets must be an array');
      return { isValid: false, errors };
    }

    if (targets.length === 0) {
      errors.push('At least one target is required');
      return { isValid: false, errors };
    }

    switch (shareType) {
      case SHARE_TYPES.FRIENDS:
        if (targets.length > VALIDATION_RULES.MAX_FRIENDS_PER_SHARE) {
          errors.push(`Cannot share to more than ${VALIDATION_RULES.MAX_FRIENDS_PER_SHARE} friends at once`);
        }
        break;

      case SHARE_TYPES.FEED:
        if (targets.length !== 1 || targets[0] !== 'feed') {
          errors.push('Feed shares must have exactly one target: "feed"');
        }
        break;

      case SHARE_TYPES.GROUPS:
        if (targets.length > VALIDATION_RULES.MAX_GROUPS_PER_SHARE) {
          errors.push(`Cannot share to more than ${VALIDATION_RULES.MAX_GROUPS_PER_SHARE} groups at once`);
        }
        break;

      default:
        errors.push('Unknown share type for target validation');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate message content
   */
  validateMessage(message) {
    const errors = [];
    const warnings = [];

    if (message && typeof message !== 'string') {
      errors.push('Message must be a string');
      return { isValid: false, errors, warnings };
    }

    if (message && message.length > VALIDATION_RULES.MAX_MESSAGE_LENGTH) {
      errors.push(`Message exceeds maximum length of ${VALIDATION_RULES.MAX_MESSAGE_LENGTH} characters`);
    }

    // Check for suspicious patterns
    if (message) {
      const suspiciousPatterns = [
        /(.)\1{10,}/i, // Repeated characters
        /https?:\/\/[^\s]+/gi, // URLs (warning only)
        /\b(click here|free money|limited time)\b/gi // Spam phrases
      ];

      suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(message)) {
          if (index === 1) {
            warnings.push('Message contains URLs');
          } else {
            warnings.push('Message contains suspicious patterns');
          }
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate privacy level
   */
  validatePrivacy(privacy) {
    const errors = [];

    if (!privacy) {
      errors.push('Privacy level is required');
    } else if (!Object.values(PRIVACY_LEVELS).includes(privacy)) {
      errors.push(`Invalid privacy level: ${privacy}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate post exists and is shareable
   */
  async validatePost(postId, userId) {
    const errors = [];

    try {
      // Check cache first
      const cacheKey = `post_${postId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const postRef = doc(db, COLLECTIONS.POSTS, postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        errors.push('Post not found');
        const result = { isValid: false, errors };
        this.setCache(cacheKey, result);
        return result;
      }

      const post = postDoc.data();

      // Check if post has sharing disabled
      if (post.sharingDisabled === true) {
        errors.push('Sharing is disabled for this post');
      }

      // Check if post is deleted
      if (post.deleted === true) {
        errors.push('Cannot share deleted post');
      }

      const result = { isValid: errors.length === 0, errors };
      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      errorHandler.logError(
        error,
        'ShareServerValidation-validatePost',
        'error',
        { postId, userId }
      );

      errors.push('Error validating post');
      return { isValid: false, errors };
    }
  }

  /**
   * Validate user authentication and status
   */
  async validateUserAuth(userId) {
    const errors = [];

    try {
      // Check cache first
      const cacheKey = `user_${userId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        errors.push('User not found');
        const result = { isValid: false, errors };
        this.setCache(cacheKey, result);
        return result;
      }

      const user = userDoc.data();

      // Check if user is banned or suspended
      if (user.banned === true) {
        errors.push('User account is banned');
      }

      if (user.suspended === true) {
        errors.push('User account is suspended');
      }

      // Check if user has sharing disabled
      if (user.sharingDisabled === true) {
        errors.push('Sharing is disabled for this account');
      }

      const result = { isValid: errors.length === 0, errors };
      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      errorHandler.logError(
        error,
        'ShareServerValidation-validateUserAuth',
        'error',
        { userId }
      );

      errors.push('Error validating user');
      return { isValid: false, errors };
    }
  }

  /**
   * Validate Firestore security rules compliance
   * @param {Object} shareData - Share data
   * @param {string} userId - User ID
   * @returns {Object} Validation result
   */
  validateFirestoreRulesCompliance(shareData, userId) {
    const errors = [];

    // Check if sharerId matches authenticated user
    if (shareData.sharerId !== userId) {
      errors.push('Sharer ID must match authenticated user');
    }

    // Check targets array size limits
    if (shareData.targets && shareData.targets.length > 50) {
      errors.push('Targets array exceeds maximum size of 50');
    }

    // Check message length
    if (shareData.message && shareData.message.length > 500) {
      errors.push('Message exceeds maximum length of 500 characters');
    }

    // Validate share type specific rules
    switch (shareData.shareType) {
      case SHARE_TYPES.FRIENDS:
        if (shareData.targets.length > 50) {
          errors.push('Cannot share to more than 50 friends');
        }
        break;

      case SHARE_TYPES.FEED:
        if (shareData.targets.length !== 1 || shareData.targets[0] !== 'feed') {
          errors.push('Feed shares must have exactly one target: "feed"');
        }
        break;

      case SHARE_TYPES.GROUPS:
        if (shareData.targets.length > 10) {
          errors.push('Cannot share to more than 10 groups');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.validationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.validationCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.validationCache.size > 1000) {
      const oldestKeys = Array.from(this.validationCache.keys()).slice(0, 100);
      oldestKeys.forEach(k => this.validationCache.delete(k));
    }
  }

  clearCache() {
    this.validationCache.clear();
  }
}

export default new ShareServerValidation();
