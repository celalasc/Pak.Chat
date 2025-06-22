import { useCallback, useRef } from 'react';

interface RippleEffectOptions {
  color?: string;
  duration?: number;
  disabled?: boolean;
  forceEnable?: boolean; // Принудительно включить эффект
}

// Проверяем, является ли размер экрана мобильным
const isMobileScreenSize = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768; // Мобильный размер экрана
};

// Проверяем, поддерживает ли устройство touch события
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const useRippleEffect = (options: RippleEffectOptions = {}) => {
  const {
    color = 'rgba(0, 0, 0, 0.1)',
    duration = 300,
    disabled = false,
    forceEnable = false
  } = options;

  const createRipple = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    
    // Показываем ripple эффект если:
    // 1. Принудительно включен, ИЛИ
    // 2. Мобильный размер экрана (независимо от устройства), ИЛИ  
    // 3. Touch устройство
    const shouldShowRipple = forceEnable || isMobileScreenSize() || isTouchDevice();
    
    if (!shouldShowRipple) return;

    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    
    // Получаем координаты касания
    let clientX: number, clientY: number;
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      // Fallback к центру элемента
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Размер ripple - должен покрывать весь элемент
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;

    // Создаем ripple элемент
    const ripple = document.createElement('span');
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = `ripple ${duration}ms linear`;
    ripple.style.backgroundColor = color;
    ripple.style.pointerEvents = 'none';
    ripple.style.left = `${x - radius}px`;
    ripple.style.top = `${y - radius}px`;
    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;

    // Убеждаемся, что элемент имеет relative позицию
    const originalPosition = getComputedStyle(element).position;
    if (originalPosition === 'static') {
      element.style.position = 'relative';
    }
    element.style.overflow = 'hidden';

    // Добавляем ripple
    element.appendChild(ripple);

    // Удаляем ripple после анимации
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, duration);
  }, [color, duration, disabled, forceEnable]);

  const getRippleProps = useCallback((enableForThisElement = false) => ({
    onTouchStart: createRipple,
    onMouseDown: createRipple,
    style: {
      position: 'relative' as const,
      overflow: 'hidden' as const,
    }
  }), [createRipple]);

  return { createRipple, getRippleProps, isMobileScreenSize: isMobileScreenSize() };
};

// CSS для анимации (нужно добавить в глобальные стили)
export const rippleKeyframes = `
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }
`; 