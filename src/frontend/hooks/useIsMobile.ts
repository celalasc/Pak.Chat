import { useState, useLayoutEffect, useEffect } from 'react';

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

  useEffect(() => {
    // Если уже mounted, ничего не делаем
    if (state.mounted) return;
    
    // Устанавливаем mounted только один раз
    const isMobileDevice = window.innerWidth < breakpoint;
    setState({
      isMobile: isMobileDevice,
      mounted: true
    });
  }, [breakpoint]);

  useLayoutEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < breakpoint;
      setState(prev => ({ ...prev, isMobile: isMobileDevice }));
    };
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return state;
} 