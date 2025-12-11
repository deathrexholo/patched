import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { VideoModalProps } from '@/features/profile/types/TalentVideoTypes';
import '../styles/VideoPlayerModal.css';

const VideoPlayerModal: React.FC<VideoModalProps> = ({ video, isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (videoRef.current) {
      if (isOpen && video) {
        videoRef.current.load();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isOpen, video]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === modalRef.current) {
      onClose();
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  if (!isOpen || !video) {
    return null;
  }

  return (
    <div 
      className="video-modal-overlay"
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div className="video-modal-content">
        <div className="video-modal-header">
          <button
            className="video-modal-close"
            onClick={onClose}
            aria-label="Close video player"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="video-player-container">
          <video
            ref={videoRef}
            className="video-player"
            controls
            autoPlay
            preload="metadata"
          >
            <source src={video.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="video-modal-info">
          <h2 className="video-modal-title">{video.title}</h2>
          <div className="video-modal-meta">
            <span className="video-modal-sport">{video.sport}</span>
            <span className="video-modal-separator">•</span>
            <span className="video-modal-category">{video.skillCategory}</span>
            <span className="video-modal-separator">•</span>
            <span className="video-modal-views">{formatViewCount(video.viewCount)}</span>
            <span className="video-modal-separator">•</span>
            <span className="video-modal-date">{formatDate(video.uploadDate)}</span>
          </div>
          {video.description && (
            <p className="video-modal-description">{video.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;