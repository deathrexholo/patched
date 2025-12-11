import { useState } from 'react';
import { Camera, Trash2, Upload, User } from 'lucide-react';
import OptimizedImage from '../../../components/common/media/OptimizedImage';
import ProfilePictureCropper from '../../../components/common/media/ProfilePictureCropper';
import { getPlaceholderImage, PlaceholderImages } from '../../../utils/media/placeholderImages';
import '../styles/ProfilePictureManager.css';

interface ProfilePictureManagerProps {
  profilePicture: string | null;
  onUpload: (file: Blob) => Promise<void>;
  onDelete: () => void;
  uploading?: boolean;
  isOwnProfile?: boolean;
  isGuest?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

interface SelectedImage {
  file: File;
  url: string;
}

const ProfilePictureManager = ({
  profilePicture,
  onUpload,
  onDelete,
  uploading = false,
  isOwnProfile = false,
  isGuest = false,
  className = '',
  size = 'large'
}: ProfilePictureManagerProps) => {
  const [showCropper, setShowCropper] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const sizeClasses = {
    small: 'profile-picture-small',
    medium: 'profile-picture-medium',
    large: 'profile-picture-large'
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate file size (5MB limit for profile pictures)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Profile picture must be less than 5MB. Please choose a smaller image.');
      return;
    }

    // Create preview URL and show cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage({ file, url: imageUrl });
    setShowCropper(true);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      alert('Please drop an image file.');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleCrop = async (croppedBlob: Blob) => {
    if (onUpload) {
      await onUpload(croppedBlob);
    }
    setShowCropper(false);
    setSelectedImage(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.url);
      setSelectedImage(null);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete your profile picture?')) {
      onDelete();
    }
  };

  const hasProfilePicture = profilePicture && !profilePicture.includes('placeholder');

  return (
    <>
      <div className={`profile-picture-manager ${sizeClasses[size]} ${className}`}>
        <div 
          className={`profile-picture-container ${dragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {hasProfilePicture ? (
            <OptimizedImage
              src={profilePicture}
              alt="Profile Picture"
              className="profile-picture"
              width={200}
              height={200}
              quality={90}
              webp={true}
              responsive={true}
              placeholder={PlaceholderImages.loading(200, 200)}
            />
          ) : (
            <div className="profile-picture-placeholder">
              <User size={size === 'large' ? 48 : size === 'medium' ? 32 : 24} />
            </div>
          )}

          {/* Upload overlay for own profile */}
          {isOwnProfile && !isGuest && (
            <div className="profile-picture-overlay">
              <div className="profile-picture-actions">
                <label htmlFor="profile-picture-upload" className="upload-profile-btn">
                  <Camera size={16} />
                  <span>
                    {uploading ? 'Uploading...' : (hasProfilePicture ? 'Change' : 'Add Photo')}
                  </span>
                </label>
                
                {hasProfilePicture && (
                  <button 
                    className="delete-profile-btn"
                    onClick={handleDelete}
                    disabled={uploading}
                    title="Delete profile picture"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInput}
                style={{ display: 'none' }}
                id="profile-picture-upload"
                disabled={uploading}
              />
            </div>
          )}

          {/* Drag and drop overlay */}
          {isOwnProfile && !isGuest && dragOver && (
            <div className="drag-drop-overlay">
              <div className="drag-drop-content">
                <Upload size={24} />
                <p>Drop photo here</p>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {uploading && (
            <div className="profile-picture-loading">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      </div>

      {/* Cropper Modal */}
      {showCropper && selectedImage && (
        <ProfilePictureCropper
          imageSrc={selectedImage.url}
          onCrop={handleCrop}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
};

export default ProfilePictureManager;