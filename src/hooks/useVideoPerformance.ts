import { useEffect, useRef, useCallback, useState } from 'react';
import { VideoQuality, VideoQualityVersion } from '../types/models/moment';

/**
 * Network connection types for quality selection
 */
export type NetworkType = 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';

/**
 * Video performance optimization options
 */
export interface UseVideoPerformanceOptions {
  enableLazyLoading?: boolean;
  enablePreloading?: boolean;
  enableAdaptiveQuality?: boolean;
  preloadDistance?: number; // Number of videos to preload ahead
  memoryThreshold?: number; // MB threshold for memory management
  qualityPreferences?: {
    wifi: VideoQuality;
    cellular: VideoQuality;
    slow: VideoQuality;
  };
}

/**
 * Video element with performance metadata
 */
interface VideoPerformanceData {
  element: HTMLVideoElement;
  id: string;
  isPreloaded: boolean;
  isVisible: boolean;
  quality: VideoQuality;
  lastAccessTime: number;
  memoryUsage: number; // Estimated memory usage in MB
  networkType: NetworkType;
  loadStartTime?: number;
  loadEndTime?: number;
}

/**
 * Network information interface
 */
interface NetworkInformation extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * Return type for video performance hook
 */
export interface UseVideoPerformanceReturn {
  registerVideo: (video: HTMLVideoElement, id: string, qualityVersions?: VideoQualityVersion[]) => void;
  unregisterVideo: (id: string) => void;
  preloadVideo: (id: string) => Promise<void>;
  optimizeQuality: (id: string) => Promise<void>;
  getOptimalQuality: () => VideoQuality;
  getCurrentNetworkType: () => NetworkType;
  getMemoryUsage: () => number;
  cleanupMemory: () => Promise<void>;
  setVideoVisible: (id: string, visible: boolean) => void;
}

/**
 * Custom hook for video performance optimizations
 */
