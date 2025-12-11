import { useEffect, useRef, useCallback, useState } from 'react';
import { useMultipleIntersectionObserver } from './useIntersectionObserver';

/**
 * Options for video auto-play functionality
 */
export interface UseVideoAutoPlayOptions {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
  playDelay?: number; // Delay before playing video in ms
  pauseDelay?: number; // Delay before pausing video in ms
  enableMemoryManagement?: boolean;
  maxConcurrentVideos?: number;
}

/**
 * Video element with metadata for auto-play management
 */
interface VideoElementData {
  element: HTMLVideoElement;
  isPlaying: boolean;
  lastPlayTime: number;
  playPromise?: Promise<void>;
}

/**
 * Return type for the video auto-play hook
 */
export interface UseVideoAutoPlayReturn {
  registerVideo: (video: HTMLVideoElement, id: string) => void;
  unregisterVideo: (id: string) => void;
  isVideoInView: (id: string) => boolean;
  getActiveVideoId: () => string | null;
  pauseAllVideos: () => Promise<void>;
  resumeActiveVideo: () => Promise<void>;
}

/**
 * Custom hook for managing video auto-play with intersection observer
 * 
 * @param options - Configuration options for video auto-play
 * @returns Object with methods to manage video auto-play
 */
export const useVideoAutoPlay = (
  options: UseVideoAutoPlayOptions = {}
): UseVideoAutoPlayReturn => {
  const {
    threshold = 0.6, // Video needs to be 60% visible to auto-play
    rootMargin = '-10% 0px -10% 0px', // Slight margin to prevent edge cases
    root = null,
    playDelay = 100,
    pauseDelay = 200,
    enableMemoryManagement = true,
    maxConcurrentVideos = 2
  } = options;

  const videosRef = useRef<Map<string, VideoElementData>>(new Map());
  const playTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pauseTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const { observe, unobserve, isIntersecting, entries } = useMultipleIntersectionObserver({
    threshold,
    rootMargin,
    root
  });

  // Clean up timeouts
  const clearTimeouts = useCallback((videoId: string) => {
    const playTimeout = playTimeoutsRef.current.get(videoId);
    const pauseTimeout = pauseTimeoutsRef.current.get(videoId);
    
    if (playTimeout) {
      clearTimeout(playTimeout);
      playTimeoutsRef.current.delete(videoId);
    }
    
    if (pauseTimeout) {
      clearTimeout(pauseTimeout);
      pauseTimeoutsRef.current.delete(videoId);
    }
  }, []);

  // Play video with error handling
  const playVideo = useCallback(async (videoId: string, videoData: VideoElementData): Promise<void> => {
    const { element } = videoData;
    
    try {
      // Cancel any existing play promise
      if (videoData.playPromise) {
        await videoData.playPromise.catch(() => {
          // Ignore errors from cancelled play promises
        });
      }

      // Check if video is still in view and not already playing
      if (!isIntersecting(element) || videoData.isPlaying) {
        return;
      }

      // Create new play promise
      videoData.playPromise = element.play();
      await videoData.playPromise;
      
      // Update state
      videoData.isPlaying = true;
      videoData.lastPlayTime = Date.now();
      setActiveVideoId(videoId);
      
      // Video auto-played successfully
    } catch (error) {
      console.warn(`Failed to auto-play video ${videoId}:`, error);
      videoData.isPlaying = false;
    } finally {
      videoData.playPromise = undefined;
    }
  }, [isIntersecting]);

  // Pause video with error handling
  const pauseVideo = useCallback(async (videoId: string, videoData: VideoElementData): Promise<void> => {
    const { element } = videoData;
    
    try {
      // Wait for any pending play promise to resolve
      if (videoData.playPromise) {
        await videoData.playPromise.catch(() => {
          // Ignore errors from cancelled play promises
        });
      }

      if (!videoData.isPlaying) {
        return;
      }

      element.pause();
      videoData.isPlaying = false;
      
      // Clear active video if this was the active one
      if (activeVideoId === videoId) {
        setActiveVideoId(null);
      }
      
      // Video auto-paused successfully
    } catch (error) {
      console.warn(`Failed to pause video ${videoId}:`, error);
    }
  }, [activeVideoId]);

  // Memory management - pause videos that are far from view
  const manageVideoMemory = useCallback(() => {
    if (!enableMemoryManagement) return;

    const playingVideos = Array.from(videosRef.current.entries())
      .filter(([, data]) => data.isPlaying)
      .sort(([, a], [, b]) => b.lastPlayTime - a.lastPlayTime);

    // Pause excess videos beyond the limit
    if (playingVideos.length > maxConcurrentVideos) {
      const videosToStop = playingVideos.slice(maxConcurrentVideos);
      videosToStop.forEach(([videoId, videoData]) => {
        pauseVideo(videoId, videoData);
      });
    }
  }, [enableMemoryManagement, maxConcurrentVideos, pauseVideo]);

  // Handle intersection changes
  useEffect(() => {
    const handleIntersectionChanges = () => {
      videosRef.current.forEach((videoData, videoId) => {
        const { element } = videoData;
        const inView = isIntersecting(element);
        
        // Clear existing timeouts for this video
        clearTimeouts(videoId);
        
        if (inView && !videoData.isPlaying) {
          // Video came into view - schedule play
          const timeout = setTimeout(() => {
            playVideo(videoId, videoData).then(() => {
              manageVideoMemory();
            });
          }, playDelay);
          
          playTimeoutsRef.current.set(videoId, timeout);
        } else if (!inView && videoData.isPlaying) {
          // Video left view - schedule pause
          const timeout = setTimeout(() => {
            pauseVideo(videoId, videoData);
          }, pauseDelay);
          
          pauseTimeoutsRef.current.set(videoId, timeout);
        }
      });
    };

    handleIntersectionChanges();
  }, [entries, isIntersecting, clearTimeouts, playVideo, pauseVideo, playDelay, pauseDelay, manageVideoMemory]);

  // Register a video for auto-play management
  const registerVideo = useCallback((video: HTMLVideoElement, id: string) => {
    if (!video || videosRef.current.has(id)) return;

    const videoData: VideoElementData = {
      element: video,
      isPlaying: false,
      lastPlayTime: 0
    };

    videosRef.current.set(id, videoData);
    observe(video);

    // Add event listeners for video state tracking
    const handlePlay = () => {
      videoData.isPlaying = true;
      videoData.lastPlayTime = Date.now();
      setActiveVideoId(id);
    };

    const handlePause = () => {
      videoData.isPlaying = false;
      if (activeVideoId === id) {
        setActiveVideoId(null);
      }
    };

    const handleEnded = () => {
      videoData.isPlaying = false;
      if (activeVideoId === id) {
        setActiveVideoId(null);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // Store cleanup functions
    videoData.element.dataset.cleanupId = id;
    
    // Video registered for auto-play
  }, [observe, activeVideoId]);

  // Unregister a video from auto-play management
  const unregisterVideo = useCallback((id: string) => {
    const videoData = videosRef.current.get(id);
    if (!videoData) return;

    const { element } = videoData;

    // Clear timeouts
    clearTimeouts(id);

    // Pause video if playing
    if (videoData.isPlaying) {
      pauseVideo(id, videoData);
    }

    // Remove from observer
    unobserve(element);

    // Remove event listeners (they'll be cleaned up when element is removed)
    videosRef.current.delete(id);

    // Video unregistered from auto-play
  }, [clearTimeouts, pauseVideo, unobserve]);

  // Check if a video is currently in view
  const isVideoInView = useCallback((id: string): boolean => {
    const videoData = videosRef.current.get(id);
    if (!videoData) return false;
    
    return isIntersecting(videoData.element);
  }, [isIntersecting]);

  // Get the currently active video ID
  const getActiveVideoId = useCallback((): string | null => {
    return activeVideoId;
  }, [activeVideoId]);

  // Pause all videos
  const pauseAllVideos = useCallback(async (): Promise<void> => {
    const pausePromises = Array.from(videosRef.current.entries()).map(([videoId, videoData]) => {
      if (videoData.isPlaying) {
        return pauseVideo(videoId, videoData);
      }
      return Promise.resolve();
    });

    await Promise.all(pausePromises);
  }, [pauseVideo]);

  // Resume the active video (if any)
  const resumeActiveVideo = useCallback(async (): Promise<void> => {
    if (!activeVideoId) return;

    const videoData = videosRef.current.get(activeVideoId);
    if (!videoData || videoData.isPlaying) return;

    if (isIntersecting(videoData.element)) {
      await playVideo(activeVideoId, videoData);
    }
  }, [activeVideoId, isIntersecting, playVideo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      playTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      pauseTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      
      // Pause all videos
      videosRef.current.forEach((videoData, videoId) => {
        if (videoData.isPlaying) {
          videoData.element.pause();
        }
      });
    };
  }, []);

  return {
    registerVideo,
    unregisterVideo,
    isVideoInView,
    getActiveVideoId,
    pauseAllVideos,
    resumeActiveVideo
  };
};

export default useVideoAutoPlay;