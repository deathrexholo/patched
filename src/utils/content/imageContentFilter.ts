// Basic Image Content Detection for AmaPlayer
// This provides client-side image content validation

// Image metadata analysis result interface
interface ImageMetadataResult {
  filename: string;
  size: number;
  type: string;
  lastModified: number;
  suspicious: boolean;
  warnings: string[];
}

// Image metadata analysis
export const analyzeImageMetadata = (file: File): Promise<ImageMetadataResult> => {
  return new Promise((resolve) => {
    const result = {
      filename: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      suspicious: false,
      warnings: []
    };

    // Check file extension vs MIME type
    const extension = file.name.split('.').pop().toLowerCase();
    const expectedTypes = {
      'jpg': ['image/jpeg'],
      'jpeg': ['image/jpeg'],
      'png': ['image/png'],
      'gif': ['image/gif'],
      'webp': ['image/webp'],
      'bmp': ['image/bmp']
    };

    if (expectedTypes[extension] && !expectedTypes[extension].includes(file.type)) {
      result.suspicious = true;
      result.warnings.push('File extension and MIME type mismatch');
    }

    // Check for suspicious filename patterns
    const suspiciousPatterns = [
      /nude/i, /naked/i, /sex/i, /porn/i, /xxx/i, /adult/i,
      /violence/i, /blood/i, /gore/i, /weapon/i, /gun/i,
      /politics/i, /bjp/i, /congress/i, /election/i,
      /hate/i, /racist/i, /offensive/i
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(file.name)) {
        result.suspicious = true;
        result.warnings.push(`Suspicious filename pattern: ${pattern.source}`);
      }
    });

    // Check file size (extremely large files might be suspicious)
    if (file.size > 50 * 1024 * 1024) { // 50MB
      result.warnings.push('Unusually large file size');
    }

    resolve(result);
  });
};

// Image dimensions analysis result interface
interface ImageDimensionsResult {
  width: number;
  height: number;
  aspectRatio: number;
  megapixels: number;
  suspicious: boolean;
  warnings: string[];
}

// Basic image dimension and aspect ratio analysis
export const analyzeImageDimensions = (file: File): Promise<ImageDimensionsResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const result = {
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        megapixels: (img.width * img.height) / 1000000,
        suspicious: false,
        warnings: []
      };

      // Check for unusual aspect ratios that might indicate inappropriate content
      if (result.aspectRatio > 3 || result.aspectRatio < 0.33) {
        result.warnings.push('Unusual aspect ratio detected');
      }

      // Check for extremely high resolution (might be inappropriate content)
      if (result.megapixels > 100) {
        result.warnings.push('Extremely high resolution image');
        result.suspicious = true;
      }

      // Check for very small images (might be spam/inappropriate thumbnails)
      if (img.width < 50 || img.height < 50) {
        result.warnings.push('Suspiciously small image dimensions');
      }

      URL.revokeObjectURL(url);
      resolve(result);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for analysis'));
    };

    img.src = url;
  });
};

// Image colors analysis result interface
interface ImageColorsResult {
  skinTonePercentage: number;
  redPercentage: number;
  darkPercentage: number;
  suspicious: boolean;
  warnings: string[];
}

// Color analysis for basic content detection
export const analyzeImageColors = (file: File): Promise<ImageColorsResult> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      // Resize for faster processing
      const maxSize = 100;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let totalPixels = 0;
        let skinTonePixels = 0;
        let redPixels = 0;
        let darkPixels = 0;
        
        // Analyze pixel colors
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          totalPixels++;
          
          // Basic skin tone detection (rough approximation)
          if (r > 95 && g > 40 && b > 20 && 
              r > g && r > b && 
              Math.abs(r - g) > 15) {
            skinTonePixels++;
          }
          
          // Red color detection (might indicate blood/violence)
          if (r > 150 && g < 100 && b < 100) {
            redPixels++;
          }
          
          // Dark pixel detection
          if (r < 50 && g < 50 && b < 50) {
            darkPixels++;
          }
        }
        
        const result = {
          skinTonePercentage: (skinTonePixels / totalPixels) * 100,
          redPercentage: (redPixels / totalPixels) * 100,
          darkPercentage: (darkPixels / totalPixels) * 100,
          suspicious: false,
          warnings: []
        };
        
        // Flag suspicious color patterns
        if (result.skinTonePercentage > 30) {
          result.warnings.push('High percentage of skin-tone colors detected');
          result.suspicious = true;
        }
        
        if (result.redPercentage > 20) {
          result.warnings.push('High percentage of red colors detected');
          result.suspicious = true;
        }
        
        if (result.darkPercentage > 80) {
          result.warnings.push('Predominantly dark image');
        }
        
        URL.revokeObjectURL(url);
        resolve(result);
        
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to analyze image colors: ' + error.message));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for color analysis'));
    };

    img.src = url;
  });
};

