"use client";

import { X } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
}

export default function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  fileType,
  fileSize
}: ImageModalProps) {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Блокируем скролл страницы
      document.body.style.overflow = 'hidden';
      resetZoom(); // Reset zoom when modal opens
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, resetZoom]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const scaleAmount = 0.1;
    const newScale = e.deltaY < 0 ? scale + scaleAmount : scale - scaleAmount;
    
    // Prevent zooming out too much or too little
    setScale(Math.max(0.5, Math.min(newScale, 5))); 
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (scale > 1) { // Only allow dragging if zoomed in
      setIsDragging(true);
      setStartX(e.clientX - translateX);
      setStartY(e.clientY - translateY);
    }
  }, [scale, translateX, translateY]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setTranslateX(e.clientX - startX);
    setTranslateY(e.clientY - startY);
  }, [isDragging, startX, startY]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch events for pinch-zoom and pan
  const lastTouch = useRef<number | null>(null);
  const lastDistance = useRef<number | null>(null);
  const lastCentroid = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastDistance.current = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);
      lastCentroid.current = {
        x: (touch1.pageX + touch2.pageX) / 2,
        y: (touch1.pageY + touch2.pageY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setStartX(e.touches[0].clientX - translateX);
      setStartY(e.touches[0].clientY - translateY);
    }
  }, [scale, translateX, translateY]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);
      const newCentroid = {
        x: (touch1.pageX + touch2.pageX) / 2,
        y: (touch1.pageY + touch2.pageY) / 2,
      };

      if (lastDistance.current && lastCentroid.current) {
        // Pinch zoom
        const scaleFactor = newDistance / lastDistance.current;
        setScale((prevScale) => Math.max(0.5, Math.min(prevScale * scaleFactor, 5)));

        // Pan based on centroid movement
        const deltaX = newCentroid.x - lastCentroid.current.x;
        const deltaY = newCentroid.y - lastCentroid.current.y;
        setTranslateX((prev) => prev + deltaX);
        setTranslateY((prev) => prev + deltaY);
      }
      lastDistance.current = newDistance;
      lastCentroid.current = newCentroid;
    } else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      setTranslateX(e.touches[0].clientX - startX);
      setTranslateY(e.touches[0].clientY - startY);
    }
  }, [scale, isDragging, startX, startY, translateX, translateY]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastDistance.current = null;
    lastCentroid.current = null;
  }, []);

  // Double click to reset zoom
  const handleDoubleClick = useCallback(() => {
    resetZoom();
  }, [resetZoom]);

  if (!isOpen) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-background rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{fileName}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>{fileType}</span>
              <span>{formatFileSize(fileSize)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image */}
        <div 
          ref={containerRef}
          className="flex items-center justify-center p-4 max-h-[calc(90vh-120px)] overflow-hidden relative cursor-grab"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves container
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default') }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={fileName}
            className="object-contain rounded-lg"
            loading="lazy"
            style={{
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out', // Smooth transition when not dragging
              transformOrigin: 'center center',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
} 