import { VideoQuality, VideoQualityVersion } from '../types/models/moment';

/**
 * Network connection information
 */
export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
}

/**
 * Video optimization utilities
 */
export class VideoOptimizationUtils {
  private static readonly QUALITY_BITRATES = {
    low: 500, // 500 kbps
    medium: 1500, // 1.5 Mbps
    high: 4000, // 4 Mbps
    auto: 0 // Will be determined dynamically
  };

  private static readonly NETWORK_QUALITY_MAP = {
    'slow-2g': 'low' as VideoQuality,
    '2g': 'low' as VideoQuality,
    '3g': 'medium' as VideoQuality,
    '4g': 'high' as VideoQuality,
    'unknown': 'medium' as VideoQuality
  };

  /**
   * Get current network information
   */
  static getNetworkInfo(): NetworkInfo {
    const defaultInfo: NetworkInfo = {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    };

    if (!('connection' in navigator)) {
      return defaultInfo;
    }

    const connection = (navigator as any).connection;
    
    return {
      type: connection.type === 'wifi' ? 'wifi' : 
            connection.type === 'cellular' ? 'cellular' : 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    };
  }

  /**
   * Determine optimal video quality based on network conditions
   */
  static getOptimalQuality(networkInfo?: NetworkInfo): VideoQuality {
    const info = networkInfo || this.getNetworkInfo();
    
    // If user has data saver enabled, always use low quality
    if (info.saveData) {
      return 'low';
    }

    // Use effective type to determine quality
    if (info.effectiveType in this.NETWORK_QUALITY_MAP) {
      return this.NETWORK_QUALITY_MAP[info.effectiveType];
    }

    // Fallback to downlink speed
    if (info.downlink > 5) {
      return 'high';
    } else if (info.downlink > 1.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Select best quality version from available options
   */
  static selectQualityVersion(
    versions: VideoQualityVersion[], 
    targetQuality: VideoQuality,
    networkInfo?: NetworkInfo
  ): VideoQualityVersion | null {
    if (!versions.length) return null;

    const info = networkInfo || this.getNetworkInfo();
    
    // If target is auto, determine based on network
    if (targetQuality === 'auto') {
      targetQuality = this.getOptimalQuality(info);
    }

    // Find exact match first
    const exactMatch = versions.find(v => v.quality === targetQuality);
    if (exactMatch) return exactMatch;

    // Find closest match based on bitrate
    const targetBitrate = this.QUALITY_BITRATES[targetQuality];
    
    return versions.reduce((best, current) => {
      const bestDiff = Math.abs(best.bitrate - targetBitrate);
      const currentDiff = Math.abs(current.bitrate - targetBitrate);
      return currentDiff < bestDiff ? current : best;
    });
  }

  /**
   * Estimate video memory usage
   */
  static estimateMemoryUsage(
    width: number, 
    height: number, 
    duration: number, 
    quality: VideoQuality = 'medium'
  ): number {
    // Base calculation: width * height * bytes per pixel * frames
    const pixelCount = width * height;
    const bytesPerPixel = 4; // RGBA
    const fps = 30; // Assume 30fps
    const totalFrames = duration * fps;
    
    // Quality multiplier for compression
    const qualityMultipliers = {
      low: 0.3,
      medium: 0.6,
      high: 1.0,
      auto: 0.6
    };
    
    const multiplier = qualityMultipliers[quality];
    const totalBytes = pixelCount * bytesPerPixel * totalFrames * multiplier;
    
    // Convert to MB
    return totalBytes / (1024 * 1024);
  }

  /**
   * Check if device has sufficient memory for video playback
   */
  static checkMemoryAvailability(): { available: boolean; estimatedFree: number } {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
      const freeMB = limitMB - usedMB;
      
      return {
        available: freeMB > 50, // Need at least 50MB free
        estimatedFree: freeMB
      };
    }

    // Fallback estimation based on device characteristics
    const isLowEndDevice = this.isLowEndDevice();
    return {
      available: !isLowEndDevice,
      estimatedFree: isLowEndDevice ? 100 : 500 // Rough estimates
    };
  }

  /**
   * Detect if device is low-end based on various factors
   */
  static isLowEndDevice(): boolean {
    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 1;
    if (cores <= 2) return true;

    // Check device memory if available
    if ('deviceMemory' in navigator) {
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory <= 2) return true; // 2GB or less
    }

    // Check connection type
    const networkInfo = this.getNetworkInfo();
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      return true;
    }

