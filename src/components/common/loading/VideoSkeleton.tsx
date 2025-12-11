import React from 'react';
import './VideoSkeleton.css';

interface VideoSkeletonProps {
  count?: number;
  showMetadata?: boolean;
  showEngagement?: boolean;
  className?: string;
}

/**
 * Video Skeleton Loading Component
 * 
 * Displays a skeleton placeholder while video content is loading.
 * Provides visual feedback to users during loading states.
 */
const VideoSkeleton: React.FC<VideoSkeletonProps> = ({
  count = 1,
  showMetadata = true,
  showEngagement = true,
  className = ''
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div key={index} className={`video-skeleton ${className}`}>
      {/* Video Player Skeleton */}
      <div className="video-skeleton-player">
        <div className="skeleton-shimmer" />
        
        {/* Play Button Skeleton */}
        <div className="video-skeleton-play-button">
          <div className="skeleton-shimmer" />
        </div>

        {/* Mute Button Skeleton */}
        <div className="video-skeleton-mute-button">
          <div className="skeleton-shimmer" />
        </div>
      </div>

      {/* Metadata Skeleton */}
      {showMetadata && (
        <div className="video-skeleton-metadata">
          <div className="creator-skeleton">
            <div className="creator-avatar-skeleton">
              <div className="skeleton-shimmer" />
            </div>
            <div className="creator-name-skeleton">
              <div className="skeleton-shimmer" />
            </div>
          </div>
          
          <div className="description-skeleton">
            <div className="skeleton-shimmer" />
          </div>
          <div className="description-skeleton short">
            <div className="skeleton-shimmer" />
          </div>

          <div className="stats-skeleton">
            <div className="stat-item-skeleton">
              <div className="skeleton-shimmer" />
            </div>
            <div className="stat-item-skeleton">
              <div className="skeleton-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Engagement Actions Skeleton */}
      {showEngagement && (
        <div className="video-skeleton-engagement">
          <div className="engagement-button-skeleton">
            <div className="skeleton-shimmer" />
          </div>
          <div className="engagement-button-skeleton">
            <div className="skeleton-shimmer" />
          </div>
          <div className="engagement-button-skeleton">
            <div className="skeleton-shimmer" />
          </div>
        </div>
      )}
    </div>
  ));

  return <>{skeletons}</>;
};

export default VideoSkeleton;