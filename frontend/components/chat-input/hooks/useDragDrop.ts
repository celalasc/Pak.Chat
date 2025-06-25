import { useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { convertImageToPng } from '../utils/imageConversion';

export const useDragDrop = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Обработчики для drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter <= 0) {
        setIsDragOver(false);
        return 0;
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      const imageFiles: File[] = [];

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          try {
            // Конвертируем в PNG
            const pngFile = await convertImageToPng(file);
            imageFiles.push(pngFile);
          } catch (error) {
            console.error('Failed to convert dropped image to PNG:', error);
            toast.error(`Failed to process ${file.name}`);
          }
        } else {
          // Для не-изображений добавляем как есть
          imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        const { add } = useAttachmentsStore.getState();
        imageFiles.forEach(file => {
          add(file);
        });

        // Показываем уведомление
        if (imageFiles.length === 1) {
          toast.success('File added successfully');
        } else {
          toast.success(`${imageFiles.length} files added successfully`);
        }
      }
    },
    []
  );

  // Глобальный обработчик для сброса drag состояния
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDragOver(false);
      setDragCounter(0);
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      // Если курсор покинул окно браузера
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragOver(false);
        setDragCounter(0);
      }
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('dragleave', handleGlobalDragLeave);

    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
    };
  }, []);

  return {
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}; 