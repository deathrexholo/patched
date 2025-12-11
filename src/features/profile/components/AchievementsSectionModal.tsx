import React, { useState } from 'react';
import { X, Save, Trophy, Plus, Edit3, Trash2 } from 'lucide-react';
import { Achievement } from '../types/ProfileTypes';
import AchievementModal from './AchievementModal';
import '../styles/SectionModal.css';

export interface AchievementsSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (achievements: Achievement[]) => void;
  achievements: Achievement[];
}

const AchievementsSectionModal: React.FC<AchievementsSectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  achievements
}) => {
  const [localAchievements, setLocalAchievements] = useState<Achievement[]>(achievements);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

  // Update local state when props change
  React.useEffect(() => {
    setLocalAchievements(achievements);
    setHasUnsavedChanges(false);
  }, [achievements, isOpen]);

  const handleAddAchievement = () => {
    setEditingAchievement(null);
    setIsAchievementModalOpen(true);
  };

  const handleEditAchievement = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setIsAchievementModalOpen(true);
  };

  const handleDeleteAchievement = (achievementId: string) => {
    if (window.confirm('Are you sure you want to delete this achievement?')) {
      const updatedAchievements = localAchievements.filter(a => a.id !== achievementId);
      setLocalAchievements(updatedAchievements);
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveAchievement = (achievementData: Omit<Achievement, 'id'>) => {
    if (editingAchievement) {
      // Update existing achievement
      const updatedAchievement: Achievement = {
        ...achievementData,
        id: editingAchievement.id
      };
      
      const updatedAchievements = localAchievements.map(a =>
        a.id === editingAchievement.id ? updatedAchievement : a
      );
      setLocalAchievements(updatedAchievements);
    } else {
      // Add new achievement
      const newAchievement: Achievement = {
        ...achievementData,
        id: `achievement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      setLocalAchievements([...localAchievements, newAchievement]);
    }
    
    setHasUnsavedChanges(true);
    setIsAchievementModalOpen(false);
    setEditingAchievement(null);
  };

  const handleSave = () => {
    onSave(localAchievements);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getVerificationBadge = (status?: string) => {
    if (!status || status === 'unverified') return null;

    return (
      <span
        className={`verification-badge ${status}`}
        aria-label={`Verification status: ${status}`}
      >
        {status === 'verified' ? '✓' : '⏳'}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="section-modal achievements-section-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-header-left">
              <Trophy size={20} />
              <h2 className="modal-title">Manage Achievements</h2>
            </div>
            <button
              className="modal-close-button"
              onClick={handleClose}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <div className="section-header-with-actions">
              <div className="section-info">
                <h3 className="section-subtitle">Your Achievements</h3>
                <p className="section-description">
                  Add and manage your achievements, awards, and recognitions
                </p>
              </div>
              <button
                className="add-item-button"
                onClick={handleAddAchievement}
                type="button"
              >
                <Plus size={16} />
                Add Achievement
              </button>
            </div>

            {localAchievements.length === 0 ? (
              <div className="empty-state">
                <Trophy size={48} className="empty-icon" />
                <h4 className="empty-title">No achievements yet</h4>
                <p className="empty-description">
                  Start adding your achievements to showcase your accomplishments!
                </p>
                <button
                  className="empty-action-button"
                  onClick={handleAddAchievement}
                  type="button"
                >
                  <Plus size={20} />
                  Add Your First Achievement
                </button>
              </div>
            ) : (
              <div className="items-list">
                {localAchievements
                  .sort((a, b) => new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime())
                  .map((achievement) => (
                    <div key={achievement.id} className="item-card">
                      <div className="item-header">
                        <div className="item-icon-container">
                          {achievement.imageUrl ? (
                            <img
                              src={achievement.imageUrl}
                              alt={`${achievement.title} badge`}
                              className="item-image"
                            />
                          ) : (
                            <div className="item-icon">
                              <Trophy size={24} />
                            </div>
                          )}
                          {getVerificationBadge(achievement.verificationStatus)}
                        </div>

                        <div className="item-actions">
                          <button
                            className="action-button edit-button"
                            onClick={() => handleEditAchievement(achievement)}
                            aria-label={`Edit ${achievement.title}`}
                            type="button"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="action-button delete-button"
                            onClick={() => handleDeleteAchievement(achievement.id)}
                            aria-label={`Delete ${achievement.title}`}
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="item-content">
                        <h4 className="item-title">{achievement.title}</h4>
                        <div className="item-meta">
                          <span className="item-category">{achievement.category}</span>
                          <span className="item-date">{formatDate(achievement.dateEarned)}</span>
                        </div>
                        {achievement.description && (
                          <p className="item-description">{achievement.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <div className="modal-footer-left">
              {hasUnsavedChanges && (
                <span className="unsaved-indicator">
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="modal-footer-right">
              <button
                className="modal-button secondary"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={handleSave}
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Modal */}
      <AchievementModal
        isOpen={isAchievementModalOpen}
        achievement={editingAchievement}
        onClose={() => {
          setIsAchievementModalOpen(false);
          setEditingAchievement(null);
        }}
        onSave={handleSaveAchievement}
      />
    </>
  );
};

export default AchievementsSectionModal;