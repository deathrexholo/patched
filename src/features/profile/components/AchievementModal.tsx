import React, { useState, useEffect } from 'react';
import { X, Trophy, Upload, Calendar, Tag, FileText } from 'lucide-react';
import { Achievement } from '../types/ProfileTypes';
import '../styles/AchievementModal.css';

interface AchievementModalProps {
  isOpen: boolean;
  achievement?: Achievement | null;
  onClose: () => void;
  onSave: (achievement: Omit<Achievement, 'id'>) => void;
}

const AchievementModal: React.FC<AchievementModalProps> = ({
  isOpen,
  achievement,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    dateEarned: '',
    imageUrl: '',
    verificationStatus: 'unverified' as 'verified' | 'pending' | 'unverified',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or achievement changes
  useEffect(() => {
    if (isOpen) {
      if (achievement) {
        // Edit mode - populate form with existing data
        setFormData({
          title: achievement.title,
          description: achievement.description,
          category: achievement.category,
          dateEarned: new Date(achievement.dateEarned).toISOString().split('T')[0],
          imageUrl: achievement.imageUrl || '',
          verificationStatus: achievement.verificationStatus || 'unverified'
        });
      } else {
        // Add mode - reset form
        setFormData({
          title: '',
          description: '',
          category: '',
          dateEarned: '',
          imageUrl: '',
          verificationStatus: 'unverified'
        });
      }
      setErrors({});
    }
  }, [isOpen, achievement]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Only validate if title is filled in
    if (formData.title.trim() && formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    // Only validate if date is filled in
    if (formData.dateEarned) {
      const selectedDate = new Date(formData.dateEarned);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.dateEarned = 'Date cannot be in the future';
      }
    }

    // Validate description length only if filled
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    // Validate URL only if provided
    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Please enter a valid image URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const achievementData: Omit<Achievement, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        dateEarned: new Date(formData.dateEarned),
        imageUrl: formData.imageUrl.trim() || undefined,
        verificationStatus: formData.verificationStatus
      };

      onSave(achievementData);
      onClose();
    } catch (error) {
      console.error('Error saving achievement:', error);
      setErrors({ submit: 'Failed to save achievement. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const categoryOptions = [
    'Championship / Title',
    'Tournament / Competition',
    'Medal / Award',
    'Personal Best Record',
    'Team Achievement',
    'Selection / Representation',
    'Recognition / Honour',
    'Other'
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-modal-title"
    >
      <div className="modal-container achievement-modal">
        <div className="modal-header">
          <div className="modal-title-section">
            <Trophy size={24} className="modal-icon" aria-hidden="true" />
            <h2 id="achievement-modal-title" className="modal-title">
              {achievement ? 'Edit Achievement' : 'Add Achievement'}
            </h2>
          </div>
          <button
            className="modal-close-button"
            onClick={handleClose}
            aria-label="Close modal"
            type="button"
            disabled={isSubmitting}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="achievement-title" className="form-label">
                <Tag size={16} aria-hidden="true" />
                What did you achieve?
                <span className="form-label-optional">(Optional)</span>
              </label>
              <input
                id="achievement-title"
                type="text"
                className={`form-input ${errors.title ? 'error' : ''}`}
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Won State Championship 2024, Broke School Record, Made National Team"
                maxLength={100}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <span id="title-error" className="form-error" role="alert">
                  {errors.title}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="achievement-category" className="form-label">
                <Trophy size={16} aria-hidden="true" />
                Category
                <span className="form-label-optional">(Optional)</span>
              </label>
              <select
                id="achievement-category"
                className={`form-select ${errors.category ? 'error' : ''}`}
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                aria-describedby={errors.category ? 'category-error' : undefined}
              >
                <option value="">Select a category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span id="category-error" className="form-error" role="alert">
                  {errors.category}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="achievement-date" className="form-label">
                <Calendar size={16} aria-hidden="true" />
                Date Earned
                <span className="form-label-optional">(Optional)</span>
              </label>
              <input
                id="achievement-date"
                type="date"
                className={`form-input ${errors.dateEarned ? 'error' : ''}`}
                value={formData.dateEarned}
                onChange={(e) => handleInputChange('dateEarned', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                aria-describedby={errors.dateEarned ? 'date-error' : undefined}
              />
              {errors.dateEarned && (
                <span id="date-error" className="form-error" role="alert">
                  {errors.dateEarned}
                </span>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label htmlFor="achievement-description" className="form-label">
                <FileText size={16} aria-hidden="true" />
                Description
                <span className="form-label-optional">(Optional)</span>
              </label>
              <textarea
                id="achievement-description"
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Tell us more about your achievement... (e.g., what you accomplished, how proud you are)"
                rows={3}
                maxLength={500}
                aria-describedby={errors.description ? 'description-error' : 'description-help'}
              />
              <div id="description-help" className="form-help">
                {formData.description.length}/500 characters
              </div>
              {errors.description && (
                <span id="description-error" className="form-error" role="alert">
                  {errors.description}
                </span>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="form-error submit-error" role="alert">
              {errors.submit}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="modal-button secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (achievement ? 'Update Achievement' : 'Add Achievement')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AchievementModal;