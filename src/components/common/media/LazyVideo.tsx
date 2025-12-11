import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { useInViewport } from '../../../utils/performance/infiniteScroll';
import './LazyVideo.css';

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playing?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
}

const LazyVideo: React.FC<LazyVideoProps> = memo(({ 
  src, 
  poster, 
  className = '',
  autoPlay = false,
  muted = true,
  loop = false,
  playing = false,
  onPlay,
  onPause,
  controls = false,
  preload = 'metadata'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(playing);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  
  const { elementRef, hasBeenInViewport } = useInViewport({
    rootMargin: '100px',
    threshold: 0.25
  });

  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Video play error:', error);
      setHasError(true);
    }
  }, [isPlaying, onPlay, onPause]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    const newMutedState = !isMuted;
    videoRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  }, [isMuted]);

  const enterFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    const video = videoRef.current as any;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  }, []);

  const handleLoadedData = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video loading error:', e);
    setHasError(true);
    setIsLoaded(false);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!hasBeenInViewport && isPlaying && videoRef.current) {
      videoRef.current.pause();
    }
  }, [hasBeenInViewport, isPlaying]);

  useEffect(() => {
    if (playing !== isPlaying && videoRef.current && isLoaded) {
      if (playing) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [playing, isPlaying, isLoaded]);

  if (!hasBeenInViewport) {
    return (
      <div 
        ref={elementRef as React.RefObject<HTMLDivElement>} 
        className={`lazy-video-placeholder ${className}`}
        style={{ 
          backgroundImage: poster ? `url(${poster})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="video-loading">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`lazy-video-error ${className}`}>
        <div className="error-message">
          <p>Unable to load video</p>
          <button 
            onClick={() => {
              setHasError(false);
              setIsLoaded(false);
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`lazy-video-container ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        loop={loop}
        preload={preload}
        playsInline
        onLoadedData={handleLoadedData}
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        className="lazy-video"
        controls={controls}
      />
      
      {!controls && (
        <div className={`video-controls-overlay ${showControls ? 'visible' : ''}`}>
          <button 
            className="play-pause-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          
          <div className="video-controls-right">
            <button 
              className="mute-btn"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <button 
              className="fullscreen-btn"
              onClick={enterFullscreen}
              aria-label="Fullscreen"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      )}
      
      {!isLoaded && (
        <div className="video-loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
      
      {!isPlaying && isLoaded && !showControls && (
        <div className="play-button-overlay" onClick={togglePlay}>
          <button className="large-play-btn">
            <Play size={48} />
          </button>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.playing === nextProps.playing &&
    prevProps.muted === nextProps.muted
  );
});

LazyVideo.displayName = 'LazyVideo';

export default LazyVideo;
