/**
 * Firestore data validation and cleaning utilities
 */

/**
 * Remove undefined values from an object to prevent Firestore errors
 * Firestore doesn't accept undefined values - they must be null or omitted
 */
export const cleanFirestoreData = <T extends Record<string, any>>(data: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key as keyof T] = value;
    }
  });
  
  return cleaned;
};

/**
 * Convert undefined values to null for Firestore compatibility
 * Use this when you want to explicitly store null values instead of omitting fields
 */
export const convertUndefinedToNull = <T extends Record<string, any>>(data: T): T => {
  const converted = { ...data } as Record<string, any>;
  
  Object.keys(converted).forEach(key => {
    if (converted[key] === undefined) {
      converted[key] = null;
    }
  });
  
  return converted as T;
};

/**
 * Validate that an object doesn't contain undefined values
 * Returns validation result with details about undefined fields
 */
export const validateFirestoreData = (data: Record<string, any>): {
  isValid: boolean;
  undefinedFields: string[];
  message?: string;
} => {
  const undefinedFields = Object.entries(data)
    .filter(([_, value]) => value === undefined)
    .map(([key]) => key);
  
  const isValid = undefinedFields.length === 0;
  
  return {
    isValid,
    undefinedFields,
    message: isValid 
      ? undefined 
      : `Found undefined values in fields: ${undefinedFields.join(', ')}. Firestore doesn't accept undefined values.`
  };
};

/**
 * Prepare user profile data for Firestore
 * Handles common user profile fields and ensures Firestore compatibility
 */
export const prepareUserProfileForFirestore = (profileData: {
  displayName?: string;
  email?: string;
  photoURL?: string;
  age?: number;
  height?: number;
  weight?: number;
  sex?: string;
  sport?: string;
  position?: string;
  [key: string]: any;
}) => {
  // Clean the data and add metadata
  const cleanedData = cleanFirestoreData({
    ...profileData,
    updatedAt: new Date(),
    // Ensure required fields have defaults
    displayName: profileData.displayName || 'User',
  });
  
  return cleanedData;
};

/**
 * Prepare any data object for Firestore by cleaning undefined values
 * and adding common metadata fields
 */
export const prepareForFirestore = <T extends Record<string, any>>(
  data: T,
  options: {
    addTimestamp?: boolean;
    addUpdatedAt?: boolean;
    addCreatedAt?: boolean;
  } = {}
): Partial<T & { createdAt?: Date; updatedAt?: Date; timestamp?: Date }> => {
  const { addTimestamp = false, addUpdatedAt = false, addCreatedAt = false } = options;
  
  let preparedData = cleanFirestoreData(data);
  
  if (addTimestamp) {
    preparedData = { ...preparedData, timestamp: new Date() };
  }
  
  if (addUpdatedAt) {
    preparedData = { ...preparedData, updatedAt: new Date() };
  }
  
  if (addCreatedAt) {
    preparedData = { ...preparedData, createdAt: new Date() };
  }
  
  return preparedData;
};