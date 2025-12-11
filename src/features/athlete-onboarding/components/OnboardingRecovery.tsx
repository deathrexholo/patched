import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Download,
  ArrowRight,
  Home
} from 'lucide-react';
import { useOnboardingStore } from '../store/onboardingStore';
import {
  OnboardingBackup,
  getOnboardingBackups,
  getLatestOnboardingBackup,
  restoreOnboardingFromBackup,
  clearOnboardingBackups,
  getBackupDescription,
  validateBackup,
  hasOnboardingBackups
} from '../utils/backupUtils';
import '../styles/OnboardingRecovery.css';

interface OnboardingRecoveryProps {
  onRecoveryComplete?: () => void;
  showFullInterface?: boolean;
}

const OnboardingRecovery: React.FC<OnboardingRecoveryProps> = ({
  onRecoveryComplete,
  showFullInterface = true
}) => {
  const navigate = useNavigate();
  const { 
    setSports, 
    setPosition, 
    setSpecialization, 
    resetOnboarding,
    setError 
  } = useOnboardingStore();
  
  const [backups, setBackups] = useState<OnboardingBackup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState<OnboardingBackup | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setIsLoading(true);
      const availableBackups = getOnboardingBackups();
      setBackups(availableBackups);
      
      // Auto-select the most recent backup
      if (availableBackups.length > 0) {
        setSelectedBackup(availableBackups[0]);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      setErrorMessage('Failed to load backup data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (backup: OnboardingBackup) => {
    try {
      setIsRestoring(true);
      setErrorMessage(null);
      
      // Validate backup before restoring
      const validation = validateBackup(backup);
      if (!validation.isValid) {
        throw new Error(`Invalid backup: ${validation.errors.join(', ')}`);
      }
      
      // Restore data to store
      if (backup.selectedSports && backup.selectedSports.length > 0) {
        setSports(backup.selectedSports);
      }
      
      if (backup.selectedPosition) {
        setPosition(backup.selectedPosition);
      }
      
      // Restore specializations
      Object.entries(backup.selectedSpecializations).forEach(([category, value]) => {
        setSpecialization(category, value);
      });
      
      setRecoveryStatus('success');
      
      // Navigate to appropriate step based on backup
      setTimeout(() => {
        if (backup.selectedSports && backup.selectedSports.length > 0 && backup.selectedPosition) {
          // Go to specialization page
          navigate('/athlete-onboarding/specialization');
        } else if (backup.selectedSports && backup.selectedSports.length > 0) {
          // Go to position selection
          navigate('/athlete-onboarding/position');
        } else {
          // Go to sport selection
          navigate('/athlete-onboarding/sport');
        }
        
        if (onRecoveryComplete) {
          onRecoveryComplete();
        }
      }, 1500);
      
    } catch (error) {
      console.error('Failed to restore backup:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to restore backup');
      setRecoveryStatus('error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleQuickRestore = async () => {
    const latestBackup = getLatestOnboardingBackup();
    if (latestBackup) {
      await handleRestoreBackup(latestBackup);
    }
  };

  const handleClearBackups = async () => {
    if (window.confirm('Are you sure you want to clear all backup data? This cannot be undone.')) {
      try {
        clearOnboardingBackups();
        setBackups([]);
        setSelectedBackup(null);
        setRecoveryStatus('idle');
      } catch (error) {
        console.error('Failed to clear backups:', error);
        setErrorMessage('Failed to clear backup data');
      }
    }
  };

  const handleStartOver = () => {
    resetOnboarding();
    navigate('/athlete-onboarding/sport');
    if (onRecoveryComplete) {
      onRecoveryComplete();
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="onboarding-recovery loading">
        <div className="loading-spinner" />
        <p>Loading recovery options...</p>
      </div>
    );
  }

  if (!showFullInterface && !hasOnboardingBackups()) {
    return null;
  }

  return (
    <div className="onboarding-recovery">
      <div className="recovery-container">
        <div className="recovery-header">
          <div className="recovery-icon">
            <RefreshCw size={32} />
          </div>
          <h1>Recover Your Progress</h1>
          <p>
            We found some saved progress from your previous onboarding session. 
            You can restore from a backup or start fresh.
          </p>
        </div>

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        {recoveryStatus === 'success' && (
          <div className="success-message">
            <CheckCircle size={20} />
            <span>Progress restored successfully! Redirecting...</span>
          </div>
        )}

        {backups.length > 0 ? (
          <div className="recovery-content">
            {/* Quick restore option */}
            <div className="quick-restore">
              <h3>Quick Restore</h3>
              <p>Restore your most recent progress</p>
              <button
                className="quick-restore-btn"
                onClick={handleQuickRestore}
                disabled={isRestoring || recoveryStatus === 'success'}
              >
                {isRestoring ? (
                  <>
                    <div className="loading-spinner small" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Restore Latest Progress
                  </>
                )}
              </button>
            </div>

            {/* Detailed backup list */}
            {showFullInterface && (
              <div className="backup-list">
                <h3>Available Backups</h3>
                <div className="backup-items">
                  {backups.map((backup, index) => (
                    <BackupItem
                      key={`${backup.timestamp}-${index}`}
                      backup={backup}
                      isSelected={selectedBackup === backup}
                      onSelect={setSelectedBackup}
                      onRestore={handleRestoreBackup}
                      isRestoring={isRestoring}
                      disabled={recoveryStatus === 'success'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recovery actions */}
            <div className="recovery-actions">
              <button
                className="start-over-btn secondary"
                onClick={handleStartOver}
                disabled={isRestoring}
              >
                Start Fresh
              </button>
              
              {showFullInterface && (
                <button
                  className="clear-backups-btn danger"
                  onClick={handleClearBackups}
                  disabled={isRestoring}
                >
                  <Trash2 size={16} />
                  Clear All Backups
                </button>
              )}
              
              <button
                className="home-btn secondary"
                onClick={handleGoHome}
                disabled={isRestoring}
              >
                <Home size={16} />
                Go Home
              </button>
            </div>
          </div>
        ) : (
          <div className="no-backups">
            <div className="no-backups-icon">
              <Clock size={48} />
            </div>
            <h3>No Backup Data Found</h3>
            <p>
              We couldn't find any saved progress. You can start the onboarding process from the beginning.
            </p>
            <div className="no-backups-actions">
              <button
                className="start-onboarding-btn primary"
                onClick={handleStartOver}
              >
                <ArrowRight size={20} />
                Start Onboarding
              </button>
              <button
                className="home-btn secondary"
                onClick={handleGoHome}
              >
                <Home size={16} />
                Go Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface BackupItemProps {
  backup: OnboardingBackup;
  isSelected: boolean;
  onSelect: (backup: OnboardingBackup) => void;
  onRestore: (backup: OnboardingBackup) => void;
  isRestoring: boolean;
  disabled: boolean;
}

const BackupItem: React.FC<BackupItemProps> = ({
  backup,
  isSelected,
  onSelect,
  onRestore,
  isRestoring,
  disabled
}) => {
  const description = getBackupDescription(backup);
  const validation = validateBackup(backup);
  
  return (
    <div 
      className={`backup-item ${isSelected ? 'selected' : ''} ${!validation.isValid ? 'invalid' : ''}`}
      onClick={() => !disabled && onSelect(backup)}
    >
      <div className="backup-info">
        <div className="backup-description">
          {description}
        </div>
        <div className="backup-details">
          <span className="backup-step">Step {backup.currentStep}</span>
          {!validation.isValid && (
            <span className="backup-invalid">
              <AlertCircle size={14} />
              Invalid
            </span>
          )}
        </div>
      </div>
      
      <button
        className="restore-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRestore(backup);
        }}
        disabled={isRestoring || disabled || !validation.isValid}
      >
        {isRestoring ? (
          <div className="loading-spinner small" />
        ) : (
          <Download size={16} />
        )}
      </button>
    </div>
  );
};

export default OnboardingRecovery;