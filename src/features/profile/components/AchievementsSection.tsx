import React from 'react';
import { Trophy, Medal, Award, Plus, Edit3, Trash2 } from 'lucide-react';
import { Achievement } from '../types/ProfileTypes';
import '../styles/AchievementsSection.css';

interface AchievementsSectionProps {
  achievements: Achievement[];
  isOwner?: boolean;
  onAddAchievement?: () => void;
  onEditAchievement?: (achievement: Achievement) => void;
  onDeleteAchievement?: (achievementId: string) => void;
  onEditSection?: () => void;
  onOpenEditModal?: (initialTab: string) => void;
}

const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
  isOwner = false,
  onAddAchievement,
  onEditAchievement,
  onDeleteAchievement,
  onEditSection,
  onOpenEditModal
}) => {
  // Sort achievements by date (most recent first)
  const sortedAchievements = [...achievements].sort((a, b) => 
    new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime()
  );

  const getAchievementIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'championship':
      case 'tournament':
        return <Trophy size={24} aria-hidden="true" />;
      case 'medal':
      case 'competition':
        return <Medal size={24} aria-hidden="true" />;
      default:
        return <Award size={24} aria-hidden="true" />;
    }
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const handleEditClick = (achievement: Achievement, event: React.MouseEvent) => {
    event.stopPropagation();
    onEditAchievement?.(achievement);
  };

  const handleDeleteClick = (achievementId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteAchievement?.(achievementId);
  };

  return (
    <section className="profile-section achievements-section" aria-labelledby="achievements-heading">
      <div className="section-header">
        <h2 id="achievements-heading" className="section-title">
          Achievements
        </h2>
        {isOwner && (
          <div className="section-actions">
            {(onEditSection || onOpenEditModal) && (
              <button
                className="section-action-button edit-section-button"
                onClick={() => onOpenEditModal ? onOpenEditModal('achievements') : onEditSection?.()}
                aria-label="Edit achievements section"
                type="button"
              >
                <Edit3 size={16} aria-hidden="true" />
                <span>Edit Section</span>
              </button>
            )}
            <button
              className="section-action-button add-achievement-button"
              onClick={onAddAchievement}
              aria-label="Add new achievement"
              type="button"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Add Achievement</span>
            </button>
          </div>
        )}
      </div>

      {sortedAchievements.length === 0 ? (
        <div className="empty-state" role="region" aria-label="No achievements">
          <div className="empty-state-icon" aria-hidden="true">
            <Trophy size={48} />
          </div>
          <h3 className="empty-state-title">No achievements yet</h3>
          <p className="empty-state-description">
            {isOwner 
              ? "Start adding your achievements to showcase your accomplishments!"
              : "This athlete hasn't added any achievements yet."
            }
          </p>
          {isOwner && (
            <button
              className="empty-state-action"
              onClick={onAddAchievement}
              type="button"
              aria-label="Add your first achievement"
            >
              <Plus size={20} aria-hidden="true" />
              Add Your First Achievement
            </button>
          )}
        </div>
      ) : (
        <div className="achievements-grid" role="list" aria-label="List of achievements">
          {sortedAchievements.map((achievement) => (
            <article 
              key={achievement.id} 
              className="achievement-card"
              role="listitem"
              aria-labelledby={`achievement-title-${achievement.id}`}
            >
              <div className="achievement-header">
                <div className="achievement-icon-container">
                  <div className="achievement-icon">
                    {achievement.imageUrl ? (
                      <img 
                        src={achievement.imageUrl} 
                        alt={`${achievement.title} achievement badge`}
                        className="achievement-image"
                        loading="lazy"
                      />
                    ) : (
                      getAchievementIcon(achievement.category)
                    )}
                  </div>
                  {getVerificationBadge(achievement.verificationStatus)}
                </div>
                
                {isOwner && (
                  <div className="achievement-actions">
                    <button
                      className="action-button edit-button"
                      onClick={(e) => handleEditClick(achievement, e)}
                      aria-label={`Edit ${achievement.title} achievement`}
                      type="button"
                    >
                      <Edit3 size={14} aria-hidden="true" />
                    </button>
                    <button
                      className="action-button delete-button"
                      onClick={(e) => handleDeleteClick(achievement.id, e)}
                      aria-label={`Delete ${achievement.title} achievement`}
                      type="button"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              <div className="achievement-content">
                <h3 
                  id={`achievement-title-${achievement.id}`}
                  className="achievement-title"
                >
                  {achievement.title}
                </h3>
                
                <div className="achievement-meta">
                  <span className="achievement-category" aria-label={`Category: ${achievement.category}`}>
                    {achievement.category}
                  </span>
                  <span className="achievement-date" aria-label={`Date earned: ${formatDate(achievement.dateEarned)}`}>
                    {formatDate(achievement.dateEarned)}
                  </span>
                </div>
                
                {achievement.description && (
                  <p className="achievement-description">
                    {achievement.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default AchievementsSection;