/**
 * Video Frame Extraction Utility
 *
 * Extracts a single frame from a video file for preview purposes.
 * Used by PostMediaCropper to show a static image for cropping video frames.
 */

/**
 * Extracts the first visible frame from a video file as a base64 data URL
 *
 * @param file - The video file to extract a frame from
 * @returns Promise resolving to a base64 data URL of the extracted frame
 * @throws Error if video fails to load or frame extraction fails
 */
export async function extractVideoFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true; // Mute to avoid audio playback
    video.playsInline = true; // Important for iOS

    video.onloadedmetadata = () => {
      // Seek to 0.1s to avoid black frames that sometimes appear at 0s
      video.currentTime = Math.min(0.1, video.duration);
    };

    video.onseeked = () => {
      try {
        // Create canvas with video dimensions
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Clean up video element
        URL.revokeObjectURL(video.src);
        video.remove();

        // Convert canvas to base64 data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      } catch (error) {
        URL.revokeObjectURL(video.src);
        video.remove();
        reject(new Error(`Failed to extract video frame: ${error}`));
      }
    };

    video.onerror = (error) => {
      URL.revokeObjectURL(video.src);
      video.remove();
      reject(new Error(`Failed to load video: ${error}`));
    };

    // Set video source to trigger loading
    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      reject(new Error(`Failed to create video URL: ${error}`));
    }
  });
}

/**
 * Extracts a frame from a video file at a specific time
 *
 * @param file - The video file to extract a frame from
 * @param timeInSeconds - The time position to extract the frame from
 * @returns Promise resolving to a base64 data URL of the extracted frame
 */
export async function extractVideoFrameAtTime(
  file: File,
  timeInSeconds: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Ensure time is within video duration
      const seekTime = Math.min(Math.max(0, timeInSeconds), video.duration);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(video.src);
        video.remove();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      } catch (error) {
        URL.revokeObjectURL(video.src);
        video.remove();
        reject(new Error(`Failed to extract video frame: ${error}`));
      }
    };

    video.onerror = (error) => {
      URL.revokeObjectURL(video.src);
      video.remove();
      reject(new Error(`Failed to load video: ${error}`));
    };

    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      reject(new Error(`Failed to create video URL: ${error}`));
    }
  });
}

/**
 * Gets video metadata (width, height, duration) without extracting a frame
 *
 * @param file - The video file to get metadata from
 * @returns Promise resolving to video metadata object
 */
export async function getVideoMetadata(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const metadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration
      };

      URL.revokeObjectURL(video.src);
      video.remove();

      resolve(metadata);
    };

    video.onerror = (error) => {
      URL.revokeObjectURL(video.src);
      video.remove();
      reject(new Error(`Failed to load video metadata: ${error}`));
    };

    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      reject(new Error(`Failed to create video URL: ${error}`));
    }
  });
}
