"use client";

import { useState } from 'react';
import { X, FileText, File, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  file: {
    id: string;
    name: string;
    type: string;
    size: number;
    preview: string;
    ext: string;
    storageId?: string; // Для remote файлов
    remote?: boolean;   // Флаг remote файла
    isUploading?: boolean; // Индикатор загрузки
  };
  onRemove: (id: string) => void;
  showPreview?: boolean;
}

export default function FilePreview({ file, onRemove, showPreview = true }: FilePreviewProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type.includes('pdf')) return FileText;
    if (file.type.startsWith('text/')) return FileText;
    return File;
  };

  const getFileColor = () => {
    if (file.type.startsWith('image/')) return 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800';
    if (file.type.includes('pdf')) return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
    if (file.type.startsWith('text/')) return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800';
    return 'bg-gray-50 border-gray-200 dark:bg-gray-950/30 dark:border-gray-800';
  };

  const getIconColor = () => {
    if (file.type.startsWith('image/')) return 'text-blue-600 dark:text-blue-400';
    if (file.type.includes('pdf')) return 'text-red-600 dark:text-red-400';
    if (file.type.startsWith('text/')) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Get the best quality image URL
  const getImageUrl = (preferOriginal = false) => {
    if (!file.preview) return '';
    
    // For remote files, prefer original when requesting high quality
    if (file.remote && file.storageId && preferOriginal) {
      return `/api/files/${file.storageId}`;
    }
    
    return file.preview;
  };

  const handleImageClick = () => {
    if (file.storageId) {
      // Open original file for the best quality
      window.open(`/api/files/${file.storageId}`, '_blank');
    } else if (file.preview && file.preview.startsWith('blob:')) {
      window.open(file.preview, '_blank');
    }
  };

  // Для изображений с превью при наведении
  if (file.type.startsWith('image/')) {
    // Улучшенная валидация preview URL с fallback механизмами
    const hasValidPreview = (() => {
      if (!file.preview || file.preview === '') {
        // Для remote файлов пытаемся использовать storageId как fallback
        if (file.remote && file.storageId) {
          // Обновляем preview URL на лету
          file.preview = `/api/files/${file.storageId}`;
          return true;
        }
        return false;
      }
      
      if (file.preview.length <= 5) return false;
      
      const isValidUrl = file.preview.startsWith('blob:') || 
                        file.preview.startsWith('http') || 
                        file.preview.startsWith('/api/');
      
      // Дополнительная проверка для remote файлов
      if (!isValidUrl && file.remote && file.storageId) {
        file.preview = `/api/files/${file.storageId}`;
        return true;
      }
      
      return isValidUrl;
    })();
    
    return (
      <div 
        className="relative flex-shrink-0 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          {hasValidPreview ? (
            <Image
              src={getImageUrl(false)} // Use preview for small thumbnails
              className={cn(
                "h-16 w-16 object-cover rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-sm cursor-pointer hover:shadow-md transition-shadow",
                file.isUploading && "opacity-50"
              )}
              alt={file.name}
              width={64}
              height={64}
              onClick={handleImageClick}
              onError={() => {
                console.warn('Failed to load image preview:', file.preview, 'for file:', file.name);
              }}
            />
          ) : (
            <div 
              className={cn(
                "h-16 w-16 bg-blue-50 border-2 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-lg flex items-center justify-center",
                file.isUploading && "opacity-50"
              )}
              title={`Preview not available for ${file.name}`}
            >
              <ImageIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          
          {/* Индикатор загрузки */}
          {file.isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          
          {/* Увеличенный превью при наведении - показываем под файлом */}
          {showPreview && isHovered && hasValidPreview && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[200] pointer-events-none">
              <div className="bg-background border border-border rounded-lg shadow-xl p-3">
                <Image
                  src={getImageUrl(true)} // Use high quality original for hover preview
                  alt={file.name}
                  className="w-80 h-80 object-contain rounded-lg cursor-pointer"
                  width={320}
                  height={320}
                  onError={() => {
                    console.warn('Failed to load hover preview:', getImageUrl(true), 'for file:', file.name);
                  }}
                />
                <div className="mt-2 text-sm text-muted-foreground text-center">
                  <div className="font-medium truncate max-w-80">{file.name}</div>
                  <div>{formatFileSize(file.size)}</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">Click to view full size</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Крестик всегда виден при наведении на группу */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(file.id);
          }}
          className="absolute -right-1 -top-1 bg-background border border-border rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10"
          aria-label="Remove file"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Для других типов файлов - только название и размер, без превью
  const IconComponent = getFileIcon();
  
  // Функция для открытия файла (для PDF и других не-изображений)
  const handleFileClick = () => {
    if (file.storageId) {
      // Открываем файл через наш API
      window.open(`/api/files/${file.storageId}`, '_blank');
    } else if (file.preview && file.preview.startsWith('blob:')) {
      // Для локальных файлов используем blob URL
      window.open(file.preview, '_blank');
    } else {
      console.warn('Cannot open file - no storageId or blob URL:', file.name);
    }
  };
  
  return (
    <div className="relative flex-shrink-0 group">
      <div 
        className={cn(
          "h-16 w-20 rounded-lg border-2 flex flex-col items-center justify-center text-[10px] px-1 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer relative",
          getFileColor(),
          file.isUploading && "opacity-50"
        )}
        onClick={handleFileClick}
      >
        <IconComponent className={cn("w-5 h-5 mb-1", getIconColor())} />
        <span className="line-clamp-1 text-center font-medium text-foreground leading-tight">{file.name}</span>
        <span className="text-muted-foreground mt-0.5">{formatFileSize(file.size)}</span>
        
        {/* Индикатор загрузки для не-изображений */}
        {file.isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>
      
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(file.id);
        }}
        className="absolute -right-1 -top-1 bg-background border border-border rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10"
        aria-label="Remove file"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
} 