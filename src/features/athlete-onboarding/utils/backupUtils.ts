import { Sport, Position, AthleteProfile } from '../store/onboardingStore';

export interface OnboardingBackup {
  selectedSports: Sport[];
  selectedPosition: Position | null;
  selectedSpecializations: Record<string, string>;
  currentStep: number;
  timestamp: number;
  version: string;
}

export interface BackupMetadata {
  backupCount: number;
  lastBackupTime: number;
  oldestBackupTime: number;
}

const BACKUP_KEY = 'athlete-onboarding-backup';
const BACKUP_METADATA_KEY = 'athlete-onboarding-backup-metadata';
const MAX_BACKUPS = 5;
const BACKUP_VERSION = '1.0.0';

/**
 * Creates a backup of current onboarding progress
 */
export const createOnboardingBackup = (
  selectedSports: Sport[],
  selectedPosition: Position | null,
  selectedSpecializations: Record<string, string>,
  currentStep: number = 1
): boolean => {
  try {
    const backup: OnboardingBackup = {
      selectedSports,
      selectedPosition,
      selectedSpecializations,
      currentStep,
      timestamp: Date.now(),
      version: BACKUP_VERSION
    };

    // Get existing backups
    const existingBackups = getOnboardingBackups();
    
    // Add new backup to the beginning
    existingBackups.unshift(backup);
    
    // Keep only the most recent backups
    const trimmedBackups = existingBackups.slice(0, MAX_BACKUPS);
    
    // Save backups
    localStorage.setItem(BACKUP_KEY, JSON.stringify(trimmedBackups));
    
    // Update metadata
    updateBackupMetadata(trimmedBackups);return true;
  } catch (error) {
    console.error('Failed to create onboarding backup:', error);
    return false;
  }
};

/**
 * Retrieves all onboarding backups
 */
export const getOnboardingBackups = (): OnboardingBackup[] => {
  try {
    const backupsJson = localStorage.getItem(BACKUP_KEY);
    if (!backupsJson) return [];
    
    const backups = JSON.parse(backupsJson) as OnboardingBackup[];
    
    // Validate backup format
    return backups.filter(backup => 
      backup && 
      typeof backup.timestamp === 'number' &&
      typeof backup.currentStep === 'number' &&
      backup.version
    );
  } catch (error) {
    console.error('Failed to retrieve onboarding backups:', error);
    return [];
  }
};

/**
 * Gets the most recent onboarding backup
 */
export const getLatestOnboardingBackup = (): OnboardingBackup | null => {
  const backups = getOnboardingBackups();
  return backups.length > 0 ? backups[0] : null;
};

/**
 * Restores onboarding progress from a backup
 */
export const restoreOnboardingFromBackup = (backup: OnboardingBackup): boolean => {
  try {
    // Validate backup data
    if (!backup || !backup.timestamp) {
      throw new Error('Invalid backup data');
    }
    
    // Check if backup is not too old (7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (Date.now() - backup.timestamp > maxAge) {
      console.warn('Backup is older than 7 days, restoration may not be reliable');
    }
    
    // Restore to Zustand store (this would be called from the store)return true;
  } catch (error) {
    console.error('Failed to restore onboarding from backup:', error);
    return false;
  }
};

/**
 * Clears all onboarding backups
 */
export const clearOnboardingBackups = (): boolean => {
  try {
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(BACKUP_METADATA_KEY);return true;
  } catch (error) {
    console.error('Failed to clear onboarding backups:', error);
    return false;
  }
};

/**
 * Gets backup metadata
 */
export const getBackupMetadata = (): BackupMetadata | null => {
  try {
    const metadataJson = localStorage.getItem(BACKUP_METADATA_KEY);
    if (!metadataJson) return null;
    
    return JSON.parse(metadataJson) as BackupMetadata;
  } catch (error) {
    console.error('Failed to get backup metadata:', error);
    return null;
  }
};

/**
 * Updates backup metadata
 */
const updateBackupMetadata = (backups: OnboardingBackup[]): void => {
  try {
    if (backups.length === 0) {
      localStorage.removeItem(BACKUP_METADATA_KEY);
      return;
    }
    
    const timestamps = backups.map(backup => backup.timestamp);
    const metadata: BackupMetadata = {
      backupCount: backups.length,
      lastBackupTime: Math.max(...timestamps),
      oldestBackupTime: Math.min(...timestamps)
    };
    
    localStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to update backup metadata:', error);
  }
};

/**
 * Checks if there are any available backups
 */
export const hasOnboardingBackups = (): boolean => {
  return getOnboardingBackups().length > 0;
};

/**
 * Gets a human-readable description of the backup
 */
export const getBackupDescription = (backup: OnboardingBackup): string => {
  const date = new Date(backup.timestamp);
  const timeAgo = getTimeAgo(backup.timestamp);
  
  let description = `Backup from ${timeAgo}`;
  
  if (backup.selectedSports && backup.selectedSports.length > 0) {
    description += ` - ${backup.selectedSports.map(s => s.name).join(', ')}`;
    
    if (backup.selectedPosition) {
      description += ` (${backup.selectedPosition.name})`;
    }
  }
  
  const specializationCount = Object.keys(backup.selectedSpecializations).length;
  if (specializationCount > 0) {
    description += ` - ${specializationCount} specialization${specializationCount > 1 ? 's' : ''}`;
  }
  
  return description;
};

/**
 * Gets a human-readable time ago string
 */
const getTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Validates backup data integrity
 */
export const validateBackup = (backup: OnboardingBackup): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!backup) {
    errors.push('Backup data is null or undefined');
    return { isValid: false, errors };
  }
  
  if (!backup.timestamp || typeof backup.timestamp !== 'number') {
    errors.push('Invalid or missing timestamp');
  }
  
  if (!backup.version) {
    errors.push('Missing backup version');
  }
  
  if (typeof backup.currentStep !== 'number' || backup.currentStep < 1) {
    errors.push('Invalid current step');
  }
  
  if (backup.selectedSports) {
    backup.selectedSports.forEach((sport, index) => {
      if (!sport.id || !sport.name) {
        errors.push(`Invalid sport data in backup at index ${index}`);
      }
    });
  }
  
  if (backup.selectedPosition && (!backup.selectedPosition.id || !backup.selectedPosition.name)) {
    errors.push('Invalid position data in backup');
  }
  
  if (backup.selectedSpecializations && typeof backup.selectedSpecializations !== 'object') {
    errors.push('Invalid specializations data in backup');
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Automatically creates backups at key points in the onboarding flow
 */
export const autoBackupOnboardingProgress = (
  selectedSports: Sport[],
  selectedPosition: Position | null,
  selectedSpecializations: Record<string, string>,
  currentStep: number
): void => {
  // Only create backup if there's meaningful progress
  if (selectedSports.length > 0 || selectedPosition || Object.keys(selectedSpecializations).length > 0) {
    createOnboardingBackup(selectedSports, selectedPosition, selectedSpecializations, currentStep);
  }
};

/**
 * Recovery utility that attempts to restore from the most recent backup
 */
export const attemptOnboardingRecovery = (): OnboardingBackup | null => {
  try {
    const latestBackup = getLatestOnboardingBackup();
    
    if (!latestBackup) {return null;
    }
    
    const validation = validateBackup(latestBackup);
    if (!validation.isValid) {
      console.error('Backup validation failed:', validation.errors);
      return null;
    }return latestBackup;
  } catch (error) {
    console.error('Failed to attempt onboarding recovery:', error);
    return null;
  }
};