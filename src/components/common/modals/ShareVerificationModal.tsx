// Share Verification Modal - Allow users to re-share their verification link
import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, CheckCircle } from 'lucide-react';
import VerificationService from '../../../services/api/verificationService';
import './ShareVerificationModal.css';

interface VerificationRequest {
  verificationId: string;
  verificationCount: number;
  verificationGoal: number;
  userDisplayName?: string;
  userRole?: string;
}

interface ShareVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  verificationRequest: VerificationRequest | null;
}

const ShareVerificationModal: React.FC<ShareVerificationModalProps> = ({ isOpen, onClose, verificationRequest }) => {
  const [shareableLink, setShareableLink] = useState<string>('');

  useEffect(() => {
    if (isOpen && verificationRequest) {
      const link = VerificationService.generateShareableLink(verificationRequest.verificationId);
      setShareableLink(link);
    }
  }, [isOpen, verificationRequest]);

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      // Show temporary success feedback
      const button = document.querySelector('.copy-link-btn');
      if (button) {
        const originalText = button.innerHTML;
        const svgIcon = button.querySelector('svg');
        const iconHtml = svgIcon ? svgIcon.outerHTML : '';
        button.innerHTML = iconHtml + ' Copied!';
        setTimeout(() => {
          if (button && button.parentNode) {
            button.innerHTML = originalText;
          }
        }, 2000);
      }
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied to clipboard!');
    }
  };

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Verify ${verificationRequest?.userDisplayName || 'User'} on AmaPlayer`,
          text: `Help verify ${verificationRequest?.userDisplayName || 'this user'} as a ${verificationRequest?.userRole || 'athlete'} on AmaPlayer!`,
          url: shareableLink
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          handleCopyLink(); // Fallback to copy
        }
      }
    } else {
      handleCopyLink(); // Fallback for browsers without Web Share API
    }
  };

  if (!isOpen || !verificationRequest) return null;

  const progress = verificationRequest.verificationCount || 0;
  const goal = verificationRequest.verificationGoal || 4;
  const remaining = Math.max(0, goal - progress);

  return (
    <div className="modal-overlay share-verification-modal-overlay">
      <div className="modal-content share-verification-modal-content">
        <div className="modal-header">
          <h2>Share Your Verification</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body share-verification-modal-body">
          <div className="verification-status">
            <div className="status-header">
              <h3>Verification Progress</h3>
              <div className="progress-stats">
                <span className="current-count">{progress}</span>
                <span className="divider">/</span>
                <span className="goal-count">{goal}</span>
              </div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(100, (progress / goal) * 100)}%` }}
              ></div>
            </div>
            
            <div className="progress-text">
              {progress >= goal ? (
                <span className="completed">
                  <CheckCircle size={16} />
                  Verification Complete!
                </span>
              ) : (
                <span className="pending">
                  {remaining} more verification{remaining !== 1 ? 's' : ''} needed
                </span>
              )}
            </div>
          </div>

          <div className="share-section">
            <h4>Share Your Verification Link</h4>
            <p>Get more people to verify you by sharing this link on social media or with friends!</p>
            
            <div className="link-container">
              <input 
                type="text" 
                value={shareableLink} 
                readOnly 
                className="link-input"
              />
              <button 
                className="copy-link-btn" 
                onClick={handleCopyLink}
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
            
            <div className="share-buttons">
              <button className="btn-share primary" onClick={handleShare}>
                <Share2 size={16} />
                Share Link
              </button>
            </div>
          </div>

          <div className="tips-section">
            <h4>Tips for Getting Verified</h4>
            <ul>
              <li>Share on your social media accounts (Instagram, Twitter, Facebook)</li>
              <li>Ask teammates, coaches, or fellow athletes to verify you</li>
              <li>Share in sports communities and groups you're part of</li>
              <li>The more people who see your link, the faster you'll get verified!</li>
            </ul>
          </div>

          <div className="modal-actions">
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareVerificationModal;
