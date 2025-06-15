"use client";

import { X } from 'lucide-react';
import { useEffect } from 'react';

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
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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
        <div className="flex items-center justify-center p-4 max-h-[calc(90vh-120px)] overflow-auto">
          <img
            src={imageUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
} 