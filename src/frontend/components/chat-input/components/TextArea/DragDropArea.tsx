"use client";

import { memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useDragDrop } from '../../hooks/useDragDrop';

interface DragDropAreaProps {
  children: ReactNode;
  messageCount?: number;
  className?: string;
}

export const DragDropArea = memo<DragDropAreaProps>(({ 
  children, 
  messageCount = 0,
  className 
}) => {
  const {
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = useDragDrop();

  return (
    <div 
      className={cn(
        'backdrop-blur-md bg-white dark:bg-secondary p-2 pb-0 max-w-3xl w-full transition-all duration-200 relative',
        messageCount === 0 
          ? 'rounded-[20px] sm:rounded-[28px]' 
          : 'rounded-t-[20px] sm:rounded-t-[28px] border-t border-border/50',
        messageCount === 0 && !isDragOver && 'border border-gray-200 dark:border-white/15',
        'border border-gray-200 dark:border-white/15',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className={cn(
          "absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary",
          messageCount === 0 
            ? 'rounded-[20px] sm:rounded-[28px]' 
            : 'rounded-t-[20px] sm:rounded-t-[28px]'
        )}>
          <div className="text-center p-4">
            <div className="text-primary font-semibold text-lg mb-2">📁 Drop files here</div>
            <div className="text-primary/70 text-sm">Images will be converted to PNG</div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
});

DragDropArea.displayName = 'DragDropArea'; 