import React, { useState, useMemo } from 'react';
import { Play, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { TalentVideo, TalentVideosSectionProps, VideoFormData } from '../types/TalentVideoTypes';
import VideoPlayerModal from './VideoPlayerModal';
import VideoManagementModal from './VideoManagementModal';
import VideoFilters from './VideoFilters';
import '../styles/TalentVideosSection.css';

const TalentVideosSection: React.FC<TalentVideosSectionProps> = ({
  videos,
  isOwner,
  onAddVideo,
  onEditVideo,
  onDeleteVideo,
  onVideoClick
}) => {
  const [selectedVideo, setSelectedVideo] = useState<TalentVideo | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TalentVideo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter states
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Filter and sort videos
  const { filteredVideos, availableSports, availableCategories } = useMemo(() => {
    let filtered = [...videos];

    // Apply filters
    if (selectedSport) {
      filtered = filtered.filter(video => video.sport === selectedSport);
    }

    if (selectedCategory) {
      filtered = filtered.filter(video => video.skillCategory === selectedCategory);
    }

    // Sort by upload date (newest first)
    filtered.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    // Get unique sports and categories for filter options
    const sports = [...new Set(videos.map(video => video.sport))].sort();
    const categories = [...new Set(videos.map(video => video.skillCategory))].sort();

    return {
      filteredVideos: filtered,
      availableSports: sports,
      availableCategories: categories
    };
  }, [videos, selectedSport, selectedCategory]);

  const handleVideoClick = (video: TalentVideo) => {
    setSelectedVideo(video);
    setIsPlayerOpen(true);
    onVideoClick?.(video);
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setSelectedVideo(null);
  };

  const handleAddVideo = () => {
    setEditingVideo(null);
    setIsManagementModalOpen(true);
    onAddVideo?.();
  };

  const handleEditVideoClick = (video: TalentVideo) => {
    setEditingVideo(video);
    setIsManagementModalOpen(true);
  };

  const handleSaveVideo = async (videoData: VideoFormData) => {
    setIsLoading(true);
    try {
      if (editingVideo) {
        // Update existing video
        onEditVideo?.(editingVideo);
      } else {
        // Add new video - this would typically involve uploading the file
        // and creating a new video record
      }
      setIsManagementModalOpen(false);
      setEditingVideo(null);
    } catch (error) {
      console.error('Error saving video:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseManagementModal = () => {
    setIsManagementModalOpen(false);
    setEditingVideo(null);
  };

  const handleClearFilters = () => {
    setSelectedSport('');
    setSelectedCategory('');
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  const toggleDropdown = (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveDropdown(activeDropdown === videoId ? null : videoId);
  };

  const handleEdit = (video: TalentVideo, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveDropdown(null);
    handleEditVideoClick(video);
  };

  const handleDelete = (videoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveDropdown(null);
    if (window.confirm('Are you sure you want to delete this video?')) {
      onDeleteVideo?.(videoId);
    }
  };

  return (
    <div className="talent-videos-section">
      <div className="section-header">
        <h3 className="section-title">Talent Videos</h3>
        {isOwner && (
          <button
            className="add-video-btn"
            onClick={handleAddVideo}
            aria-label="Add talent video"
          >
            <Plus size={16} />
            Add Video
          </button>
        )}
      </div>

      {videos.length > 0 && (
        <VideoFilters
          selectedSport={selectedSport}
          selectedCategory={selectedCategory}
          onSportChange={setSelectedSport}
          onCategoryChange={setSelectedCategory}
          onClearFilters={handleClearFilters}
          availableSports={availableSports}
          availableCategories={availableCategories}
          totalVideos={videos.length}
          filteredCount={filteredVideos.length}
        />
      )}

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Play size={48} />
          </div>
          <h4 className="empty-title">No talent videos yet</h4>
          <p className="empty-description">
            {isOwner
              ? "Showcase your skills by uploading talent videos"
              : "No videos have been shared yet"
            }
          </p>
          {isOwner && (
            <button
              className="empty-action-btn"
              onClick={handleAddVideo}
            >
              Upload Your First Video
            </button>
          )}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Play size={48} />
          </div>
          <h4 className="empty-title">No videos match your filters</h4>
          <p className="empty-description">
            Try adjusting your filters to see more videos
          </p>
          <button
            className="empty-action-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="talent-videos-grid">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="video-card"
              onClick={() => handleVideoClick(video)}
            >
              <div className="video-thumbnail-container">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="video-thumbnail"
                />
                <div className="video-play-overlay">
                  <Play size={24} fill="white" />
                </div>
                <div className="video-duration">
                  {formatDuration(video.duration)}
                </div>
                {isOwner && (
                  <div className="video-actions">
                    <button
                      className="video-menu-btn"
                      onClick={(e) => toggleDropdown(video.id, e)}
                      aria-label="Video options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeDropdown === video.id && (
                      <div className="video-dropdown">
                        <button
                          className="dropdown-item"
                          onClick={(e) => handleEdit(video, e)}
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          className="dropdown-item delete"
                          onClick={(e) => handleDelete(video.id, e)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="video-info">
                <h4 className="video-title">{video.title}</h4>
                <div className="video-meta">
                  <span className="video-sport">{video.sport}</span>
                  <span className="video-separator">•</span>
                  <span className="video-views">{formatViewCount(video.viewCount)}</span>
                </div>
                <p className="video-description">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <VideoPlayerModal
        video={selectedVideo}
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
      />

      <VideoManagementModal
        isOpen={isManagementModalOpen}
        onClose={handleCloseManagementModal}
        onSave={handleSaveVideo}
        editingVideo={editingVideo}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TalentVideosSection;