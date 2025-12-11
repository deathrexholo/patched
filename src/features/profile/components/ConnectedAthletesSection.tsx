import React from 'react';
import { Edit3, Users, Plus, UserCheck } from 'lucide-react';
import { PersonalDetails } from '../types/ProfileTypes';
import '../styles/ConnectedAthletesSection.css';

interface ConnectedAthletesProps {
  personalDetails: PersonalDetails;
  isOwner: boolean;
  onEdit: () => void;
  onAddAthlete?: () => void;
}

const ConnectedAthletesSection: React.FC<ConnectedAthletesProps> = ({
  personalDetails,
  isOwner,
  onEdit,
  onAddAthlete
}) => {
  const connectedAthletes = personalDetails.connectedAthletes || [];
  const hasConnectedAthletes = connectedAthletes.length > 0;

  return (
    <section className="profile-section connected-athletes-section" aria-labelledby="connected-athletes-heading">
      <div className="section-header">
        <h2 id="connected-athletes-heading" className="section-title">
          Connected Athletes
        </h2>
        {isOwner && (
          <div className="section-actions">
            {hasConnectedAthletes && onAddAthlete && (
              <button
                className="section-action-secondary"
                onClick={onAddAthlete}
                aria-label="Add new athlete connection"
                type="button"
              >
                <Plus size={16} aria-hidden="true" />
                <span>Add</span>
              </button>
            )}
            <button
              className="section-action"
              onClick={onEdit}
              aria-label="Edit connected athletes"
              type="button"
            >
              <Edit3 size={16} aria-hidden="true" />
              <span>Edit</span>
            </button>
          </div>
        )}
      </div>

      <div className="section-content">
        {!hasConnectedAthletes ? (
          <div className="empty-state">
            <Users size={48} className="empty-state-icon" aria-hidden="true" />
            <p className="empty-state-text">No connected athletes yet</p>
            <p className="empty-state-description">
              Connect with your child athletes to track their progress and achievements
            </p>
            {isOwner && (
              <button
                className="empty-state-button"
                onClick={onAddAthlete || onEdit}
                type="button"
              >
                Connect Athletes
              </button>
            )}
          </div>
        ) : (
          <div className="athletes-grid">
            {connectedAthletes.map((athleteName, index) => (
              <div key={`athlete-${index}`} className="athlete-card">
                <div className="athlete-avatar">
                  <div className="avatar-placeholder">
                    <span className="avatar-icon" aria-hidden="true">👤</span>
                  </div>
                </div>
                <div className="athlete-info">
                  <h3 className="athlete-name">{athleteName}</h3>
                  <div className="athlete-relationship">
                    <UserCheck size={14} aria-hidden="true" />
                    <span>{personalDetails.relationship || 'Parent'}</span>
                  </div>
                </div>
                <div className="athlete-status">
                  <span className="status-indicator status-connected" aria-label="Connected">
                    Connected
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasConnectedAthletes && personalDetails.relationship && (
        <div className="relationship-info">
          <div className="relationship-badge">
            <UserCheck size={16} aria-hidden="true" />
            <span>Relationship: {personalDetails.relationship}</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default ConnectedAthletesSection;