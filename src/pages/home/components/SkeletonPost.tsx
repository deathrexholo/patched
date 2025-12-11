import React from 'react';

/**
 * SkeletonPost Component
 * 
 * Displays a skeleton loading placeholder for posts while they're loading.
 * Provides better perceived performance by showing content structure immediately.
 */
const SkeletonPost: React.FC = () => {
  return (
    <div className="post-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-text-lines">
          <div className="skeleton-line short"></div>
          <div className="skeleton-line shorter"></div>
        </div>
      </div>
      <div className="skeleton-content"></div>
      <div className="skeleton-actions">
        <div className="skeleton-button"></div>
        <div className="skeleton-button"></div>
        <div className="skeleton-button"></div>
      </div>
    </div>
  );
};

export default SkeletonPost;