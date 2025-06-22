"use client";

import { useState, useCallback } from 'react';
import { Sparkles, Download, Copy, RotateCcw, GitBranch, X } from 'lucide-react';
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
  };
  isGenerating?: boolean;
  onRegenerate?: () => void;
  onNewBranch?: () => void;
  className?: string;
}

export default function AIImageGeneration({
  prompt,
  images,
  params,
  isGenerating = false,
  onRegenerate,
  onNewBranch,
  className,
}: AIImageGenerationProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopyToClipboard = useCallback(async (imageData: string) => {
    try {
      // Convert base64 to blob
      const response = await fetch(`data:image/png;base64,${imageData}`);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      
      toast.success('Image copied to clipboard');
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast.error('Failed to copy image to clipboard');
    }
  }, []);

  const handleDownload = useCallback((imageData: string, index: number) => {
    try {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${imageData}`;
      link.download = `generated-image-${Date.now()}-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error('Failed to download image');
    }
  }, []);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  if (isGenerating) {
    return (
      <div className={cn(
        'w-full max-w-md mx-auto',
        className
      )}>
        <div className="aspect-square flex items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border/50 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-slate-800/20 dark:to-slate-700/20 min-h-[300px]">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <Sparkles className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <div 
        className="relative p-4 rounded-2xl border border-border/60 bg-gradient-to-br from-blue-50/10 to-purple-50/10 dark:from-slate-800/10 dark:to-slate-700/10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header с качеством и разрешением */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Generated Images</h3>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{params.size}</span>
            <span>•</span>
            <span>{params.quality === 'high' ? 'HD' : 'Standard'}</span>
          </div>
        </div>

        {/* Images Grid - адаптивный под количество */}
        <div className={cn(
          'grid gap-3',
          images.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2',
          images.length === 3 ? 'grid-rows-2' : ''
        )}>
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                "relative group cursor-pointer rounded-lg overflow-hidden border border-border/30 hover:border-border/60 transition-all hover:shadow-md aspect-square",
                images.length === 3 && index === 2 ? 'col-start-1 row-start-2' : ''
              )}
              onClick={() => handleImageClick(index)}
            >
              <img
                src={`data:image/png;base64,${image.result}`}
                alt={`Generated image ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-medium">
                  View
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Кнопки СНИЗУ под компонентом - только при hover */}
      {isHovered && (
        <div className="flex items-center gap-1 mt-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(images[0]?.result)}>
            <Copy className="w-4 h-4" />
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
      )}

      {/* Image Modal */}
      {selectedImageIndex !== null && (
        <ImageModal
          isOpen={true}
          onClose={handleCloseModal}
          imageUrl={`data:image/png;base64,${images[selectedImageIndex]?.result}`}
          fileName={`generated-image-${selectedImageIndex + 1}.png`}
          fileType="image/png"
        />
      )}
    </div>
  );
} 