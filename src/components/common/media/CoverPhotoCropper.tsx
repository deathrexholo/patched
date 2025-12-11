import React, { useState, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import './CoverPhotoCropper.css';

type Point = { x: number; y: number };
type Area = { x: number; y: number; width: number; height: number };

interface CoverPhotoCropperProps {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
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
  outputWidth: number = 1200,
  outputHeight: number = 600
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

const CoverPhotoCropper: React.FC<CoverPhotoCropperProps> = ({
  imageSrc,
  onCrop,
  onCancel,
  aspectRatio,
  outputWidth = 1200,
  outputHeight = 600
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
    <div className="cover-cropper-modal">
      <div className="cover-cropper-overlay" onClick={onCancel}></div>
      <div className="cover-cropper-container">
        <div className="cover-cropper-header">
          <h3>Crop & Position Your Cover Photo</h3>
          <button className="cover-cropper-close" onClick={onCancel} disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        <div className="cover-cropper-content">
          <div className="cover-cropper-area">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              showGrid={true}
              objectFit="horizontal-cover"
            />
          </div>

          <div className="cover-cropper-controls">
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

        <div className="cover-cropper-footer">
          <button
            className="cover-cropper-btn secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="cover-cropper-btn primary"
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

export default CoverPhotoCropper;
