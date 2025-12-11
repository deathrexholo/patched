import React from 'react';
import { Award, Shield, ExternalLink, Plus, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { Certificate } from '../types/ProfileTypes';
import '../styles/CertificatesSection.css';

interface CertificatesSectionProps {
  certificates: Certificate[];
  isOwner?: boolean;
  onAddCertificate?: () => void;
  onEditCertificate?: (certificate: Certificate) => void;
  onDeleteCertificate?: (certificateId: string) => void;
  onEditSection?: () => void;
  onOpenEditModal?: (initialTab: string) => void;
}

const CertificatesSection: React.FC<CertificatesSectionProps> = ({
  certificates,
  isOwner = false,
  onAddCertificate,
  onEditCertificate,
  onDeleteCertificate,
  onEditSection,
  onOpenEditModal
}) => {
  // Sort certificates by date issued (most recent first)
  const sortedCertificates = [...certificates].sort((a, b) => 
    new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime()
  );

  const getCertificateIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('safety') || lowerName.includes('first aid') || lowerName.includes('cpr')) {
      return <Shield size={24} aria-hidden="true" />;
    }
    return <Award size={24} aria-hidden="true" />;
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

  const getVerificationBadge = (verificationUrl?: string) => {
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const handleEditClick = (certificate: Certificate, event: React.MouseEvent) => {
    event.stopPropagation();
    onEditCertificate?.(certificate);
  };

  const handleDeleteClick = (certificateId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteCertificate?.(certificateId);
  };

  return (
    <section className="profile-section certificates-section" aria-labelledby="certificates-heading">
      <div className="section-header">
        <h2 id="certificates-heading" className="section-title">
          Certificates
        </h2>
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
          {isOwner && (
            <button
              className="empty-state-action"
              onClick={onAddCertificate}
              type="button"
              aria-label="Add your first certificate"
            >
              <Plus size={20} aria-hidden="true" />
              Add Your First Certificate
            </button>
          )}
        </div>
      ) : (
        <div className="certificates-grid" role="list" aria-label="List of certificates">
          {sortedCertificates.map((certificate) => {
            const expirationStatus = getExpirationStatus(certificate.expirationDate);
            
            return (
              <article 
                key={certificate.id} 
                className="certificate-card"
                role="listitem"
                aria-labelledby={`certificate-title-${certificate.id}`}
              >
                <div className="certificate-header">
                  <div className="certificate-icon-container">
                    <div className="certificate-icon">
                      {certificate.certificateImageUrl ? (
                        <img 
                          src={certificate.certificateImageUrl} 
                          alt={`${certificate.name} certificate`}
                          className="certificate-image"
                          loading="lazy"
                        />
                      ) : (
                        getCertificateIcon(certificate.name)
                      )}
                    </div>
                    {getVerificationBadge(certificate.verificationUrl)}
                  </div>
                  
                  {isOwner && (
                    <div className="certificate-actions">
                      <button
                        className="action-button edit-button"
                        onClick={(e) => handleEditClick(certificate, e)}
                        aria-label={`Edit ${certificate.name} certificate`}
                        type="button"
                      >
                        <Edit3 size={14} aria-hidden="true" />
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={(e) => handleDeleteClick(certificate.id, e)}
                        aria-label={`Delete ${certificate.name} certificate`}
                        type="button"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="certificate-content">
                  <h3 
                    id={`certificate-title-${certificate.id}`}
                    className="certificate-title"
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
    </section>
  );
};

export default CertificatesSection;