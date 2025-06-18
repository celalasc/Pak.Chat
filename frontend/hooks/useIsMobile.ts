import { useState, useLayoutEffect } from 'react';

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < breakpoint;
      setIsMobile(isMobileDevice);
      
      if (!mounted) setMounted(true);
    };
    
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint, mounted]);

  return { isMobile: mounted ? isMobile : false, mounted };
} 