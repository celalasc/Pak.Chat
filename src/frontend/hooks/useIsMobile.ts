import { useState, useLayoutEffect, useEffect, useMemo, useCallback } from 'react';

export function useIsMobile(breakpoint: number = 768) {
  // Инициализируем состояние один раз с правильным значением для SSR
  const [state, setState] = useState(() => {
    // На сервере всегда возвращаем немобильное состояние
    if (typeof window === 'undefined') {
      return { isMobile: false, mounted: false };
    }
    
    // Простое определение мобильного устройства по ширине экрана
    // Это позволяет корректно работать при изменении размера окна браузера
    const isMobileDevice = window.innerWidth < breakpoint;
    
    return {
      isMobile: isMobileDevice,
      mounted: true
    };
  });

  // Мемоизируем функцию проверки мобильного устройства
  const checkMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth < breakpoint;
    setState((prev: { isMobile: boolean; mounted: boolean }) => {
      // Обновляем состояние только если оно действительно изменилось
      if (prev.isMobile !== isMobileDevice) {
        return { ...prev, isMobile: isMobileDevice };
      }
      return prev;
    });
  }, [breakpoint]);

  useEffect(() => {
    // Если уже mounted, ничего не делаем
    if (state.mounted) return;
    
    // Устанавливаем mounted только один раз
    const isMobileDevice = window.innerWidth < breakpoint;
    setState({
      isMobile: isMobileDevice,
      mounted: true
    });
  }, [breakpoint, state.mounted]);

  useLayoutEffect(() => {
    // Используем throttled обработчик для уменьшения частоты вызовов
    let ticking = false;
    
    const throttledCheckMobile = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkMobile();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('resize', throttledCheckMobile, { passive: true });
    return () => window.removeEventListener('resize', throttledCheckMobile);
  }, [checkMobile]);

  // Мемоизируем возвращаемое значение
  return useMemo(() => state, [state.isMobile, state.mounted]);
} 