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
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile) return;
    
    // Сохраняем тип события для использования в таймауте
    const eventType = event.type;
    
    // Предотвращаем выделение текста при долгом нажатии только для touch событий
    if (eventType === 'touchstart') {
      event.preventDefault();
    }
    
    // Не устанавливаем isPressed сразу для touch событий
    if (eventType !== 'touchstart') {
      setIsPressed(true);
    }
    // Сбрасываем флаг только при начале нового взаимодействия
    preventClickRef.current = false;
    
    timeoutRef.current = setTimeout(() => {
      if (eventType === 'touchstart') {
        setIsPressed(true);
      }
      onLongPress();
      preventClickRef.current = true;
      // НЕ сбрасываем isPressed здесь - пусть cancel() это сделает
      
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
    
    // Очищаем предыдущий reset таймаут если он есть
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    
    setIsPressed(false);
    
    // Добавляем задержку для сброса флага, чтобы избежать race condition
    // между onTouchEnd и onClick
    resetTimeoutRef.current = setTimeout(() => {
      preventClickRef.current = false;
      resetTimeoutRef.current = null;
    }, 100);
    
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (preventClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }, []);

  // Cleanup функция для очистки таймаутов
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
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
    cleanup,
  };
}
