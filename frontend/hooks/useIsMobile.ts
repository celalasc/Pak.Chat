import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < breakpoint;
      setIsMobile(isMobileDevice);
      
      // Устанавливаем mounted только после первой проверки
      if (!mounted) {
        setMounted(true);
      }
    };
    
    // Немедленно проверяем при монтировании
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint, mounted]);

  return { isMobile: mounted ? isMobile : false, mounted };
} 