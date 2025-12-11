import React, { useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { TalentVideo } from '../types/TalentVideoTypes';
import '../styles/VideoPlayerModal.css';

interface VideoPlayerModalProps {
  video: TalentVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  isOpen,
  onClose
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (!isOpen || !video) return null;

  return (
    <div 
      className="video-player-overlay"
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div className="video-player-modal">
        <div className="modal-header">
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="Close video player"
          >
            <X size={24} />
          </button>
        </div>

        <div className="video-container">
          <video
            ref={videoRef}
            src={video.videoUrl}
            controls
            autoPlay
            className="video-player"
            poster={video.thumbnailUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="video-details">
          <h2 className="video-title">{video.title}</h2>
          
          <div className="video-meta">
            <span className="video-sport">{video.sport}</span>
            <span className="video-separator">•</span>
            <span className="video-category">{video.skillCategory}</span>
            <span className="video-separator">•</span>
            <span className="video-views">{formatViewCount(video.viewCount)}</span>
            <span className="video-separator">•</span>
            <span className="video-date">{formatDate(video.uploadDate)}</span>
          </div>

          <div className="video-description">
            <p>{video.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;