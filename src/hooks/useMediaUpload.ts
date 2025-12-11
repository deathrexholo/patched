import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
interface MediaPreview {
  url: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

interface UseMediaUploadReturn {
  selectedMedia: File | null;
  mediaPreview: MediaPreview | null;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  selectMedia: (file: File) => void;
  removeMedia: () => void;
  uploadMedia: (file: File, userId: string) => Promise<string>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  validateFile: (file: File) => { isValid: boolean; error?: string };
  clearError: () => void;
  reset: () => void;
}

/**
 * Custom hook for handling media upload functionality
 * Extracts media upload logic from Home component
 */
export const useMediaUpload = (): UseMediaUploadReturn => {
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate file type and size
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return { isValid: false, error: 'File size must be less than 50MB' };
    }

    // Validate file type
    const validTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'video/mp4', 
      'video/webm', 
      'video/quicktime'
    ];
    
    if (!validTypes.includes(file.type)) {
      return { 
        isValid: false, 
        error: 'Please select a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file.' 
      };
    }

    return { isValid: true };
  }, []);

  /**
   * Select and preview media file
   * @param {File} file - File to select
   */
  const selectMedia = useCallback((file: File): void => {
    setError(null);
    
    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setSelectedMedia(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview({
        url: e.target?.result as string,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name,
        size: file.size
      });
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  /**
   * Remove selected media and preview
   */
  const removeMedia = useCallback((): void => {
    setSelectedMedia(null);
    setMediaPreview(null);
    setError(null);
    setUploadProgress(0);
    
    // Reset file input if it exists
    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  /**
   * Upload media file to Firebase Storage
   * @param {File} file - File to upload
   * @param {string} userId - User ID for file path
   * @returns {Promise<string>} Download URL
   */
  const uploadMedia = useCallback(async (file: File, userId: string): Promise<string> => {
    if (!file) {
      throw new Error('No file to upload');
    }

    if (!userId) {
      throw new Error('User ID is required for upload');
    }

    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `posts/${userId}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, filename);

      setUploadProgress(25);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      setUploadProgress(75);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setUploadProgress(100);

      return downloadURL;

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
      // Keep progress at 100% briefly if successful, then reset
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    }
  }, [validateFile]);

  /**
   * Handle file input change event
   * @param {Event} event - File input change event
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      selectMedia(file);
    }
  }, [selectMedia]);

  /**
   * Clear any existing errors
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Reset all media upload state
   */
  const reset = useCallback((): void => {
    setSelectedMedia(null);
    setMediaPreview(null);
    setUploading(false);
    setUploadProgress(0);
    setError(null);
    
    // Reset file input if it exists
    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  return {
    selectedMedia,
    mediaPreview,
    uploading,
    uploadProgress,
    error,
    selectMedia,
    removeMedia,
    uploadMedia,
    handleFileSelect,
    validateFile,
    clearError,
    reset
  };
};
