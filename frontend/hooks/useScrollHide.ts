import { useEffect, useCallback, useRef } from 'react';

interface UseScrollHideOptions {
  threshold?: number;
  hideOnScrollDown?: boolean;
  showOnScrollUp?: boolean;
}

export function useScrollHideRef({
  threshold = 10,
  hideOnScrollDown = true,
  showOnScrollUp = true,
}: UseScrollHideOptions = {}) {
  // ref holding the hidden state
  const hiddenRef = useRef(false);
  // store last scroll position
  const lastScrollYRef = useRef(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDifference = Math.abs(currentScrollY - lastScrollYRef.current);

    // Если прокрутка слишком мала, игнорируем
    if (scrollDifference < threshold) {
      return;
    }

    // Если мы в самом верху страницы, всегда показываем элементы
    if (currentScrollY <= 50) {
      hiddenRef.current = false;
      lastScrollYRef.current = currentScrollY;
      return;
    }

    if (currentScrollY > lastScrollYRef.current && hideOnScrollDown) {
      // Прокрутка вниз - скрываем элементы
      hiddenRef.current = true;
    } else if (currentScrollY < lastScrollYRef.current && showOnScrollUp) {
      // Прокрутка вверх - показываем элементы
      hiddenRef.current = false;
    }

    lastScrollYRef.current = currentScrollY;
  }, [threshold, hideOnScrollDown, showOnScrollUp]);

  useEffect(() => {
    // Инициализируем начальную позицию
    lastScrollYRef.current = window.scrollY;
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return hiddenRef;
}
