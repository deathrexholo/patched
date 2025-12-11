// Verification Request Modal - Allow users to create verification requests
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import VerificationService from '../../../services/api/verificationService';
import { X, Share2, Copy, CheckCircle, Video, User } from 'lucide-react';
import SafeImage from '../SafeImage';
import './VerificationRequestModal.css';

interface UserProfile {
  displayName?: string;
  photoURL?: string;
  role?: string;
  bio?: string;
}

interface TalentVideo {
  id: string;
  videoUrl: string;
  fileName: string;
  userId: string;
  verificationStatus: string;
  uploadedAt?: Timestamp;
  metadata?: {
    thumbnail?: string;
  };
}

interface VerificationRequest {
  verificationId: string;
  userDisplayName?: string;
  userRole?: string;
}

interface VerificationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

const VerificationRequestModal: React.FC<VerificationRequestModalProps> = ({ isOpen, onClose, userProfile }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<number>(1); // 1: Review, 2: Creating, 3: Success
  const [userVideos, setUserVideos] = useState<TalentVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [error, setError] = useState<string>('');
  const [shareableLink, setShareableLink] = useState<string>('');

  const fetchUserVideos = async (): Promise<void> => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'talentVideos'),
        where('userId', '==', currentUser.uid),
        where('verificationStatus', '==', 'approved')
      );
      
      const snapshot = await getDocs(q);
      const videos: TalentVideo[] = [];
      snapshot.forEach((doc) => {
        videos.push({ id: doc.id, ...doc.data() } as TalentVideo);
      });
      
      // Sort by upload date (newest first)
      videos.sort((a, b) => {
        const aTime = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
        const bTime = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      
      setUserVideos(videos);
    } catch (error) {
      console.error('Error fetching user videos:', error);
      setUserVideos([]);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchUserVideos();
      setStep(1);
      setError('');
    }
  }, [isOpen, currentUser]);

  const handleCreateVerificationRequest = async (): Promise<void> => {
    if (!currentUser) return;
    
    setLoading(true);
    setError('');
    
    try {
      setStep(2); // Show creating state
      
      // Create verification request
      const request = await VerificationService.createVerificationRequest(
        currentUser.uid,
        userProfile,
        userVideos
      );
      
      setVerificationRequest(request);
      // Generate the link with current domain
      const currentDomainLink = VerificationService.generateShareableLink(request.verificationId);
      setShareableLink(currentDomainLink);
      setStep(3); // Show success state
      
    } catch (error: any) {
      console.error('Error creating verification request:', error);
      setError(error.message || 'Failed to create verification request');
      setStep(1); // Go back to review
    }
    
    setLoading(false);
  };

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
          title: `Verify ${userProfile.displayName || 'User'} on AmaPlayer`,
          text: `Help verify ${userProfile.displayName || 'this user'} as a ${userProfile.role || 'athlete'} on AmaPlayer!`,
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay verification-modal-overlay">
      <div className="modal-content verification-modal-content">
        <div className="modal-header">
          <h2>
            {step === 1 && 'Request Verification'}
            {step === 2 && 'Creating Request...'}
            {step === 3 && 'Verification Request Created!'}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body verification-modal-body">
          {/* Step 1: Review Information */}
          {step === 1 && (
            <div className="verification-review">
              <div className="review-section">
                <h3><User size={20} /> Your Profile</h3>
                <div className="profile-preview">
                  <SafeImage 
                    src={userProfile.photoURL || ''} 
                    alt="Profile" 
                    placeholder="avatar"
                    className="profile-image-preview"
                  />
                  <div className="profile-info-preview">
                    <h4>{userProfile.displayName || 'Anonymous User'}</h4>
                    <p className="role-badge">{userProfile.role || 'athlete'}</p>
                    <p>{userProfile.bio || 'No bio available'}</p>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <h3><Video size={20} /> Your Videos ({userVideos.length})</h3>
                {userVideos.length > 0 ? (
                  <div className="videos-preview">
                    {userVideos.slice(0, 3).map((video) => (
                      <div key={video.id} className="video-preview-item">
                        <video 
                          src={video.videoUrl} 
                          poster={video.metadata?.thumbnail}
                          className="video-thumbnail-small"
                          muted
                          preload="metadata"
                        />
                        <span className="video-name">{video.fileName}</span>
                      </div>
                    ))}
                    {userVideos.length > 3 && (
                      <div className="more-videos">
                        +{userVideos.length - 3} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-videos-warning">
                    <Video size={48} />
                    <p>You need at least one approved talent video to request verification.</p>
                    <small>Upload videos in your profile's Talent Showcase section.</small>
                  </div>
                )}
              </div>

              <div className="verification-info">
                <h3>How Verification Works</h3>
                <ul>
                  <li>✅ You need <strong>4 verifications</strong> from other users</li>
                  <li>🔗 Share your verification link with friends, teammates, or social media</li>
                  <li>👥 Anyone can verify you (no account needed)</li>
                  <li>🛡️ Anti-spam protection prevents fake verifications</li>
                  <li>⏰ Verification requests expire after 7 days</li>
                </ul>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button 
                  className="btn-secondary" 
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleCreateVerificationRequest}
                  disabled={loading || userVideos.length === 0}
                >
                  {loading ? 'Creating...' : 'Create Verification Request'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Creating Request */}
          {step === 2 && (
            <div className="verification-creating">
              <div className="loading-animation">
                <div className="spinner"></div>
                <h3>Creating your verification request...</h3>
                <p>Setting up your verification page and shareable link</p>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && verificationRequest && (
            <div className="verification-success">
              <div className="success-header">
                <CheckCircle size={48} color="#4CAF50" />
                <h3>Verification Request Created!</h3>
                <p>Share your link to get verified by the community</p>
              </div>

              <div className="verification-stats">
                <div className="stat-item">
                  <span className="stat-number">0</span>
                  <span className="stat-label">Verifications</span>
                </div>
                <div className="stat-divider">/</div>
                <div className="stat-item">
                  <span className="stat-number">4</span>
                  <span className="stat-label">Needed</span>
                </div>
              </div>

              <div className="share-section">
                <h4>Share Your Verification Link</h4>
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

              <div className="next-steps">
                <h4>What's Next?</h4>
                <ul>
                  <li>Share your link with friends, teammates, and followers</li>
                  <li>Post on social media to reach more people</li>
                  <li>You'll see progress in your profile badge</li>
                  <li>Once you get 4 verifications, you'll receive your verification badge!</li>
                </ul>
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationRequestModal;
