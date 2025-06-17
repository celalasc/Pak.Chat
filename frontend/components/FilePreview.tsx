"use client";

import { useState } from 'react';
import { X, FileText, File, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  file: {
    id: string;
    name: string;
    type: string;
    size: number;
    preview: string;
    ext: string;
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

  // Для изображений с превью при наведении
  if (file.type.startsWith('image/')) {
    return (
      <div 
        className="relative flex-shrink-0 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <img 
            src={file.preview} 
            className="h-16 w-16 object-cover rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-sm" 
            alt={file.name}
          />
          
          {/* Превью при наведении - показываем выше поля ввода */}
          {showPreview && isHovered && (
            <div className="fixed z-[200] pointer-events-none" style={{
              left: '50%',
              top: '20%',
              transform: 'translateX(-50%)'
            }}>
              <div className="bg-background border border-border rounded-lg shadow-xl p-3">
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-64 h-64 object-cover rounded-lg"
                />
                <div className="mt-2 text-sm text-muted-foreground text-center">
                  <div className="font-medium truncate max-w-64">{file.name}</div>
                  <div>{formatFileSize(file.size)}</div>
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
  
  return (
    <div className="relative flex-shrink-0 group">
      <div className={cn(
        "h-16 w-20 rounded-lg border-2 flex flex-col items-center justify-center text-[10px] px-1 shadow-sm transition-all duration-200 hover:shadow-md",
        getFileColor()
      )}>
        <IconComponent className={cn("w-5 h-5 mb-1", getIconColor())} />
        <span className="line-clamp-1 text-center font-medium text-foreground leading-tight">{file.name}</span>
        <span className="text-muted-foreground mt-0.5">{formatFileSize(file.size)}</span>
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