// Comprehensive image analysis result interface
interface ImageAnalysisResult {
  filename: string;
  fileSize: number;
  metadata: ImageMetadataResult;
  dimensions: ImageDimensionsResult | { warnings: string[] };
  colors: ImageColorsResult | { warnings: string[] };
  overallSuspicious: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  allWarnings: string[];
  recommendations: string[];
  error?: string;
}

// Comprehensive image content analysis
export const analyzeImageContent = async (file: File): Promise<ImageAnalysisResult> => {
  try {const [metadata, dimensions, colors] = await Promise.all([
      analyzeImageMetadata(file),
      analyzeImageDimensions(file).catch(() => ({ warnings: ['Failed to analyze dimensions'] })),
      analyzeImageColors(file).catch(() => ({ warnings: ['Failed to analyze colors'] }))
    ]);

    const combinedResult = {
      filename: file.name,
      fileSize: file.size,
      metadata,
      dimensions,
      colors,
      overallSuspicious: false,
      riskLevel: 'low' as 'low' | 'medium' | 'high',
      allWarnings: [],
      recommendations: []
    };

    // Combine all warnings
    combinedResult.allWarnings = [
      ...(metadata.warnings || []),
      ...((dimensions as ImageDimensionsResult).warnings || []),
      ...((colors as ImageColorsResult).warnings || [])
    ];

    // Determine overall suspicion level
    const suspiciousCount = [
      metadata.suspicious,
      (dimensions as ImageDimensionsResult).suspicious, 
      (colors as ImageColorsResult).suspicious
    ].filter(Boolean).length;

    if (suspiciousCount >= 2) {
      combinedResult.overallSuspicious = true;
      combinedResult.riskLevel = 'high';
      combinedResult.recommendations.push('Manual review recommended');
    } else if (suspiciousCount === 1 || combinedResult.allWarnings.length > 2) {
      combinedResult.riskLevel = 'medium';
      combinedResult.recommendations.push('Consider reviewing content');
    }

    // Add sports-specific recommendations
    if (combinedResult.riskLevel !== 'low') {
      combinedResult.recommendations.push('Consider uploading sports action photos, team photos, or training images instead');
    }return combinedResult;

  } catch (error) {
    console.error('❌ Image analysis failed:', error);
    return {
      filename: file.name,
      fileSize: file.size,
      metadata: { 
        filename: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        suspicious: true,
        warnings: ['Failed to analyze metadata'] 
      },
      dimensions: { warnings: ['Failed to analyze dimensions'] },
      colors: { warnings: ['Failed to analyze colors'] },
      error: error.message,
      overallSuspicious: true,
      riskLevel: 'high' as 'high',
      allWarnings: ['Failed to analyze image content'],
      recommendations: ['Manual review required']
    };
  }
};

// Quick validation result interface
interface QuickValidationResult {
  isValid: boolean;
  warnings: string[];
  quickFeedback: string;
}

// Quick image validation for real-time feedback
export const quickImageValidation = async (file: File): Promise<QuickValidationResult> => {
  const metadata = await analyzeImageMetadata(file);
  
  return {
    isValid: !metadata.suspicious,
    warnings: metadata.warnings,
    quickFeedback: metadata.suspicious 
      ? 'This image may contain inappropriate content based on filename analysis'
      : 'Image appears acceptable for upload'
  };
};

// Image content filter options interface
interface ImageContentFilterOptions {
  strictMode?: boolean;
  quickCheck?: boolean;
}

// Export main validation function
export const validateImageContent = async (file: File, options: ImageContentFilterOptions = {}) => {
  const { strictMode = false, quickCheck = false } = options;
  
  if (quickCheck) {
    return await quickImageValidation(file);
  }
  
  const analysis = await analyzeImageContent(file);
  
  return {
    isClean: !analysis.overallSuspicious,
    riskLevel: analysis.riskLevel,
    warnings: analysis.allWarnings,
    recommendations: analysis.recommendations,
    shouldBlock: strictMode && analysis.riskLevel === 'high',
    shouldWarn: analysis.riskLevel === 'medium' || (!strictMode && analysis.riskLevel === 'high'),
    analysis: analysis
  };
};