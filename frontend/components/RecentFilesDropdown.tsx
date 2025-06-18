"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, FileIcon, X, Image, FileText, File, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAttachmentsStore } from '../stores/AttachmentsStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface RecentFilesDropdownProps {
  children: React.ReactNode;
  onFileSelect?: (file: File) => void;
  messageCount?: number;
}

// Хранилище для недавних файлов в localStorage
const RECENT_FILES_KEY = 'pak_chat_recent_files';
const MAX_RECENT_FILES = 15;

export default function RecentFilesDropdown({ children, onFileSelect, messageCount = 0 }: RecentFilesDropdownProps) {
  const { add, addRemote } = useAttachmentsStore();
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Мемоизируем отображаемые файлы для предотвращения ререндеров
  const displayedFiles = useMemo(() => 
    recentFiles.slice(0, MAX_RECENT_FILES),
    [recentFiles]
  );

  // Загружаем недавние файлы из localStorage с улучшенной валидацией (F1.4)
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_FILES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        if (!Array.isArray(parsed)) {
          console.warn('Recent files data is not an array, clearing');
          localStorage.removeItem(RECENT_FILES_KEY);
          return;
        }

        // Валидация и очистка данных
        const validFiles = parsed
          .filter((file: any) => {
            // Основная валидация структуры
            if (!file || typeof file !== 'object') return false;
            if (!file.id || !file.name || !file.type || typeof file.size !== 'number') return false;
            
            // Проверка возраста файла (удаляем файлы старше 30 дней)
            const lastUsed = new Date(file.lastUsed);
            const daysDiff = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 30) return false;
            
            // Удаляем недействительные blob URLs
            if (file.preview && file.preview.startsWith('blob:')) {
              file.preview = undefined;
            }
            
            return true;
          })
          .map((file: any) => ({
            ...file,
            lastUsed: new Date(file.lastUsed)
          }))
          .slice(0, MAX_RECENT_FILES); // Ограничиваем количество
        
        setRecentFiles(validFiles);
        
        // Если данные изменились, сохраняем очищенную версию
        if (validFiles.length !== parsed.length) {
          localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(validFiles));
        }
        
      } catch (e) {
        console.error('Failed to parse recent files, clearing corrupt data:', e);
        localStorage.removeItem(RECENT_FILES_KEY);
        setRecentFiles([]);
      }
    }
  }, []);

  const handleFileSelect = useCallback(async (recentFile: RecentFile) => {
    try {
      if (recentFile.storageId) {
        // Build remote attachment object and add to store
        addRemote({
          storageId: recentFile.storageId,
          previewId: recentFile.previewId,
          name: recentFile.name,
          type: recentFile.type,
          size: recentFile.size,
          preview: recentFile.preview ?? undefined,
          remote: true,
        });
        toast.success(`Reattached "${recentFile.name}"`);
      } else {
        toast.info(
          `Cannot reattach "${recentFile.name}" from recent files. Please select the file from your device again.`,
          {
            duration: 5000,
            description: 'This file was stored only as a history entry without data.',
          }
        );
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to handle recent file selection:', error);
      toast.error('An error occurred while handling the recent file selection.');
    }
  }, []);

  const removeFromRecent = useCallback((fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentFiles.filter(f => f.id !== fileId);
    setRecentFiles(updated);
    
    try {
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent files:', e);
    }
  }, [recentFiles]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((date: Date): string => {
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

  const getFileIcon = useCallback((type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf')) return FileText;
    if (type.startsWith('text/')) return FileText;
    return File;
  }, []);

  const getFileColor = useCallback((type: string) => {
    if (type.startsWith('image/')) return 'text-blue-500';
    if (type.includes('pdf')) return 'text-red-500';
    if (type.startsWith('text/')) return 'text-green-500';
    return 'text-muted-foreground';
  }, []);

  const getFileTypeLabel = useCallback((type: string): string => {
    if (type.startsWith('image/')) {
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

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div className="group">
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        side="right"
        className="w-64 max-h-80 overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 scrollbar-thumb-rounded-full bg-popover/95 backdrop-blur-sm shadow-lg rounded-xl border-border"
        sideOffset={8}
        alignOffset={0}
      >
        {displayedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent files</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">
              <Clock className="w-3 h-3" />
              Recent Files
            </div>
            {displayedFiles.map((file) => {
              const IconComponent = getFileIcon(file.type);
              const iconColor = getFileColor(file.type);
              const fileTypeLabel = getFileTypeLabel(file.type);
              
              return (
                <DropdownMenuItem
                  key={file.id}
                  className="flex items-center gap-3 p-3 cursor-pointer focus:bg-accent group rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
                  onClick={() => handleFileSelect(file)}
                >
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 bg-muted rounded-xl border border-border flex flex-col items-center justify-center relative">
                      <IconComponent className={cn("w-5 h-5", iconColor)} />
                      {/* Тип файла */}
                      <div className="absolute -bottom-1 -right-1 bg-background border border-border rounded px-1 text-[10px] font-medium text-muted-foreground">
                        {fileTypeLabel}
                      </div>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate pr-2">{file.name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 w-6 h-6 flex-shrink-0 hover:scale-110"
                        onClick={(e) => removeFromRecent(file.id, e)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.lastUsed)}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Утильная функция для добавления файла в recent (F1.3 + F1.4)
export function addFileToRecent(file: File): boolean {
  try {
    // Валидация входного файла
    if (!file || !file.name || !file.type) {
      console.warn('Invalid file provided to addFileToRecent');
      return false;
    }

    // Исключаем рисунки из recent files (они основаны на blob URLs и не могут быть переиспользованы)
    if (file.name.startsWith('drawing-') && file.name.endsWith('.png')) {
      console.log('Skipping drawing file from recent files:', file.name);
      return true; // Возвращаем true чтобы не показывать ошибку
    }

    // Проверка размера файла (максимум 100MB для хранения метаданных)
    if (file.size > 100 * 1024 * 1024) {
      console.warn('File too large to add to recent:', file.name);
      return false;
    }

    const recentFile: RecentFile = {
      id: Date.now().toString(),
      name: file.name,
      type: file.type,
      size: file.size,
      lastUsed: new Date(),
      // preview and storageId will be filled later via addUploadedFileToRecent
    };

    const saved = localStorage.getItem(RECENT_FILES_KEY);
    let recentFiles: RecentFile[] = [];
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Валидация загруженных данных
        if (Array.isArray(parsed)) {
          recentFiles = parsed.filter(item => 
            item && 
            typeof item.id === 'string' && 
            typeof item.name === 'string' && 
            typeof item.type === 'string' &&
            typeof item.size === 'number'
          ).map(item => ({
            ...item,
            lastUsed: new Date(item.lastUsed) // Конвертируем строку обратно в Date
          }));
        }
      } catch (e) {
        console.error('Failed to parse recent files, clearing corrupt data:', e);
        recentFiles = [];
        // Очищаем поврежденные данные
        localStorage.removeItem(RECENT_FILES_KEY);
      }
    }

    // Удаляем дубликаты по имени и типу
    const filtered = recentFiles.filter(f => !(f.name === file.name && f.type === file.type));
    const updated = [recentFile, ...filtered].slice(0, MAX_RECENT_FILES);
    
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
    return true;
    
  } catch (e) {
    console.error('Failed to add file to recent:', e);
    return false;
  }
}

// Хук для интеграции с AttachmentsStore
// УДАЛЕНО: автоматическое добавление файлов в recent при прикреплении
// Теперь файлы добавляются в recent ТОЛЬКО после успешной отправки сообщения
export function useRecentFilesIntegration() {
  // Пустая функция - автоматическое добавление отключено
  // Файлы будут добавляться в recent вручную после успешной отправки через addFileToRecent()
}

// Called after successful upload to Convex to enrich recent entry with storageId etc.
export function addUploadedFileMetaToRecent(meta: { storageId: string; previewId?: string; name: string; type: string; size: number; previewUrl?: string; }) {
  try {
    const saved = localStorage.getItem(RECENT_FILES_KEY);
    if (!saved) return;
    const parsed: RecentFile[] = JSON.parse(saved);
    const idx = parsed.findIndex(r => r.name === meta.name && r.type === meta.type && !r.storageId);
    const base: RecentFile = {
      id: Date.now().toString(),
      name: meta.name,
      type: meta.type,
      size: meta.size,
      lastUsed: new Date(),
      storageId: meta.storageId,
      previewId: meta.previewId,
      preview: meta.previewUrl,
    };
    if (idx !== -1) {
      parsed[idx] = { ...parsed[idx], ...base };
    } else {
      parsed.unshift(base);
    }
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(parsed.slice(0, MAX_RECENT_FILES)));
  } catch (e) {
    console.error('Failed to add uploaded file meta to recent:', e);
  }
} 