export const useVideoPerformance = (
  options: UseVideoPerformanceOptions = {}
): UseVideoPerformanceReturn => {
  const {
    enableLazyLoading = true,
    enablePreloading = true,
    enableAdaptiveQuality = true,
    preloadDistance = 2,
    memoryThreshold = 100, // 100MB
    qualityPreferences = {
      wifi: 'high',
      cellular: 'medium',
      slow: 'low'
    }
  } = options;

  const videosRef = useRef<Map<string, VideoPerformanceData>>(new Map());
  const preloadQueueRef = useRef<Set<string>>(new Set());
  const [networkType, setNetworkType] = useState<NetworkType>('unknown');
  const [memoryUsage, setMemoryUsage] = useState(0);

  // Detect network connection type
  const detectNetworkType = useCallback((): NetworkType => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection as NetworkInformation;
      const effectiveType = connection.effectiveType;
      
      switch (effectiveType) {
        case 'slow-2g':
          return 'slow-2g';
        case '2g':
          return '2g';
        case '3g':
          return '3g';
        case '4g':
          return '4g';
        default:
          // Check if we're on WiFi (rough estimation)
          if (connection.downlink > 10) {
            return 'wifi';
          }
          return '4g';
      }
    }
    
    // Fallback: estimate based on connection speed test
    return 'unknown';
  }, []);

  // Update network type
  useEffect(() => {
    const updateNetworkType = () => {
      const type = detectNetworkType();
      setNetworkType(type);
    };

    updateNetworkType();

    // Listen for network changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection as NetworkInformation;
      connection.addEventListener('change', updateNetworkType);
      
      return () => {
        connection.removeEventListener('change', updateNetworkType);
      };
    }
  }, [detectNetworkType]);

  // Get optimal video quality based on network conditions
  const getOptimalQuality = useCallback((): VideoQuality => {
    if (!enableAdaptiveQuality) return 'auto';

    switch (networkType) {
      case 'wifi':
        return qualityPreferences.wifi;
      case '4g':
        return qualityPreferences.cellular;
      case '3g':
      case '2g':
      case 'slow-2g':
        return qualityPreferences.slow;
      default:
        return 'medium'; // Safe default
    }
  }, [networkType, enableAdaptiveQuality, qualityPreferences]);

  // Estimate video memory usage
  const estimateVideoMemoryUsage = useCallback((video: HTMLVideoElement): number => {
    if (!video.videoWidth || !video.videoHeight || !video.duration) return 0;

    // More realistic estimation for browser video memory usage
    // Modern browsers typically buffer 5-15 seconds of video, not the entire file
    const bufferDuration = Math.min(video.duration, 10); // Realistic ~10 second buffer
    const pixelCount = video.videoWidth * video.videoHeight;

    // Calculate based on resolution
    let estimatedMB = 0;

    if (pixelCount > 2000000) {
      // 1080p or higher: ~15-25MB buffered
      estimatedMB = 15 + (bufferDuration / 10) * 10;
    } else if (pixelCount > 900000) {
      // 720p: ~8-15MB buffered
      estimatedMB = 8 + (bufferDuration / 10) * 7;
    } else {
      // 480p or lower: ~5-10MB buffered
      estimatedMB = 5 + (bufferDuration / 10) * 5;
    }

    return estimatedMB;
  }, []);

  // Update total memory usage
  const updateMemoryUsage = useCallback(() => {
    let total = 0;
    videosRef.current.forEach(data => {
      total += data.memoryUsage;
    });
    setMemoryUsage(total);
  }, []);

  // Lazy load video thumbnail
  const lazyLoadThumbnail = useCallback(async (video: HTMLVideoElement): Promise<void> => {
    if (!enableLazyLoading || video.poster) return;

    try {
      // Create a canvas to generate thumbnail from video
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Wait for video metadata to load
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            resolve();
          };
          video.addEventListener('loadedmetadata', handleLoadedMetadata);
        });
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;

      // Seek to 1 second or 10% of duration for thumbnail
      const thumbnailTime = Math.min(1, video.duration * 0.1);
      video.currentTime = thumbnailTime;

      // Wait for seek to complete
      await new Promise<void>((resolve) => {
        const handleSeeked = () => {
          video.removeEventListener('seeked', handleSeeked);
          resolve();
        };
        video.addEventListener('seeked', handleSeeked);
      });

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and create object URL
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.8);
      });

      const thumbnailUrl = URL.createObjectURL(blob);
      video.poster = thumbnailUrl;

      // Reset video time
      video.currentTime = 0;
    } catch (error) {
      console.warn('Failed to generate lazy thumbnail:', error);
    }
  }, [enableLazyLoading]);

  // Preload video for smooth playback
  const preloadVideo = useCallback(async (id: string): Promise<void> => {
    if (!enablePreloading) return;

    const videoData = videosRef.current.get(id);
    if (!videoData || videoData.isPreloaded) return;

    const { element } = videoData;

    try {
      videoData.loadStartTime = Date.now();
      
      // Only preload metadata initially for better performance
      element.preload = 'metadata';
      
      // Load video metadata
      if (element.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            element.removeEventListener('loadedmetadata', handleLoadedMetadata);
            element.removeEventListener('error', handleError);
            reject(new Error('Metadata load timeout'));
          }, 5000); // 5 second timeout
          
          const handleLoadedMetadata = () => {
            clearTimeout(timeout);
            element.removeEventListener('loadedmetadata', handleLoadedMetadata);
            element.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = () => {
            clearTimeout(timeout);
            element.removeEventListener('loadedmetadata', handleLoadedMetadata);
            element.removeEventListener('error', handleError);
            reject(new Error('Failed to load video metadata'));
          };

          element.addEventListener('loadedmetadata', handleLoadedMetadata);
          element.addEventListener('error', handleError);
        });
      }

      // For visible videos or good connections, preload some data
      // Otherwise, just keep metadata loaded
      if (videoData.isVisible || networkType === 'wifi' || networkType === '4g') {
        element.preload = 'auto';
      }
      
      videoData.isPreloaded = true;
      videoData.loadEndTime = Date.now();
      videoData.memoryUsage = estimateVideoMemoryUsage(element);
      
      updateMemoryUsage();
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        const loadTime = videoData.loadEndTime - videoData.loadStartTime;}
    } catch (error) {
      console.warn(`Failed to preload video ${id}:`, error);
    }
  }, [enablePreloading, estimateVideoMemoryUsage, updateMemoryUsage, networkType]);

  // Optimize video quality based on network conditions
  const optimizeQuality = useCallback(async (id: string): Promise<void> => {
    if (!enableAdaptiveQuality) return;

    const videoData = videosRef.current.get(id);
    if (!videoData) return;

    const optimalQuality = getOptimalQuality();
    if (videoData.quality === optimalQuality) return;

    const { element } = videoData;
    
    try {
      // In a real implementation, you would switch to different quality URLs
      // For now, we'll adjust the video element properties
      
      // Store current time and playing state
      const currentTime = element.currentTime;
      const wasPlaying = !element.paused;
      
      // Update quality preference
      videoData.quality = optimalQuality;
      
      // Apply quality-specific optimizations
      switch (optimalQuality) {
        case 'low':
          element.preload = 'metadata';
          break;
        case 'medium':
          element.preload = 'auto';
          break;
        case 'high':
          element.preload = 'auto';
          break;
        default:
          element.preload = 'metadata';
      }

      // Restore playback state
      if (currentTime > 0) {
        element.currentTime = currentTime;
      }
      
      if (wasPlaying) {
        await element.play().catch(console.warn);
      }
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {}
    } catch (error) {
      console.warn(`Failed to optimize video quality for ${id}:`, error);
    }
  }, [enableAdaptiveQuality, getOptimalQuality]);

  // Clean up memory by removing unused videos
  // Optimized for virtual scrolling: more aggressive cleanup since fewer videos in DOM
  const cleanupMemory = useCallback(async (): Promise<void> => {
    const now = Date.now();
    const videosToCleanup: string[] = [];

    // Find videos that haven't been accessed recently and aren't visible
    // Virtual scrolling: use shorter timeout (10s instead of 30s) for quick transitions
    videosRef.current.forEach((data, id) => {
      const timeSinceAccess = now - data.lastAccessTime;
      const isOld = timeSinceAccess > 10000; // 10 seconds (reduced for virtual scroll)

      if (!data.isVisible && isOld && data.isPreloaded) {
        videosToCleanup.push(id);
      }
    });

    // Sort by last access time (oldest first)
    videosToCleanup.sort((a, b) => {
      const dataA = videosRef.current.get(a)!;
      const dataB = videosRef.current.get(b)!;
      return dataA.lastAccessTime - dataB.lastAccessTime;
    });

    let cleanedCount = 0;
    const maxCleanupAttempts = 8; // Increased from 3 for virtual scroll
    const targetThreshold = memoryThreshold * 0.7; // More aggressive: 70% instead of 80%

    // Clean up videos until we're under the threshold or cleaned enough
    for (const id of videosToCleanup) {
      const videoData = videosRef.current.get(id);
      if (!videoData) continue;

      const { element } = videoData;

      try {
        // Pause and reset video
        element.pause();
        element.currentTime = 0;
        element.preload = 'none';
        element.src = ''; // Clear source to free memory
        element.load(); // Reset the element

        // Clear preloaded data
        videoData.isPreloaded = false;
        videoData.memoryUsage = 0;

        cleanedCount++;

        // Only log in development
        if (process.env.NODE_ENV === 'development') {}
      } catch (err) {
        console.warn(`Failed to cleanup video ${id}:`, err);
      }

      // Stop after cleaning a reasonable number or if under threshold
      if (cleanedCount >= maxCleanupAttempts || memoryUsage < targetThreshold) break;
    }

    updateMemoryUsage();

    if (cleanedCount > 0 && process.env.NODE_ENV === 'development') {}
  }, [memoryUsage, memoryThreshold, updateMemoryUsage]);

  // Register video for performance optimization
  const registerVideo = useCallback((
    video: HTMLVideoElement, 
    id: string, 
    qualityVersions?: VideoQualityVersion[]
  ) => {
    // Prevent duplicate registrations
    if (videosRef.current.has(id)) {
      // Silently return if already registered to prevent console flooding
      return;
    }

    const videoData: VideoPerformanceData = {
      element: video,
      id,
      isPreloaded: false,
      isVisible: false,
      quality: getOptimalQuality(),
      lastAccessTime: Date.now(),
      memoryUsage: 0,
      networkType: detectNetworkType()
    };

    videosRef.current.set(id, videoData);

    // Initialize lazy loading
    if (enableLazyLoading) {
      lazyLoadThumbnail(video).catch(console.warn);
    }

    // Optimize quality on registration
    if (enableAdaptiveQuality) {
      optimizeQuality(id).catch(console.warn);
    }

    // Only log in development
    if (process.env.NODE_ENV === 'development') {}
  }, [getOptimalQuality, detectNetworkType, enableLazyLoading, enableAdaptiveQuality, lazyLoadThumbnail, optimizeQuality]);

  // Unregister video
  const unregisterVideo = useCallback((id: string) => {
    const videoData = videosRef.current.get(id);
    if (!videoData) {
      // Silently return if not found to prevent console flooding
      return;
    }

    // Clean up any object URLs created for thumbnails
    if (videoData.element.poster && videoData.element.poster.startsWith('blob:')) {
      URL.revokeObjectURL(videoData.element.poster);
    }

    videosRef.current.delete(id);
    preloadQueueRef.current.delete(id);
    updateMemoryUsage();

    // Only log in development
    if (process.env.NODE_ENV === 'development') {}
  }, [updateMemoryUsage]);

  // Set video visibility for preloading decisions
  const setVideoVisible = useCallback((id: string, visible: boolean) => {
    const videoData = videosRef.current.get(id);
    if (!videoData) return;

    videoData.isVisible = visible;
    videoData.lastAccessTime = Date.now();

    // Trigger preloading for visible videos
    if (visible && !videoData.isPreloaded) {
      preloadVideo(id).catch(console.warn);
    }
  }, [preloadVideo]);

  // Preload videos ahead of current position
  const preloadAheadVideos = useCallback((currentVideoIds: string[]) => {
    if (!enablePreloading) return;

    const currentIndex = currentVideoIds.findIndex(id => {
      const data = videosRef.current.get(id);
      return data?.isVisible;
    });

    if (currentIndex === -1) return;

    // Preload videos ahead
    for (let i = 1; i <= preloadDistance; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < currentVideoIds.length) {
        const nextId = currentVideoIds[nextIndex];
        if (!preloadQueueRef.current.has(nextId)) {
          preloadQueueRef.current.add(nextId);
          preloadVideo(nextId).finally(() => {
            preloadQueueRef.current.delete(nextId);
          });
        }
      }
    }
  }, [enablePreloading, preloadDistance, preloadVideo]);

  // Monitor memory usage and clean up when needed
  useEffect(() => {
    const interval = setInterval(() => {
      if (memoryUsage > memoryThreshold) {
        cleanupMemory().catch(console.warn);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [memoryUsage, memoryThreshold, cleanupMemory]);

  // Network change handler - re-optimize all videos
  useEffect(() => {
    if (!enableAdaptiveQuality) return;

    const optimizeAllVideos = async () => {
      const promises = Array.from(videosRef.current.keys()).map(id => 
        optimizeQuality(id).catch(console.warn)
      );
      await Promise.all(promises);
    };

    optimizeAllVideos();
  }, [networkType, enableAdaptiveQuality, optimizeQuality]);

  return {
    registerVideo,
    unregisterVideo,
    preloadVideo,
    optimizeQuality,
    getOptimalQuality,
    getCurrentNetworkType: () => networkType,
    getMemoryUsage: () => memoryUsage,
    cleanupMemory,
    setVideoVisible
  };
};

export default useVideoPerformance;