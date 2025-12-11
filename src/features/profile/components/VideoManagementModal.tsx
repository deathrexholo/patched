import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Video } from 'lucide-react';
import { TalentVideo, VideoFormData } from '../types/TalentVideoTypes';
import { SPORTS_CONFIG } from '../../athlete-onboarding/data/sportsConfig';
import {
  getVideoSkillsForSport,
  hasSportSpecificSkills,
  genericSkillCategories
} from '../data/videoSkillsConfig';
import '../styles/VideoManagementModal.css';

interface VideoManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoData: VideoFormData) => void;
  editingVideo?: TalentVideo | null;
  isLoading?: boolean;
  athleteSports?: Array<{ id: string; name: string }>; // Athlete's selected sports from profile
}

const VideoManagementModal: React.FC<VideoManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingVideo,
  isLoading = false,
  athleteSports = []
}) => {
  const [formData, setFormData] = useState<VideoFormData>({
    title: editingVideo?.title || '',
    description: editingVideo?.description || '',
    sport: editingVideo?.sport || '',
    sportName: editingVideo?.sportName || '',
    mainCategory: editingVideo?.mainCategory || '',
    mainCategoryName: editingVideo?.mainCategoryName || '',
    specificSkill: editingVideo?.specificSkill || '',
    skillCategory: editingVideo?.skillCategory || '',
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(
    editingVideo?.videoUrl || null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dynamic options based on selections
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [useSportSpecific, setUseSportSpecific] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get available sports (athlete's sports + all sports from config)
  const availableSports = React.useMemo(() => {
    if (athleteSports.length > 0) {
      return athleteSports;
    }
    // Fallback to all sports if athlete hasn't selected any
    return Object.values(SPORTS_CONFIG).map((sport: any) => ({
      id: sport.id,
      name: sport.name
    }));
  }, [athleteSports]);

  // Update available categories when sport changes
  useEffect(() => {
    if (formData.sport) {
      const sportHasSpecificSkills = hasSportSpecificSkills(formData.sport);
      setUseSportSpecific(sportHasSpecificSkills);

      if (sportHasSpecificSkills) {
        const categories = getVideoSkillsForSport(formData.sport);
        setAvailableCategories(categories);
      } else {
        // Use generic categories
        setAvailableCategories(genericSkillCategories);
      }

      // Reset dependent fields when sport changes
      if (formData.sport !== editingVideo?.sport) {
        setFormData(prev => ({
          ...prev,
          mainCategory: '',
          mainCategoryName: '',
          specificSkill: '',
        }));
        setAvailableSkills([]);
      }
    } else {
      setAvailableCategories([]);
      setAvailableSkills([]);
      setUseSportSpecific(false);
    }
  }, [formData.sport, editingVideo?.sport]);

  // Update available skills when category changes
  useEffect(() => {
    if (formData.mainCategory && useSportSpecific) {
      const category = availableCategories.find(cat => cat.id === formData.mainCategory);
      if (category) {
        setAvailableSkills(category.skills);
      }

      // Reset specific skill when category changes
      if (formData.mainCategory !== editingVideo?.mainCategory) {
        setFormData(prev => ({
          ...prev,
          specificSkill: '',
        }));
      }
    } else {
      setAvailableSkills([]);
    }
  }, [formData.mainCategory, useSportSpecific, availableCategories, editingVideo?.mainCategory]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Handle sport selection
    if (name === 'sport') {
      const selectedSport = availableSports.find(sport => sport.id === value);
      setFormData(prev => ({
        ...prev,
        sport: value,
        sportName: selectedSport?.name || value,
      }));
    }
    // Handle main category selection
    else if (name === 'mainCategory') {
      const selectedCategory = availableCategories.find(cat => cat.id === value);
      setFormData(prev => ({
        ...prev,
        mainCategory: value,
        mainCategoryName: selectedCategory?.name || value,
      }));
    }
    // Handle other inputs normally
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

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

    // Validate based on whether sport has specific skills or not
    if (useSportSpecific) {
      if (!formData.mainCategory) {
        newErrors.mainCategory = 'Category is required';
      }
      if (!formData.specificSkill) {
        newErrors.specificSkill = 'Specific skill is required';
      }
    } else {
      // Generic categories for sports without specific skills
      if (!formData.skillCategory) {
        newErrors.skillCategory = 'Skill category is required';
      }
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
      sportName: '',
      mainCategory: '',
      mainCategoryName: '',
      specificSkill: '',
      skillCategory: '',
    });
    setVideoFile(null);
    setVideoPreview(null);
    setErrors({});
    setAvailableCategories([]);
    setAvailableSkills([]);
    setUseSportSpecific(false);
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

            {/* Sport Selection */}
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
                {availableSports.map(sport => (
                  <option key={sport.id} value={sport.id}>{sport.name}</option>
                ))}
              </select>
              {errors.sport && <span className="error-message">{errors.sport}</span>}
            </div>

            {/* Conditional Rendering: Sport-Specific OR Generic Categories */}
            {formData.sport && useSportSpecific ? (
              // Sport-Specific Cascading Dropdowns
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="mainCategory" className="form-label">
                      Main Category *
                    </label>
                    <select
                      id="mainCategory"
                      name="mainCategory"
                      value={formData.mainCategory}
                      onChange={handleInputChange}
                      className={`form-select ${errors.mainCategory ? 'error' : ''}`}
                      disabled={isLoading}
                    >
                      <option value="">Select category</option>
                      {availableCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.mainCategory && (
                      <span className="error-message">{errors.mainCategory}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="specificSkill" className="form-label">
                      Specific Skill *
                    </label>
                    <select
                      id="specificSkill"
                      name="specificSkill"
                      value={formData.specificSkill}
                      onChange={handleInputChange}
                      className={`form-select ${errors.specificSkill ? 'error' : ''}`}
                      disabled={isLoading || !formData.mainCategory}
                    >
                      <option value="">
                        {formData.mainCategory ? 'Select skill' : 'Select category first'}
                      </option>
                      {availableSkills.map(skill => (
                        <option key={skill} value={skill}>
                          {skill}
                        </option>
                      ))}
                    </select>
                    {errors.specificSkill && (
                      <span className="error-message">{errors.specificSkill}</span>
                    )}
                  </div>
                </div>
              </>
            ) : formData.sport ? (
              // Generic Categories for sports without specific skills
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
                  {availableCategories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.skillCategory && (
                  <span className="error-message">{errors.skillCategory}</span>
                )}
              </div>
            ) : null}
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