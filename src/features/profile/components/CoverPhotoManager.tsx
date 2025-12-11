import { useState } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
import OptimizedImage from '../../../components/common/media/OptimizedImage';
import CoverPhotoCropper from '../../../components/common/media/CoverPhotoCropper';
import { getPlaceholderImage, PlaceholderImages } from '../../../utils/media/placeholderImages';
import '../styles/CoverPhotoManager.css';

interface CoverPhotoManagerProps {
  coverPhoto: string | null;
  onUpload: (file: Blob) => Promise<void>;
  onDelete: () => void;
  uploading?: boolean;
  isOwnProfile?: boolean;
  isGuest?: boolean;
  className?: string;
}

interface SelectedImage {
  file: File;
  url: string;
}

const CoverPhotoManager = ({
  coverPhoto,
  onUpload,
  onDelete,
  uploading = false,
  isOwnProfile = false,
  isGuest = false,
  className = ''
}: CoverPhotoManagerProps) => {
  const [showCropper, setShowCropper] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Cover photo must be less than 10MB. Please choose a smaller image.');
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
    if (window.confirm('Are you sure you want to delete your cover photo?')) {
      onDelete();
    }
  };

  const hasCoverPhoto = coverPhoto && !coverPhoto.includes('placeholder');

  return (
    <>
      <div className={`cover-photo-manager ${className}`}>
        <div 
          className={`cover-photo-container ${dragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <OptimizedImage
            src={coverPhoto || getPlaceholderImage('cover')}
            alt="Cover Photo"
            className="cover-photo"
            width={800}
            height={300}
            quality={90}
            webp={true}
            responsive={true}
            placeholder={PlaceholderImages.loading(800, 300)}
          />

          {/* Centered upload button for own profile */}
          {isOwnProfile && !isGuest && (
            <div className="cover-photo-overlay">
              <div className="cover-photo-actions-centered">
                <label htmlFor="cover-photo-upload" className="upload-cover-btn-centered">
                  <Camera size={24} />
                </label>
                
                {hasCoverPhoto && (
                  <button 
                    className="delete-cover-btn-small"
                    onClick={handleDelete}
                    disabled={uploading}
                    title="Delete cover photo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInput}
                style={{ display: 'none' }}
                id="cover-photo-upload"
                disabled={uploading}
              />
            </div>
          )}

          {/* Drag and drop overlay */}
          {isOwnProfile && !isGuest && dragOver && (
            <div className="drag-drop-overlay">
              <div className="drag-drop-content">
                <Upload size={32} />
                <p>Drop your cover photo here</p>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {uploading && (
            <div className="cover-photo-loading">
              <div className="loading-spinner"></div>
              <span>Uploading cover photo...</span>
            </div>
          )}
        </div>

        {/* Tips removed to simplify layout */}
      </div>

      {/* Cropper Modal */}
      {showCropper && selectedImage && (
        <CoverPhotoCropper
          imageSrc={selectedImage.url}
          onCrop={handleCrop}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
};

export default CoverPhotoManager;
