import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onCancel?: () => void;
  threshold?: number; // время в миллисекундах для долгого нажатия
  isMobile?: boolean;
}

export function useLongPress({
  onLongPress,
  onCancel,
  threshold = 500, // 500ms по умолчанию
  isMobile = false,
}: UseLongPressOptions) {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preventClickRef = useRef(false);

  const start = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile) return;
    
    // Предотвращаем выделение текста при долгом нажатии только для touch событий
    if (event.type === 'touchstart') {
      event.preventDefault();
    }
    
    setIsPressed(true);
    preventClickRef.current = false;
    
    timeoutRef.current = setTimeout(() => {
      onLongPress();
      preventClickRef.current = true;
      setIsPressed(false);
      
      // Добавляем небольшую вибрацию для обратной связи (если поддерживается)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, threshold);
  }, [onLongPress, threshold, isMobile]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPressed(false);
    
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (preventClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const bind = {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onTouchMove: cancel,
    onClick: handleClick,
  };

  return {
    bind,
    isPressed,
  };
}
