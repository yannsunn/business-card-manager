/**
 * Image validation utilities
 */

// Maximum file sizes
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB for both images

// Allowed image types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

// Image dimension limits
export const MAX_IMAGE_WIDTH = 4000;
export const MAX_IMAGE_HEIGHT = 4000;
export const MIN_IMAGE_WIDTH = 100;
export const MIN_IMAGE_HEIGHT = 100;

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate image file
 */
export async function validateImageFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    validateDimensions?: boolean;
  } = {}
): Promise<ImageValidationResult> {
  const {
    maxSize = MAX_IMAGE_SIZE,
    allowedTypes = ALLOWED_IMAGE_TYPES,
    validateDimensions = true
  } = options;

  const warnings: string[] = [];

  // Check file exists
  if (!file) {
    return { isValid: false, error: 'ファイルが選択されていません' };
  }

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(1);
    return { 
      isValid: false, 
      error: `画像サイズは${sizeMB}MB以下にしてください（現在: ${(file.size / 1024 / 1024).toFixed(1)}MB）` 
    };
  }

  // Warn if file is large
  if (file.size > maxSize * 0.8) {
    warnings.push('画像サイズが大きいため、アップロードに時間がかかる可能性があります');
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `対応していない画像形式です。JPEG、PNG、WebP、GIFのいずれかを選択してください` 
    };
  }

  // Validate image dimensions
  if (validateDimensions) {
    try {
      const dimensions = await getImageDimensions(file);
      
      if (dimensions.width > MAX_IMAGE_WIDTH || dimensions.height > MAX_IMAGE_HEIGHT) {
        return { 
          isValid: false, 
          error: `画像サイズは${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}ピクセル以下にしてください` 
        };
      }

      if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
        return { 
          isValid: false, 
          error: `画像サイズは${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}ピクセル以上にしてください` 
        };
      }

      // Warn about very high resolution
      if (dimensions.width > 2000 || dimensions.height > 2000) {
        warnings.push('高解像度の画像です。必要に応じて圧縮することを推奨します');
      }

    } catch (error) {
      console.error('画像寸法の取得に失敗:', error);
      warnings.push('画像の寸法を確認できませんでした');
    }
  }

  return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = url;
  });
}

/**
 * Compress image if needed
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const url = URL.createObjectURL(file);

    if (!ctx) {
      reject(new Error('Canvas context の取得に失敗しました'));
      return;
    }

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('画像の圧縮に失敗しました'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = url;
  });
}

/**
 * Convert image to WebP format
 */
export async function convertToWebP(file: File, quality: number = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const url = URL.createObjectURL(file);

    if (!ctx) {
      reject(new Error('Canvas context の取得に失敗しました'));
      return;
    }

    img.onload = () => {
      URL.revokeObjectURL(url);

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(webpFile);
          } else {
            reject(new Error('WebP変換に失敗しました'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = url;
  });
}

/**
 * Estimate Base64 size
 */
export function estimateBase64Size(fileSize: number): number {
  // Base64 increases size by approximately 33%
  return Math.ceil(fileSize * 1.33);
}

/**
 * Check if total size is within limits
 */
export function validateTotalSize(sizes: number[], maxTotal: number = MAX_TOTAL_SIZE): boolean {
  const total = sizes.reduce((sum, size) => sum + size, 0);
  return total <= maxTotal;
}