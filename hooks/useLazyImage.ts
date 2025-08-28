/**
 * Lazy loading hook for images to prevent memory leaks
 */
import { useEffect, useRef, useState } from 'react';

interface LazyImageOptions {
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Hook for lazy loading images with IntersectionObserver
 */
export function useLazyImage(
  src: string | undefined,
  options: LazyImageOptions = {}
): {
  imgRef: React.RefObject<HTMLImageElement | null>;
  imgSrc: string | undefined;
  isLoaded: boolean;
  isError: boolean;
} {
  const [imgSrc, setImgSrc] = useState<string | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!src || !imgRef.current) return;

    const { threshold = 0.1, rootMargin = '50px', onLoad, onError } = options;

    // Create IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load image when it comes into view
            setImgSrc(src);
            
            // Stop observing once loaded
            if (observerRef.current && entry.target) {
              observerRef.current.unobserve(entry.target);
            }
          }
        });
      },
      { threshold, rootMargin }
    );

    // Start observing
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [src, options]);

  useEffect(() => {
    if (!imgSrc) return;

    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => {
      setIsLoaded(true);
      setIsError(false);
      options.onLoad?.();
    };

    const handleError = () => {
      setIsLoaded(false);
      setIsError(true);
      options.onError?.();
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [imgSrc, options]);

  return { imgRef, imgSrc, isLoaded, isError };
}

/**
 * Hook to manage image memory and prevent leaks
 */
export function useImageMemoryManager(
  maxImages: number = 10
): {
  loadedImages: Set<string>;
  loadImage: (src: string) => void;
  unloadImage: (src: string) => void;
  clearAll: () => void;
} {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const urlsRef = useRef<string[]>([]);

  const loadImage = (src: string) => {
    setLoadedImages((prev) => {
      const newSet = new Set(prev);
      newSet.add(src);
      
      // Track URL for cleanup
      if (!urlsRef.current.includes(src)) {
        urlsRef.current.push(src);
      }

      // Remove oldest images if limit exceeded
      if (newSet.size > maxImages) {
        const iterator = newSet.values();
        const oldestImage = iterator.next().value;
        if (oldestImage) {
          newSet.delete(oldestImage);
          revokeObjectURL(oldestImage);
        }
      }

      return newSet;
    });
  };

  const unloadImage = (src: string) => {
    setLoadedImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(src);
      revokeObjectURL(src);
      return newSet;
    });
  };

  const clearAll = () => {
    // Revoke all object URLs
    urlsRef.current.forEach(url => revokeObjectURL(url));
    urlsRef.current = [];
    setLoadedImages(new Set());
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, []);

  return { loadedImages, loadImage, unloadImage, clearAll };
}

/**
 * Safely revoke object URL if it's a blob URL
 */
function revokeObjectURL(url: string): void {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to revoke object URL:', error);
    }
  }
}