"use client";

import { useCallback, useState } from 'react';
import { Plus, FileIcon, Clock, Brush, Sparkles, ArrowLeft } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '../ui/button';
import { useRippleEffect } from '../../hooks/useRippleEffect';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Импортируем компоненты из RecentFilesDropdown
import { useState as useRecentState, useEffect, useMemo, useCallback as useRecentCallback } from 'react';
import { useAttachmentsStore } from '../../stores/AttachmentsStore';
import { Image, FileText, File } from 'lucide-react';

interface MobileAddActionsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFileClick: () => void;
  onDrawingClick: () => void;
  onImageGenerationToggle: () => void;
  isImageGenerationMode: boolean;
  children: React.ReactNode;
  className?: string;
  messageCount?: number;
}

type ViewMode = 'main' | 'recent';

// Типы для Recent файлов (скопированы из RecentFilesDropdown)
interface RecentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastUsed: Date;
  preview?: string;
  storageId?: string;
  previewId?: string;
}

const RECENT_FILES_KEY = 'pak_chat_recent_files';
const MAX_RECENT_FILES = 15;

export default function MobileAddActionsDrawer({
  isOpen,
  onOpenChange,
  onFileClick,
  onDrawingClick,
  onImageGenerationToggle,
  isImageGenerationMode,
  children,
  className,
  messageCount = 0
}: MobileAddActionsDrawerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [recentFiles, setRecentFiles] = useRecentState<RecentFile[]>([]);
  const { addRemote } = useAttachmentsStore();
  const { isMobile } = useIsMobile();
  
  // Ripple эффект с темным цветом для светлых кнопок
  const { createRipple } = useRippleEffect({ color: 'rgba(0, 0, 0, 0.1)' });

  // Загружаем недавние файлы из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_FILES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validFiles = parsed
            .filter((file: any) => {
              if (!file || typeof file !== 'object') return false;
              if (!file.id || !file.name || !file.type || typeof file.size !== 'number') return false;
              
              if (file.name.startsWith('drawing-') && file.name.endsWith('.png') && !file.storageId) {
                return false;
              }
              
              const lastUsed = new Date(file.lastUsed);
              const daysDiff = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff > 30) return false;
              
              if (file.preview && file.preview.startsWith('blob:')) {
                file.preview = undefined;
              }
              
              return true;
            })
            .map((file: any) => ({
              ...file,
              lastUsed: new Date(file.lastUsed)
            }))
            .slice(0, MAX_RECENT_FILES);
          
          setRecentFiles(validFiles);
        }
      } catch (e) {
        console.error('Failed to parse recent files:', e);
        setRecentFiles([]);
      }
    }
  }, []);

  const displayedFiles = useMemo(() => 
    recentFiles.slice(0, MAX_RECENT_FILES),
    [recentFiles]
  );

  // Event handlers with ripple effect
  const handleAddFile = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    createRipple(event);
    onFileClick();
    onOpenChange(false);
  }, [createRipple, onFileClick, onOpenChange]);

  const handleRecent = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    createRipple(event);
    setViewMode('recent');
  }, [createRipple]);

  const handleDraw = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    createRipple(event);
    onDrawingClick();
    onOpenChange(false);
  }, [createRipple, onDrawingClick, onOpenChange]);

  const handleGenerateImage = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    createRipple(event);
    onImageGenerationToggle();
    onOpenChange(false);
  }, [createRipple, onImageGenerationToggle, onOpenChange]);

  const handleBackToMain = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    createRipple(event);
    setViewMode('main');
  }, [createRipple]);

  const handleAttachFile = useRecentCallback(async (event: React.TouchEvent | React.MouseEvent, file: RecentFile) => {
    createRipple(event);
    try {
      if (file.storageId) {
        // Формируем корректный preview URL для изображений
        let previewUrl = '';
        
        if (file.type.startsWith('image/')) {
          // Приоритет: previewId > storageId
          if (file.previewId) {
            previewUrl = `/api/files/${file.previewId}`;
          } else if (file.storageId) {
            previewUrl = `/api/files/${file.storageId}`;
          }
          
          // Если ни previewId, ни storageId нет, это ошибка для изображений
          if (!previewUrl) {
            console.warn('No valid preview URL for image file:', file.name);
            toast.error(`Cannot display preview for "${file.name}"`);
            return;
          }
        }
        // Для не-изображений preview URL не нужен
        
        addRemote({
          storageId: file.storageId,
          previewId: file.previewId,
          name: file.name,
          type: file.type,
          size: file.size,
          preview: previewUrl || file.preview || '',
          remote: true,
        });
        
        const updated = recentFiles.map(f => 
          f.id === file.id 
            ? { ...f, lastUsed: new Date() } 
            : f
        ).sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
        
        setRecentFiles(updated);
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
        
        onOpenChange(false);
        toast.success(`Reattached "${file.name}"`);
      } else {
        toast.info(
          `Cannot reattach "${file.name}" from recent files. Please select the file from your device again.`,
          {
            duration: 5000,
            description: 'This file was stored only as a history entry without data.',
          }
        );
      }
    } catch (error) {
      console.error('Error attaching file:', error);
      toast.error('An error occurred while attaching the file.');
    }
  }, [createRipple, recentFiles, addRemote, onOpenChange]);

  // Сброс viewMode при закрытии
  const handleOpenChange = useCallback((open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setViewMode('main');
    }
  }, [onOpenChange]);

  const getFileIcon = useRecentCallback((type: string, name?: string) => {
    if (type.startsWith('image/')) {
      if (name?.startsWith('drawing-') && name.endsWith('.png')) {
        return Brush;
      }
      return Image;
    }
    if (type.includes('pdf')) return FileText;
    if (type.startsWith('text/')) return FileText;
    return File;
  }, []);

  const getFileColor = useRecentCallback((type: string, name?: string) => {
    if (type.startsWith('image/')) {
      if (name?.startsWith('drawing-') && name.endsWith('.png')) {
        return 'text-purple-500';
      }
      return 'text-blue-500';
    }
    if (type.includes('pdf')) return 'text-red-500';
    if (type.startsWith('text/')) return 'text-green-500';
    return 'text-muted-foreground';
  }, []);

  const getFileTypeLabel = useRecentCallback((type: string, name?: string): string => {
    if (type.startsWith('image/')) {
      if (name?.startsWith('drawing-') && name.endsWith('.png')) {
        return 'DRAW';
      }
      const subType = type.split('/')[1]?.toUpperCase();
      return subType || 'IMAGE';
    }
    if (type.includes('pdf')) return 'PDF';
    if (type.startsWith('text/')) return 'TEXT';
    if (type.includes('json')) return 'JSON';
    if (type.includes('xml')) return 'XML';
    if (type.includes('csv')) return 'CSV';
    if (type.includes('javascript')) return 'JS';
    if (type.includes('typescript')) return 'TS';
    if (type.includes('python')) return 'PY';
    if (type.includes('java')) return 'JAVA';
    if (type.includes('cpp') || type.includes('c++')) return 'C++';
    if (type.includes('csharp')) return 'C#';
    return 'FILE';
  }, []);

  const formatDate = useRecentCallback((date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }, []);



  return (
    <Drawer 
      open={isOpen} 
      onOpenChange={handleOpenChange}
      shouldScaleBackground={false}
      dismissible={true}
      modal={true}
      snapPoints={[1]}
      fadeFromIndex={0}
      closeThreshold={0.5}
    >
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[70vh] flex flex-col">
        {/* Hidden title for accessibility */}
        <DrawerHeader className="sr-only">
          <DrawerTitle>
            {viewMode === 'main' ? 'Add Content Options' : 'Recent Files'}
          </DrawerTitle>
        </DrawerHeader>
        
                 {/* Header with back button */}
         {viewMode === 'recent' && (
           <div className="flex items-center gap-3 px-4 py-2 border-b border-border/20">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToMain}
              className={cn(
                "w-8 h-8 relative overflow-hidden",
                isMobile && "mobile-touch-item"
              )}
            >
               <ArrowLeft className="w-4 h-4" />
             </Button>
             <h3 className="text-lg font-semibold">Recent Files</h3>
           </div>
         )}
        
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
          {viewMode === 'main' ? (
            <div className="px-4 py-4 space-y-2">
              <div 
                onClick={handleAddFile}
                onTouchStart={handleAddFile}
                onMouseDown={handleAddFile}
                className={cn(
                  "flex items-center gap-3 cursor-pointer transition-colors p-4 rounded-lg relative overflow-hidden",
                  isMobile ? "mobile-touch-item active:bg-accent/80" : "hover:bg-accent"
                )}
              >
                <FileIcon className="w-5 h-5" />
                <span className="text-base">Add file</span>
              </div>
              
              <div 
                onClick={handleRecent}
                onTouchStart={handleRecent}
                onMouseDown={handleRecent}
                className={cn(
                  "flex items-center gap-3 cursor-pointer transition-colors p-4 rounded-lg relative overflow-hidden",
                  isMobile ? "mobile-touch-item active:bg-accent/80" : "hover:bg-accent"
                )}
              >
                <Clock className="w-5 h-5" />
                <span className="text-base">Recent</span>
              </div>
              
              <div 
                onClick={handleDraw}
                onTouchStart={handleDraw}
                onMouseDown={handleDraw}
                className={cn(
                  "flex items-center gap-3 cursor-pointer transition-colors p-4 rounded-lg relative overflow-hidden",
                  isMobile ? "mobile-touch-item active:bg-accent/80" : "hover:bg-accent"
                )}
              >
                <Brush className="w-5 h-5" />
                <span className="text-base">Draw</span>
              </div>
              
              <div 
                onClick={handleGenerateImage}
                onTouchStart={handleGenerateImage}
                onMouseDown={handleGenerateImage}
                className={cn(
                  "flex items-center gap-3 cursor-pointer transition-colors p-4 rounded-lg relative overflow-hidden",
                  isMobile ? "mobile-touch-item active:bg-accent/80" : "hover:bg-accent"
                )}
              >
                <Sparkles className="w-5 h-5" />
                <span className="text-base">
                  {isImageGenerationMode ? 'Exit Image Mode' : 'Generate Image'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {displayedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-base text-muted-foreground">No recent files</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedFiles.map((file) => {
                    const IconComponent = getFileIcon(file.type, file.name);
                    const iconColor = getFileColor(file.type, file.name);
                    const fileTypeLabel = getFileTypeLabel(file.type, file.name);
                    
                    return (
                      <div
                        key={file.id}
                        className={cn(
                          "flex items-center gap-3 cursor-pointer group rounded-xl transition-all duration-200 p-4 relative overflow-hidden",
                          isMobile ? "mobile-touch-item active:bg-accent/80" : "hover:bg-accent active:scale-[0.98]"
                        )}
                        onClick={(event) => handleAttachFile(event, file)}
                        onTouchStart={(event) => handleAttachFile(event, file)}
                        onMouseDown={(event) => handleAttachFile(event, file)}
                      >
                        {/* File Icon/Preview */}
                        <div className="flex-shrink-0 relative">
                          <div className="bg-muted rounded-xl border border-border flex flex-col items-center justify-center relative w-12 h-12">
                            <IconComponent className={cn("w-6 h-6", iconColor)} />
                            {/* Тип файла */}
                            <div className="absolute -bottom-1 -right-1 bg-background border border-border rounded px-1 text-[10px] font-medium text-muted-foreground">
                              {fileTypeLabel}
                            </div>
                          </div>
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-base truncate">{file.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {formatDate(file.lastUsed)} • {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
} 