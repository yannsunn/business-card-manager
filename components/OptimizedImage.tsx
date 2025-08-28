/**
 * Optimized Image Component with lazy loading and memory management
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useLazyImage } from '@/hooks/useLazyImage';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  onError,
  placeholder = 'empty',
  blurDataURL,
}: OptimizedImageProps) {
  const { imgRef, imgSrc, isLoaded, isError } = useLazyImage(
    priority ? src : undefined,
    { onLoad, onError }
  );

  const [shouldLoad, setShouldLoad] = useState(priority);

  useEffect(() => {
    if (!priority) {
      // Delay non-priority images
      const timer = setTimeout(() => setShouldLoad(true), 100);
      return () => clearTimeout(timer);
    }
  }, [priority]);

  // Use lazy loading for non-priority images
  const imageSrc = priority ? src : (shouldLoad ? imgSrc : undefined);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Placeholder */}
      {!isLoaded && placeholder === 'blur' && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-md"
          aria-hidden="true"
        />
      )}
      
      {/* Loading skeleton */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      )}
      
      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded">
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            画像の読み込みに失敗しました
          </span>
        </div>
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  );
}

/**
 * Image Gallery with virtualization for large lists
 */
interface ImageGalleryProps {
  images: Array<{ id: string; src: string; alt: string }>;
  itemHeight?: number;
  className?: string;
}

export function VirtualizedImageGallery({
  images,
  itemHeight = 200,
  className = '',
}: ImageGalleryProps) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      const start = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = Math.min(start + visibleCount + 2, images.length); // Buffer of 2 items
      
      setVisibleRange({ start: Math.max(0, start - 2), end }); // Buffer of 2 items
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [images.length, itemHeight]);

  const totalHeight = images.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  const visibleImages = images.slice(visibleRange.start, visibleRange.end);

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: '600px' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleImages.map((image, index) => (
            <div
              key={image.id}
              style={{ height: itemHeight }}
              className="p-2"
            >
              <OptimizedImage
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover rounded"
                priority={index < 2} // Only prioritize first 2 visible images
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}