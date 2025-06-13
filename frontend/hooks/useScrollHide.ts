import { useState, useEffect, useCallback } from 'react';

interface UseScrollHideOptions {
  threshold?: number;
  hideOnScrollDown?: boolean;
  showOnScrollUp?: boolean;
}

export function useScrollHide({
  threshold = 10,
  hideOnScrollDown = true,
  showOnScrollUp = true,
}: UseScrollHideOptions = {}) {
  // true when the header should be hidden
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDifference = Math.abs(currentScrollY - lastScrollY);

    // Если прокрутка слишком мала, игнорируем
    if (scrollDifference < threshold) {
      return;
    }

    // Если мы в самом верху страницы, всегда показываем элементы
    if (currentScrollY <= 50) {
      setHidden(false);
      setLastScrollY(currentScrollY);
      return;
    }

    if (currentScrollY > lastScrollY && hideOnScrollDown) {
      // Прокрутка вниз - скрываем элементы
      setHidden(true);
    } else if (currentScrollY < lastScrollY && showOnScrollUp) {
      // Прокрутка вверх - показываем элементы
      setHidden(false);
    }

    setLastScrollY(currentScrollY);
  }, [lastScrollY, threshold, hideOnScrollDown, showOnScrollUp]);

  useEffect(() => {
    // Инициализируем начальную позицию
    setLastScrollY(window.scrollY);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return hidden;
} 