import React, { useState } from 'react';
import { X, Save, Award, Plus, Edit3, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Certificate } from '../types/ProfileTypes';
import CertificateModal from './CertificateModal';
import '../styles/SectionModal.css';

export interface CertificatesSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (certificates: Certificate[]) => void;
  certificates: Certificate[];
}

const CertificatesSectionModal: React.FC<CertificatesSectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  certificates
}) => {
  const [localCertificates, setLocalCertificates] = useState<Certificate[]>(certificates);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);

  // Update local state when props change
  React.useEffect(() => {
    setLocalCertificates(certificates);
    setHasUnsavedChanges(false);
  }, [certificates, isOpen]);

  const handleAddCertificate = () => {
    setEditingCertificate(null);
    setIsCertificateModalOpen(true);
  };

  const handleEditCertificate = (certificate: Certificate) => {
    setEditingCertificate(certificate);
    setIsCertificateModalOpen(true);
  };

  const handleDeleteCertificate = (certificateId: string) => {
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      const updatedCertificates = localCertificates.filter(c => c.id !== certificateId);
      setLocalCertificates(updatedCertificates);
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveCertificate = (certificateData: Omit<Certificate, 'id'>) => {
    if (editingCertificate) {
      // Update existing certificate
      const updatedCertificate: Certificate = {
        ...certificateData,
        id: editingCertificate.id
      };
      
      const updatedCertificates = localCertificates.map(c =>
        c.id === editingCertificate.id ? updatedCertificate : c
      );
      setLocalCertificates(updatedCertificates);
    } else {
      // Add new certificate
      const newCertificate: Certificate = {
        ...certificateData,
        id: `certificate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      setLocalCertificates([...localCertificates, newCertificate]);
    }
    
    setHasUnsavedChanges(true);
    setIsCertificateModalOpen(false);
    setEditingCertificate(null);
  };

  const handleSave = () => {
    onSave(localCertificates);
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

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="section-modal certificates-section-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-header-left">
              <Award size={20} />
              <h2 className="modal-title">Manage Certificates</h2>
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
                <h3 className="section-subtitle">Your Certificates</h3>
                <p className="section-description">
                  Add and manage your professional certificates and qualifications
                </p>
              </div>
              <button
                className="add-item-button"
                onClick={handleAddCertificate}
                type="button"
              >
                <Plus size={16} />
                Add Certificate
              </button>
            </div>

            {localCertificates.length === 0 ? (
              <div className="empty-state">
                <Award size={48} className="empty-icon" />
                <h4 className="empty-title">No certificates yet</h4>
                <p className="empty-description">
                  Start adding your certificates to showcase your qualifications!
                </p>
                <button
                  className="empty-action-button"
                  onClick={handleAddCertificate}
                  type="button"
                >
                  <Plus size={20} />
                  Add Your First Certificate
                </button>
              </div>
            ) : (
              <div className="items-list">
                {localCertificates
                  .sort((a, b) => new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime())
                  .map((certificate) => {
                    const expirationStatus = getExpirationStatus(certificate.expirationDate);

                    return (
                      <div key={certificate.id} className="item-card">
                        <div className="item-header">
                          <div className="item-icon-container">
                            {certificate.certificateImageUrl ? (
                              <img
                                src={certificate.certificateImageUrl}
                                alt={`${certificate.name} certificate`}
                                className="item-image"
                              />
                            ) : (
                              <div className="item-icon">
                                <Award size={24} />
                              </div>
                            )}
                            {certificate.verificationUrl && (
                              <a
                                href={certificate.verificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="verification-link"
                                aria-label="View certificate verification"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>

                          <div className="item-actions">
                            <button
                              className="action-button edit-button"
                              onClick={() => handleEditCertificate(certificate)}
                              aria-label={`Edit ${certificate.name}`}
                              type="button"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="action-button delete-button"
                              onClick={() => handleDeleteCertificate(certificate.id)}
                              aria-label={`Delete ${certificate.name}`}
                              type="button"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="item-content">
                          <h4 className="item-title">{certificate.name}</h4>
                          <div className="item-organization">
                            <span className="organization-label">Issued by:</span>
                            <span className="organization-name">{certificate.issuingOrganization}</span>
                          </div>
                          
                          <div className="certificate-dates">
                            <div className="date-item">
                              <span className="date-label">Issued:</span>
                              <span className="date-value">{formatDate(certificate.dateIssued)}</span>
                            </div>

                            {certificate.expirationDate && expirationStatus && (
                              <div className={`date-item expiration-item ${expirationStatus.className}`}>
                                <span className="date-label">
                                  {expirationStatus.status === 'expired' && (
                                    <AlertTriangle size={14} className="expiration-icon" />
                                  )}
                                  Status:
                                </span>
                                <span className="date-value expiration-status">
                                  {expirationStatus.message}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={isCertificateModalOpen}
        certificate={editingCertificate}
        onClose={() => {
          setIsCertificateModalOpen(false);
          setEditingCertificate(null);
        }}
        onSave={handleSaveCertificate}
      />
    </>
  );
};

export default CertificatesSectionModal;