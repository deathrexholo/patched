import React, { useState } from 'react';
import { Trophy, Medal, Award, Shield, Plus, Edit3, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Achievement, Certificate } from '../types/ProfileTypes';
import '../styles/AchievementsCertificatesSection.css';

interface AchievementsCertificatesSectionProps {
  achievements: Achievement[];
  certificates: Certificate[];
  isOwner?: boolean;
  onAddAchievement?: () => void;
  onEditAchievement?: (achievement: Achievement) => void;
  onDeleteAchievement?: (achievementId: string) => void;
  onAddCertificate?: () => void;
  onEditCertificate?: (certificate: Certificate) => void;
  onDeleteCertificate?: (certificateId: string) => void;
  onEditSection?: () => void;
  onOpenEditModal?: (initialTab: string) => void;
}

const AchievementsCertificatesSection: React.FC<AchievementsCertificatesSectionProps> = ({
  achievements,
  certificates,
  isOwner = false,
  onAddAchievement,
  onEditAchievement,
  onDeleteAchievement,
  onAddCertificate,
  onEditCertificate,
  onDeleteCertificate,
  onEditSection,
  onOpenEditModal
}) => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'certificates'>('achievements');

  // Sort achievements by date (most recent first)
  const sortedAchievements = [...achievements].sort((a, b) =>
    new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime()
  );

  // Sort certificates by date issued (most recent first)
  const sortedCertificates = [...certificates].sort((a, b) =>
    new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime()
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

  const getCertificateIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('safety') || lowerName.includes('first aid') || lowerName.includes('cpr')) {
      return <Shield size={24} aria-hidden="true" />;
    }
    return <Award size={24} aria-hidden="true" />;
  };

  const getAchievementVerificationBadge = (status?: string) => {
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

  const getCertificateVerificationBadge = (verificationUrl?: string) => {
    if (!verificationUrl) return null;

    return (
      <a
        href={verificationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="verification-link"
        aria-label="View certificate verification"
      >
        <ExternalLink size={14} aria-hidden="true" />
        <span>Verify</span>
      </a>
    );
  };

  const getExpirationStatus = (expirationDate?: Date) => {
    if (!expirationDate) return null;

    const now = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Expired', className: 'expired' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', message: `Expires in ${daysUntilExpiry} days`, className: 'expiring' };
    } else {
      return { status: 'valid', message: `Expires ${formatDate(expirationDate)}`, className: 'valid' };
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const handleAchievementEdit = (achievement: Achievement, event: React.MouseEvent) => {
    event.stopPropagation();
    onEditAchievement?.(achievement);
  };

  const handleAchievementDelete = (achievementId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteAchievement?.(achievementId);
  };

  const handleCertificateEdit = (certificate: Certificate, event: React.MouseEvent) => {
    event.stopPropagation();
    onEditCertificate?.(certificate);
  };

  const handleCertificateDelete = (certificateId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteCertificate?.(certificateId);
  };

  return (
    <section className="profile-section achievements-certificates-section" aria-labelledby="achievements-certificates-heading">
      <div className="section-header">
        <h2 id="achievements-certificates-heading" className="section-title">
          Achievements & Certificates
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation" role="tablist" aria-label="Achievements and Certificates tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'achievements'}
          aria-controls="achievements-panel"
          id="achievements-tab"
          className={`tab-button ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
          type="button"
        >
          <Trophy size={18} aria-hidden="true" />
          <span>Achievements</span>
          {achievements.length > 0 && (
            <span className="tab-count" aria-label={`${achievements.length} achievements`}>
              {achievements.length}
            </span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'certificates'}
          aria-controls="certificates-panel"
          id="certificates-tab"
          className={`tab-button ${activeTab === 'certificates' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificates')}
          type="button"
        >
          <Award size={18} aria-hidden="true" />
          <span>Certificates</span>
          {certificates.length > 0 && (
            <span className="tab-count" aria-label={`${certificates.length} certificates`}>
              {certificates.length}
            </span>
          )}
        </button>
      </div>

      {/* Achievements Tab Panel */}
      {activeTab === 'achievements' && (
        <div
          role="tabpanel"
          id="achievements-panel"
          aria-labelledby="achievements-tab"
          className="tab-panel"
        >
          <div className="tab-panel-header">
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
            </div>
          ) : (
            <div className="items-grid" role="list" aria-label="List of achievements">
              {sortedAchievements.map((achievement) => (
                <article
                  key={achievement.id}
                  className="item-card achievement-card"
                  role="listitem"
                  aria-labelledby={`achievement-title-${achievement.id}`}
                >
                  <div className="item-header">
                    <div className="item-icon-container">
                      <div className="item-icon">
                        {achievement.imageUrl ? (
                          <img
                            src={achievement.imageUrl}
                            alt={`${achievement.title} achievement badge`}
                            className="item-image"
                            loading="lazy"
                          />
                        ) : (
                          getAchievementIcon(achievement.category)
                        )}
                      </div>
                      {getAchievementVerificationBadge(achievement.verificationStatus)}
                    </div>

                    {isOwner && (
                      <div className="item-actions">
                        <button
                          className="action-button edit-button"
                          onClick={(e) => handleAchievementEdit(achievement, e)}
                          aria-label={`Edit ${achievement.title} achievement`}
                          type="button"
                        >
                          <Edit3 size={14} aria-hidden="true" />
                        </button>
                        <button
                          className="action-button delete-button"
                          onClick={(e) => handleAchievementDelete(achievement.id, e)}
                          aria-label={`Delete ${achievement.title} achievement`}
                          type="button"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="item-content">
                    <h3
                      id={`achievement-title-${achievement.id}`}
                      className="item-title"
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
                      <p className="item-description">
                        {achievement.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificates Tab Panel */}
      {activeTab === 'certificates' && (
        <div
          role="tabpanel"
          id="certificates-panel"
          aria-labelledby="certificates-tab"
          className="tab-panel"
        >
          <div className="tab-panel-header">
            {isOwner && (
              <div className="section-actions">
                {(onEditSection || onOpenEditModal) && (
                  <button
                    className="section-action-button edit-section-button"
                    onClick={() => onOpenEditModal ? onOpenEditModal('certificates') : onEditSection?.()}
                    aria-label="Edit certificates section"
                    type="button"
                  >
                    <Edit3 size={16} aria-hidden="true" />
                    <span>Edit Section</span>
                  </button>
                )}
                <button
                  className="section-action-button add-certificate-button"
                  onClick={onAddCertificate}
                  aria-label="Add new certificate"
                  type="button"
                >
                  <Plus size={16} aria-hidden="true" />
                  <span>Add Certificate</span>
                </button>
              </div>
            )}
          </div>

          {sortedCertificates.length === 0 ? (
            <div className="empty-state" role="region" aria-label="No certificates">
              <div className="empty-state-icon" aria-hidden="true">
                <Award size={48} />
              </div>
              <h3 className="empty-state-title">No certificates yet</h3>
              <p className="empty-state-description">
                {isOwner
                  ? "Start adding your certificates to showcase your qualifications!"
                  : "This user hasn't added any certificates yet."
                }
              </p>
            </div>
          ) : (
            <div className="items-grid" role="list" aria-label="List of certificates">
              {sortedCertificates.map((certificate) => {
                const expirationStatus = getExpirationStatus(certificate.expirationDate);

                return (
                  <article
                    key={certificate.id}
                    className="item-card certificate-card"
                    role="listitem"
                    aria-labelledby={`certificate-title-${certificate.id}`}
                  >
                    <div className="item-header">
                      <div className="item-icon-container">
                        <div className="item-icon">
                          {certificate.certificateImageUrl ? (
                            <img
                              src={certificate.certificateImageUrl}
                              alt={`${certificate.name} certificate`}
                              className="item-image"
                              loading="lazy"
                            />
                          ) : (
                            getCertificateIcon(certificate.name)
                          )}
                        </div>
                        {getCertificateVerificationBadge(certificate.verificationUrl)}
                      </div>

                      {isOwner && (
                        <div className="item-actions">
                          <button
                            className="action-button edit-button"
                            onClick={(e) => handleCertificateEdit(certificate, e)}
                            aria-label={`Edit ${certificate.name} certificate`}
                            type="button"
                          >
                            <Edit3 size={14} aria-hidden="true" />
                          </button>
                          <button
                            className="action-button delete-button"
                            onClick={(e) => handleCertificateDelete(certificate.id, e)}
                            aria-label={`Delete ${certificate.name} certificate`}
                            type="button"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="item-content">
                      <h3
                        id={`certificate-title-${certificate.id}`}
                        className="item-title"
                      >
                        {certificate.name}
                      </h3>

                      <div className="certificate-organization">
                        <span className="organization-label">Issued by:</span>
                        <span className="organization-name">{certificate.issuingOrganization}</span>
                      </div>

                      <div className="certificate-dates">
                        <div className="date-item">
                          <span className="date-label">Issued:</span>
                          <span className="date-value" aria-label={`Date issued: ${formatDate(certificate.dateIssued)}`}>
                            {formatDate(certificate.dateIssued)}
                          </span>
                        </div>

                        {certificate.expirationDate && expirationStatus && (
                          <div className={`date-item expiration-item ${expirationStatus.className}`}>
                            <span className="date-label">
                              {expirationStatus.status === 'expired' && (
                                <AlertTriangle size={14} aria-hidden="true" className="expiration-icon" />
                              )}
                              Status:
                            </span>
                            <span
                              className="date-value expiration-status"
                              aria-label={`Expiration status: ${expirationStatus.message}`}
                            >
                              {expirationStatus.message}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AchievementsCertificatesSection;
