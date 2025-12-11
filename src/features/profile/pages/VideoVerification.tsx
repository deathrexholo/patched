import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, AlertCircle, Video, Users } from 'lucide-react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { TalentVideo, VideoVerification } from '../types/TalentVideoTypes';
import '../styles/VideoVerification.css';

interface VerificationFormData {
  verifierName: string;
  verifierEmail: string;
  verifierRelationship: 'coach' | 'teammate' | 'parent' | 'friend' | 'witness' | 'other';
  verificationMessage: string;
}

// Helper function to remove undefined values from objects
const cleanObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  if (typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = cleanObject(value);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

const VideoVerificationPage: React.FC = () => {
  const { userId, videoId } = useParams<{ userId: string; videoId: string }>();
  const [searchParams] = useSearchParams();
  const [video, setVideo] = useState<TalentVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [userAgent, setUserAgent] = useState<string>('');

  const [formData, setFormData] = useState<VerificationFormData>({
    verifierName: '',
    verifierEmail: '',
    verifierRelationship: 'witness',
    verificationMessage: ''
  });

  // Generate device fingerprint and get IP address on mount
  useEffect(() => {
    const initializeAntiCheat = async () => {
      try {
        // Get device fingerprint
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);
      } catch (err) {
        console.error('Error generating fingerprint:', err);
        // Fallback to a random ID if fingerprinting fails
        setDeviceFingerprint(`fallback-${Date.now()}-${Math.random()}`);
      }

      try {
        // Get IP address from multiple services (fallback chain)
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        setIpAddress(ipData.ip || 'unknown');
      } catch (err) {
        console.error('Error fetching IP:', err);
        try {
          // Fallback to alternative service
          const ipResponse = await fetch('https://api64.ipify.org?format=json');
          const ipData = await ipResponse.json();
          setIpAddress(ipData.ip || 'unknown');
        } catch (err2) {
          console.error('Error fetching IP from fallback:', err2);
          setIpAddress('unknown');
        }
      }

      // Get user agent
      setUserAgent(navigator.userAgent);
    };

    initializeAntiCheat();
  }, []);

  // Load video data
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        setIsLoading(true);

        if (!userId || !videoId) {
          setError('Invalid verification link');
          setIsLoading(false);
          return;
        }

        // Fetch talent video from talentVideos collection (NOT from user document)
        const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../../../lib/firebase');

        // Query talentVideos collection for the specific video
        const talentVideosRef = collection(db, 'talentVideos');
        const q = query(
          talentVideosRef,
          where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('User not found');
          setIsLoading(false);
          return;
        }

        // Find the specific video by ID
        let targetVideoData: TalentVideo | null = null;
        querySnapshot.forEach((doc) => {
          if (doc.id === videoId) {
            const data = doc.data();
            targetVideoData = {
              ...data,
              id: doc.id,
              uploadDate: data.uploadDate?.toDate ? data.uploadDate.toDate() : data.uploadDate,
              verificationDeadline: data.verificationDeadline?.toDate ? data.verificationDeadline.toDate() : undefined
            } as TalentVideo;
          }
        });

        if (!targetVideoData) {
          setError('Video not found');
          setIsLoading(false);
          return;
        }

        setVideo(targetVideoData);

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Failed to load video');
        setIsLoading(false);
      }
    };

    loadVideoData();
  }, [userId, videoId]);

  // Check for duplicate device/IP after video, fingerprint, and IP are loaded
  useEffect(() => {
    if (video && deviceFingerprint && ipAddress) {
      const existingVerifications = video.verifications || [];

      // Check for duplicate device fingerprint
      const isDuplicateDevice = existingVerifications.some(
        (v: VideoVerification) => v.deviceFingerprint === deviceFingerprint
      );

      // Check for duplicate IP address
      const isDuplicateIP = existingVerifications.some(
        (v: VideoVerification) => v.ipAddress === ipAddress
      );

      // Block if EITHER device fingerprint OR IP address matches
      if (isDuplicateDevice || isDuplicateIP) {
        setAlreadyVerified(true);
      }
    }
  }, [video, deviceFingerprint, ipAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!video || !userId) return;

    // Validation
    if (!formData.verifierName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!formData.verifierEmail.trim() || !formData.verifierEmail.includes('@')) {
      alert('Please enter a valid email');
      return;
    }

    if (!deviceFingerprint || !ipAddress) {
      alert('Device and network verification is in progress. Please wait a moment and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Multi-layer ANTI-CHEAT: Check device fingerprint AND IP address
      const existingVerifications = video.verifications || [];

      // Check for duplicate device fingerprint
      const isDuplicateDevice = existingVerifications.some(
        (v: VideoVerification) => v.deviceFingerprint === deviceFingerprint
      );

      // Check for duplicate IP address
      const isDuplicateIP = existingVerifications.some(
        (v: VideoVerification) => v.ipAddress === ipAddress
      );

      // Find which verification matched for better error message
      const matchedVerification = existingVerifications.find(
        (v: VideoVerification) => v.deviceFingerprint === deviceFingerprint || v.ipAddress === ipAddress
      );

      // Block if EITHER condition is true
      if (isDuplicateDevice || isDuplicateIP) {
        const reason = isDuplicateDevice && isDuplicateIP
          ? 'same device and network'
          : isDuplicateDevice
          ? 'same device'
          : 'same network/IP address';

        alert(`This video has already been verified from the ${reason}. Each device and network can only verify once to prevent fraud.\n\nPrevious verification by: ${matchedVerification?.verifierName || 'Unknown'}`);
        setIsSubmitting(false);
        setAlreadyVerified(true);
        return;
      }

      // Create verification object with multi-layer anti-cheat data
      const verificationBase = {
        verifierId: `anon-${Date.now()}`, // Anonymous ID
        verifierName: formData.verifierName.trim(),
        verifierEmail: formData.verifierEmail.trim(),
        verifierRelationship: formData.verifierRelationship,
        verifiedAt: new Date(),
        deviceFingerprint: deviceFingerprint, // Device fingerprint for anti-cheat
        ipAddress: ipAddress, // IP address for anti-cheat
        userAgent: userAgent // Browser/device info for tracking
      };

      // Only add optional fields if they have values
      const newVerification: VideoVerification = {
        ...verificationBase,
        ...(formData.verificationMessage.trim() && { verificationMessage: formData.verificationMessage.trim() })
      };

      // Update Firestore - Update the talentVideos collection directly (NOT user document)
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../../lib/firebase');

      const videoRef = doc(db, 'talentVideos', videoId);
      const videoDoc = await getDoc(videoRef);

      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const videoData = videoDoc.data();
      const currentVerifications = videoData.verifications || [];
      const updatedVerifications = [...currentVerifications, newVerification];
      const threshold = videoData.verificationThreshold || 3;

      // Auto-verify if threshold reached
      const newStatus = updatedVerifications.length >= threshold ? 'verified' : 'pending';

      // Update the video in talentVideos collection
      await updateDoc(videoRef, {
        verifications: updatedVerifications,
        verificationStatus: newStatus,
        updatedAt: new Date()
      });

      setVerificationSuccess(true);
    } catch (err) {
      console.error('Error submitting verification:', err);
      alert('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="loading-spinner"></div>
          <p>Loading verification...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="verification-error">
            <AlertCircle size={48} color="#dc3545" />
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (verificationSuccess) {
    const currentCount = (video?.verifications?.length || 0) + 1;
    const threshold = video?.verificationThreshold || 3;
    const isFullyVerified = currentCount >= threshold;

    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="verification-success">
            <div className="success-icon">
              <Check size={64} color="#28a745" />
            </div>
            <h2>✓ Verification Submitted!</h2>
            <p className="success-message">
              Thank you for verifying this talent video!
            </p>

            <div className="verification-progress">
              <div className="progress-label">
                Verification Progress: {currentCount} / {threshold}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(currentCount / threshold) * 100}%` }}
                ></div>
              </div>
              {isFullyVerified && (
                <div className="fully-verified-badge">
                  <Check size={16} />
                  Video is now VERIFIED!
                </div>
              )}
            </div>

            <div className="success-details">
              <p><strong>Video:</strong> {video?.title}</p>
              <p><strong>Your Name:</strong> {formData.verifierName}</p>
              <p><strong>Relationship:</strong> {formData.verifierRelationship}</p>
            </div>

            <button
              className="btn-primary"
              onClick={() => window.close()}
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyVerified) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="verification-info">
            <Check size={48} color="#20B2AA" />
            <h2>Already Verified</h2>
            <p>You have already verified this video. Thank you!</p>
            <button
              className="btn-secondary"
              onClick={() => window.close()}
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentVerifications = video?.verifications?.length || 0;
  const threshold = video?.verificationThreshold || 3;
  const isAlreadyFullyVerified = video?.verificationStatus === 'verified';

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="verification-header">
          <div className="header-icon">
            <Video size={32} />
          </div>
          <h1>Verify Talent Video</h1>
          <p className="header-subtitle">
            Help verify this athlete's performance is authentic
          </p>
        </div>

        {/* Video Preview */}
        <div className="video-preview-section">
          <h3>{video?.title}</h3>
          <div className="video-player-wrapper">
            <video
              controls
              className="verification-video-player"
              poster={video?.thumbnailUrl}
            >
              <source src={video?.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="video-meta">
            <span className="video-sport">{video?.sport}</span>
            <span className="video-category">{video?.skillCategory}</span>
            <span className="video-duration">{Math.floor((video?.duration || 0) / 60)}:{String((video?.duration || 0) % 60).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Verification Progress */}
        <div className="verification-status-section">
          <div className="status-header">
            <Users size={20} />
            <span>Community Verification Progress</span>
          </div>
          <div className="verification-progress">
            <div className="progress-label">
              {currentVerifications} / {threshold} verifications
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(currentVerifications / threshold) * 100}%` }}
              ></div>
            </div>
          </div>
          {isAlreadyFullyVerified && (
            <div className="fully-verified-badge">
              <Check size={16} />
              Already Verified!
            </div>
          )}
        </div>

        {/* Verification Form */}
        {!isAlreadyFullyVerified && (
          <form onSubmit={handleSubmitVerification} className="verification-form">
            <h3>Verify This Performance</h3>
            <p className="form-description">
              Please confirm that you witnessed this athlete perform in this video, or that you can verify its authenticity.
            </p>

            <div className="form-group">
              <label htmlFor="verifierName">Your Name *</label>
              <input
                type="text"
                id="verifierName"
                name="verifierName"
                value={formData.verifierName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="verifierEmail">Your Email *</label>
              <input
                type="email"
                id="verifierEmail"
                name="verifierEmail"
                value={formData.verifierEmail}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                required
              />
              <small>Your email will not be shared publicly</small>
            </div>

            <div className="form-group">
              <label htmlFor="verifierRelationship">Your Relationship *</label>
              <select
                id="verifierRelationship"
                name="verifierRelationship"
                value={formData.verifierRelationship}
                onChange={handleInputChange}
                required
              >
                <option value="coach">Coach</option>
                <option value="teammate">Teammate</option>
                <option value="parent">Parent/Guardian</option>
                <option value="friend">Friend</option>
                <option value="witness">I witnessed this performance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="verificationMessage">Additional Comments (Optional)</label>
              <textarea
                id="verificationMessage"
                name="verificationMessage"
                value={formData.verificationMessage}
                onChange={handleInputChange}
                placeholder="Add any additional context about this verification..."
                rows={3}
              />
            </div>

            <div className="form-disclaimer">
              <AlertCircle size={16} />
              <p>
                By submitting this verification, you confirm that this video authentically represents the athlete's performance and is not AI-generated or manipulated.
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Verification'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VideoVerificationPage;
