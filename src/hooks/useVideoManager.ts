import { useCallback, useRef, useState } from 'react';
interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  buffered: number;
  error: string | null;
}

interface UseVideoManagerReturn {
  videoState: VideoState;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  reset: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  registerVideo: (videoId: string, videoElement: HTMLVideoElement) => () => void;
}

/**
 * Hook to manage multiple videos on a page
 * Ensures only one video plays at a time
 */
export const useVideoManager = (): UseVideoManagerReturn => {
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoId = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null!);

  const [videoState, setVideoState] = useState<VideoState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    buffered: 0,
    error: null
  });

  const registerVideo = useCallback((videoId: string, videoElement: HTMLVideoElement) => {
    const handlePlay = () => {
      if (activeVideoRef.current && activeVideoId.current !== videoId) {
        activeVideoRef.current.pause();}
      activeVideoRef.current = videoElement;
      activeVideoId.current = videoId;
    };

    const handlePause = () => {
      if (activeVideoId.current === videoId) {
        activeVideoRef.current = null;
        activeVideoId.current = null;
      }
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handlePause);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handlePause);
      
      if (activeVideoId.current === videoId) {
        activeVideoRef.current = null;
        activeVideoId.current = null;
      }
    };
  }, []);

  const pauseActiveVideo = useCallback(() => {
    if (activeVideoRef.current) {
      activeVideoRef.current.pause();}
  }, []);

  const play = useCallback((): void => {
    videoRef.current?.play();
  }, []);

  const pause = useCallback((): void => {
    videoRef.current?.pause();
  }, []);

  const togglePlay = useCallback((): void => {
    if (videoState.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [videoState.isPlaying, play, pause]);

  const seek = useCallback((time: number): void => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((volume: number): void => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  const toggleMute = useCallback((): void => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  }, []);

  const reset = useCallback((): void => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, []);

  return {
    videoState,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    reset,
    videoRef,
    registerVideo
  };
};
