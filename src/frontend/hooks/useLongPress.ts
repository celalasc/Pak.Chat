import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onCancel?: () => void;
  threshold?: number; // время в миллисекундах для долгого нажатия
  isMobile?: boolean;
  movementThreshold?: number; // пиксели перемещения, после которых считаем жест прокруткой
}

export function useLongPress({
  onLongPress,
  onCancel,
  threshold = 500, // 500ms по умолчанию
  isMobile = false,
  movementThreshold = 8, // по умолчанию 8px допускается до отмены (скролл)
}: UseLongPressOptions) {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preventClickRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const start = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile) return;

    const eventType = event.type;

    // Не вызываем preventDefault на touchstart, чтобы не ломать скролл и нативные жесты
    // Сохраняем стартовые координаты для определения скролла
    if (eventType === 'touchstart') {
      const touch = (event as React.TouchEvent).touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
    }

    if (eventType !== 'touchstart') {
      setIsPressed(true);
    }
    preventClickRef.current = false;
    longPressFiredRef.current = false;

    timeoutRef.current = setTimeout(() => {
      setIsPressed(true);
      longPressFiredRef.current = true;
      onLongPress();
      preventClickRef.current = true;
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

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      preventClickRef.current = false;
      resetTimeoutRef.current = null;
    }, 100);

    if (onCancel && !longPressFiredRef.current) {
      onCancel();
    }
  }, [onCancel]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isMobile) return;
    if (timeoutRef.current == null) return;

    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - (startXRef.current ?? touch.clientX));
    const dy = Math.abs(touch.clientY - (startYRef.current ?? touch.clientY));

    if (dx > movementThreshold || dy > movementThreshold) {
      // Пользователь начал прокрутку — отменяем долгий тап и даем скроллить
      cancel();
    }
  }, [cancel, isMobile, movementThreshold]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (preventClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    startXRef.current = null;
    startYRef.current = null;
    longPressFiredRef.current = false;
  }, []);

  const bind = {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onTouchMove: handleTouchMove,
    onClick: handleClick,
  } as const;

  return {
    bind,
    isPressed,
    cleanup,
  } as const;
}
