import React, { useState, useRef } from 'react';
import { X, Upload, Video } from 'lucide-react';
import { TalentVideo, VideoFormData } from '../types/TalentVideoTypes';
import '../styles/VideoManagementModal.css';

interface VideoManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoData: VideoFormData) => void;
  editingVideo?: TalentVideo | null;
  isLoading?: boolean;
}

const SPORTS_OPTIONS = [
  'Basketball', 'Football', 'Soccer', 'Baseball', 'Tennis', 'Swimming',
  'Track & Field', 'Volleyball', 'Golf', 'Hockey', 'Wrestling', 'Gymnastics',
  'Other'
];

const SKILL_CATEGORIES = [
  'Highlights', 'Training', 'Skills Demo', 'Game Footage', 'Technique',
  'Conditioning', 'Competition', 'Practice', 'Other'
];

const VideoManagementModal: React.FC<VideoManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingVideo,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<VideoFormData>({
    title: editingVideo?.title || '',
    description: editingVideo?.description || '',
    sport: editingVideo?.sport || '',
    skillCategory: editingVideo?.skillCategory || '',
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(
    editingVideo?.videoUrl || null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setErrors(prev => ({ ...prev, video: 'Please select a valid video file' }));
        return;
      }
      
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, video: 'Video file must be less than 50MB' }));
        return;
      }
      
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, video: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.sport) {
      newErrors.sport = 'Sport is required';
    }
    
    if (!formData.skillCategory) {
      newErrors.skillCategory = 'Skill category is required';
    }
    
    if (!editingVideo && !videoFile) {
      newErrors.video = 'Video file is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const submitData: VideoFormData = {
      ...formData,
      videoFile: videoFile || undefined
    };
    
    onSave(submitData);
  };

  const handleClose = () => {
    if (videoPreview && !editingVideo) {
      URL.revokeObjectURL(videoPreview);
    }
    setFormData({
      title: '',
      description: '',
      sport: '',
      skillCategory: '',
    });
    setVideoFile(null);
    setVideoPreview(null);
    setErrors({});
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="video-management-overlay"
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div className="video-management-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {editingVideo ? 'Edit Video' : 'Add New Video'}
          </h2>
          <button 
            className="close-btn"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="video-form">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="title" className="form-label">
                Video Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="Enter video title"
                disabled={isLoading}
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                placeholder="Describe your video..."
                rows={3}
                disabled={isLoading}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sport" className="form-label">
                  Sport *
                </label>
                <select
                  id="sport"
                  name="sport"
                  value={formData.sport}
                  onChange={handleInputChange}
                  className={`form-select ${errors.sport ? 'error' : ''}`}
                  disabled={isLoading}
                >
                  <option value="">Select sport</option>
                  {SPORTS_OPTIONS.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
                {errors.sport && <span className="error-message">{errors.sport}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="skillCategory" className="form-label">
                  Category *
                </label>
                <select
                  id="skillCategory"
                  name="skillCategory"
                  value={formData.skillCategory}
                  onChange={handleInputChange}
                  className={`form-select ${errors.skillCategory ? 'error' : ''}`}
                  disabled={isLoading}
                >
                  <option value="">Select category</option>
                  {SKILL_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.skillCategory && <span className="error-message">{errors.skillCategory}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">
              Video File {!editingVideo && '*'}
            </label>
            
            {videoPreview ? (
              <div className="video-preview">
                <video 
                  src={videoPreview} 
                  controls 
                  className="preview-video"
                  preload="metadata"
                />
                <button
                  type="button"
                  className="change-video-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  Change Video
                </button>
              </div>
            ) : (
              <div 
                className={`file-upload-area ${errors.video ? 'error' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Video size={48} />
                <p className="upload-text">
                  Click to upload video or drag and drop
                </p>
                <p className="upload-hint">
                  MP4, MOV, AVI up to 50MB
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden-file-input"
              disabled={isLoading}
            />
            
            {errors.video && <span className="error-message">{errors.video}</span>}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Upload size={16} className="spinning" />
                  {editingVideo ? 'Updating...' : 'Uploading...'}
                </>
              ) : (
                editingVideo ? 'Update Video' : 'Upload Video'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoManagementModal;