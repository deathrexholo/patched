import React, { useState, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import './ProfilePictureCropper.css';

type Point = { x: number; y: number };
type Area = { x: number; y: number; width: number; height: number };

interface ProfilePictureCropperProps {
  imageSrc: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number = 800,
  outputHeight: number = 800
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to desired output size
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg', 0.95);
  });
}

const ProfilePictureCropper: React.FC<ProfilePictureCropperProps> = ({
  imageSrc,
  onCrop,
  onCancel,
  aspectRatio,
  outputWidth = 800,
  outputHeight = 800
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight
      );
      onCrop(croppedBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="cropper-modal">
      <div className="cropper-overlay" onClick={onCancel}></div>
      <div className="cropper-container">
        <div className="cropper-header">
          <h3>Crop & Position Your Image</h3>
          <button className="cropper-close" onClick={onCancel} disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        <div className="cropper-content">
          <div className="cropper-area">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              showGrid={true}
              objectFit="contain"
            />
          </div>

          <div className="cropper-controls">
            <div className="zoom-control">
              <label>Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="zoom-slider"
              />
            </div>
            <p className="crop-instruction">
              Drag to reposition • Pinch or use slider to zoom
            </p>
          </div>
        </div>

        <div className="cropper-footer">
          <button
            className="cropper-btn secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="cropper-btn primary"
            onClick={handleCrop}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="btn-spinner"></div>
                Processing...
              </>
            ) : (
              <>
                <Check size={16} />
                Crop & Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureCropper;