    // Check user agent for known low-end devices
    const userAgent = navigator.userAgent.toLowerCase();
    const lowEndPatterns = [
      'android 4', 'android 5', 'android 6',
      'iphone os 9', 'iphone os 10',
      'windows phone'
    ];

    return lowEndPatterns.some(pattern => userAgent.includes(pattern));
  }

  /**
   * Generate thumbnail from video element
   */
  static async generateThumbnail(
    video: HTMLVideoElement, 
    time: number = 1,
    width: number = 320,
    height: number = 180
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = width;
      canvas.height = height;

      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
        
        try {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, width, height);
          
          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      const handleError = () => {
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
        reject(new Error('Failed to seek video for thumbnail'));
      };

      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);
      
      // Seek to specified time
      video.currentTime = Math.min(time, video.duration || 1);
    });
  }

  /**
   * Preload video with progressive loading strategy
   */
  static async preloadVideo(
    video: HTMLVideoElement,
    strategy: 'metadata' | 'partial' | 'full' = 'metadata'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video preload timeout'));
      }, 10000); // 10 second timeout

      const handleCanPlay = () => {
        clearTimeout(timeout);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        resolve();
      };

      const handleError = () => {
        clearTimeout(timeout);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        reject(new Error('Video preload failed'));
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      // Set preload strategy
      switch (strategy) {
        case 'metadata':
          video.preload = 'metadata';
          break;
        case 'partial':
          video.preload = 'auto';
          // Load first few seconds
          video.load();
          break;
        case 'full':
          video.preload = 'auto';
          video.load();
          break;
      }
    });
  }

  /**
   * Monitor network changes and return cleanup function
   */
  static monitorNetworkChanges(callback: (networkInfo: NetworkInfo) => void): () => void {
    if (!('connection' in navigator)) {
      return () => {}; // No-op cleanup
    }

    const connection = (navigator as any).connection;
    
    const handleChange = () => {
      callback(this.getNetworkInfo());
    };

    connection.addEventListener('change', handleChange);
    
    return () => {
      connection.removeEventListener('change', handleChange);
    };
  }

  /**
   * Calculate optimal preload distance based on device capabilities
   */
  static getOptimalPreloadDistance(): number {
    const isLowEnd = this.isLowEndDevice();
    const memoryInfo = this.checkMemoryAvailability();
    const networkInfo = this.getNetworkInfo();

    // Base distance
    let distance = 2;

    // Adjust for device capabilities first (most important)
    if (isLowEnd || !memoryInfo.available) {
      distance = 1;
    } else if (memoryInfo.estimatedFree > 200) {
      distance = 3;
    }

    // Adjust for network speed (but don't override low-end device restrictions)
    if (!isLowEnd) {
      if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
        distance = Math.min(distance, 1);
      } else if (networkInfo.effectiveType === '4g' && networkInfo.downlink > 5) {
        distance = Math.min(distance + 1, 4);
      }
    }

    return distance;
  }

  /**
   * Get recommended video settings for current device/network
   */
  static getRecommendedSettings(): {
    quality: VideoQuality;
    preloadDistance: number;
    enableLazyLoading: boolean;
    enablePreloading: boolean;
    memoryThreshold: number;
  } {
    const isLowEnd = this.isLowEndDevice();
    const networkInfo = this.getNetworkInfo();
    const memoryInfo = this.checkMemoryAvailability();

    return {
      quality: this.getOptimalQuality(networkInfo),
      preloadDistance: this.getOptimalPreloadDistance(),
      enableLazyLoading: true,
      enablePreloading: !isLowEnd && memoryInfo.available,
      memoryThreshold: isLowEnd ? 50 : 100 // MB
    };
  }
}

export default VideoOptimizationUtils;