import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { convertImageToPng } from '../utils/imageConversion';

export const useImagePaste = () => {
  // Обработчик вставки изображений из буфера обмена
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Сначала проверяем, есть ли вообще изображения в буфере
      let hasImages = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          hasImages = true;
          break;
        }
      }

      // Если изображений нет, позволяем стандартной вставке текста продолжиться
      if (!hasImages) {
        return;
      }

      // Если есть изображения, предотвращаем стандартное поведение
      e.preventDefault();

      const imageFiles: File[] = [];
      
      // Обрабатываем каждое изображение
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            try {
              // Конвертируем в PNG
              const pngFile = await convertImageToPng(file);
              imageFiles.push(pngFile);
            } catch (error) {
              console.error('Failed to convert image to PNG:', error);
              toast.error('Failed to process pasted image');
            }
          }
        }
      }

      // Добавляем изображения в store
      if (imageFiles.length > 0) {
        const { add } = useAttachmentsStore.getState();
        imageFiles.forEach(file => {
          add(file);
        });

        // Показываем уведомление
        if (imageFiles.length === 1) {
          toast.success('Image pasted successfully');
        } else {
          toast.success(`${imageFiles.length} images pasted successfully`);
        }
      }
    },
    []
  );

  return { handlePaste };
}; 