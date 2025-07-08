"use client";

import { useState, useCallback } from 'react';
import { Sparkles, Download, Copy, RotateCcw, GitBranch, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import ImageModal from './ImageModal';
import { cn } from '@/lib/utils';

interface GeneratedImage {
  id: string;
  result: string; // base64 image data
}

interface AIImageGenerationProps {
  prompt: string;
  images: GeneratedImage[];
  params: {
    size: string;
    quality: string;
    count: number;
    format: string;
  };
  isGenerating?: boolean;
  isStopped?: boolean; // Флаг для остановленной генерации
  onRegenerate?: () => void;
  onNewBranch?: () => void;
  className?: string;
  disableImageClick?: boolean; // Отключить клик по изображениям (для превью)
}

export default function AIImageGeneration({
  prompt,
  images,
  params,
  isGenerating = false,
  isStopped = false,
  onRegenerate,
  onNewBranch,
  className,
  disableImageClick = false,
}: AIImageGenerationProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = useCallback(async (imageData: string) => {
    try {
      // Clipboard API поддерживает только PNG, конвертируем все форматы в PNG
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Определяем исходный MIME тип
      const sourceMimeType = params.format === 'webp' ? 'image/webp' : 
                           params.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((convertedBlob) => {
              if (convertedBlob) {
                resolve(convertedBlob);
              } else {
                reject(new Error('Failed to convert image to PNG'));
              }
            }, 'image/png');
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = `data:${sourceMimeType};base64,${imageData}`;
      });
      
      // Copy to clipboard - всегда используем PNG
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      
      // Показываем галочку вместо всплывашки
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy image:', error);
      // Показываем всплывашку только при ошибке
      toast.error('Failed to copy image to clipboard');
    }
  }, [params.format]);

  const handleDownload = useCallback((imageData: string, index: number) => {
    try {
      // Get the correct MIME type and extension based on format
      const getFormatInfo = (format: string) => {
        switch (format) {
          case 'jpeg':
            return { mimeType: 'image/jpeg', extension: 'jpg' };
          case 'webp':
            return { mimeType: 'image/webp', extension: 'webp' };
          case 'png':
          default:
            return { mimeType: 'image/png', extension: 'png' };
        }
      };

      const { mimeType, extension } = getFormatInfo(params.format);
      
      const link = document.createElement('a');
      link.href = `data:${mimeType};base64,${imageData}`;
      link.download = `generated-image-${Date.now()}-${index + 1}.${extension}`;
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      // Убираем всплывашку при успешном скачивании
    } catch (error) {
      console.error('Failed to download image:', error);
      // Показываем всплывашку только при ошибке
      toast.error('Failed to download image');
    }
  }, [params.format]);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  if (isGenerating || isStopped) {
    return (
      <div className={cn('w-full max-w-2xl group', className)}>
        <div className="aspect-square flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border/50 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-slate-800/20 dark:to-slate-700/20 min-h-[300px]">
          <div className="relative mb-4">
            <div className={cn(
              "w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full",
              isGenerating && "animate-spin"
            )}></div>
            <Sparkles className={cn(
              "w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary",
              isGenerating && "animate-pulse"
            )} />
          </div>
          
          {isStopped ? (
            <span className="text-sm text-muted-foreground">Stopped</span>
          ) : (
            <span className="text-sm text-muted-foreground">Generating...</span>
          )}
        </div>
        
        {/* Кнопки при hover даже для остановленной генерации */}
        {isStopped && (
          <div className="transition-opacity duration-100 flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100">
            {onRegenerate && (
              <Button variant="ghost" size="icon" onClick={onRegenerate}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            
            {onNewBranch && (
              <Button variant="ghost" size="icon" onClick={onNewBranch}>
                <GitBranch className="w-4 h-4" />
              </Button>
            )}

            {/* Model label */}
            <span className="text-[10px] text-muted-foreground ml-2">
              GPT Image Gen
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-2xl group', className)}>
      <div className="relative p-4 rounded-2xl border border-border/60 bg-gradient-to-br from-blue-50/10 to-purple-50/10 dark:from-slate-800/10 dark:to-slate-700/10">
        {/* Header с качеством и разрешением */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Generated Images</h3>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{params.size}</span>
            <span>•</span>
            <span>{params.quality === 'high' ? 'HD' : 
                   params.quality === 'low' ? 'Low' :
                   params.quality === 'medium' ? 'Standard' : 
                   params.quality || 'Standard'}</span>
          </div>
        </div>

        {/* Images Grid - адаптивный под количество */}
        <div className={cn(
          'grid gap-3',
          images.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2',
          images.length === 3 ? 'grid-rows-2' : ''
        )}>
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                "relative rounded-lg overflow-hidden border border-border/30 hover:border-border/60 transition-all hover:shadow-md aspect-square",
                images.length === 3 && index === 2 ? 'col-start-1 row-start-2' : '',
                disableImageClick ? '' : 'cursor-pointer'
              )}
              onClick={disableImageClick ? undefined : () => handleImageClick(index)}
            >
              <img
                src={`data:image/png;base64,${image.result}`}
                alt={`Generated image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Кнопки СНИЗУ под компонентом - только для готовых изображений */}
      <div className="transition-opacity duration-100 flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100">
        <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(images[0]?.result)}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
        
        <Button variant="ghost" size="icon" onClick={() => handleDownload(images[0]?.result, 0)}>
          <Download className="w-4 h-4" />
        </Button>
        
        {onRegenerate && (
          <Button variant="ghost" size="icon" onClick={onRegenerate}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
        
        {onNewBranch && (
          <Button variant="ghost" size="icon" onClick={onNewBranch}>
            <GitBranch className="w-4 h-4" />
          </Button>
        )}

        {/* Model label */}
        <span className="text-[10px] text-muted-foreground ml-2">
          GPT Image Gen
        </span>
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && (() => {
        const getFormatInfo = (format: string) => {
          switch (format) {
            case 'jpeg':
              return { mimeType: 'image/jpeg', extension: 'jpg' };
            case 'webp':
              return { mimeType: 'image/webp', extension: 'webp' };
            case 'png':
            default:
              return { mimeType: 'image/png', extension: 'png' };
          }
        };

        const { mimeType, extension } = getFormatInfo(params.format);
        
        return (
          <ImageModal
            isOpen={true}
            onClose={handleCloseModal}
            imageUrl={`data:${mimeType};base64,${images[selectedImageIndex]?.result}`}
            fileName={`generated-image-${selectedImageIndex + 1}.${extension}`}
            fileType={mimeType}
          />
        );
      })()}
    </div>
  );
} 