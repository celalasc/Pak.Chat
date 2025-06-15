import { useState, useEffect, useCallback, RefObject } from 'react';

/**
 * Options for {@link useScrollHide}.
 *
 * @template T Element type for the panel reference.
 */
interface UseScrollHideOptions<T extends HTMLElement = HTMLElement> {
  /** Minimum scroll difference before the panel reacts. */
  threshold?: number;
  /** Hides the panel when scrolling down if `true`. */
  hideOnScrollDown?: boolean;
  /** Shows the panel when scrolling up if `true`. */
  showOnScrollUp?: boolean;
  /** Optional ref to the panel element that moves with the scroll. */
  panelRef?: RefObject<T | null>;
}

export function useScrollHide<T extends HTMLElement = HTMLElement>({
  threshold = 10,
  hideOnScrollDown = true,
  showOnScrollUp = true,
  panelRef,
}: UseScrollHideOptions<T> = {}) {
  const [isVisible, setIsVisible] = useState(true);
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
      setIsVisible(true);
      setLastScrollY(currentScrollY);
      return;
    }

    if (currentScrollY > lastScrollY && hideOnScrollDown) {
      // Прокрутка вниз - скрываем
      setIsVisible(false);
      if (panelRef?.current) {
        const max = panelRef.current.offsetWidth - 48;
        const delta = Math.min(currentScrollY - lastScrollY, max);
        panelRef.current.style.transform = `translateX(${delta}px)`;
      }
    } else if (currentScrollY < lastScrollY && showOnScrollUp) {
      // Прокрутка вверх - показываем
      setIsVisible(true);
      if (panelRef?.current) {
        panelRef.current.style.transform = 'translateX(0)';
      }
    }

    setLastScrollY(currentScrollY);
  }, [lastScrollY, threshold, hideOnScrollDown, showOnScrollUp, panelRef]);

  useEffect(() => {
    // Инициализируем начальную позицию
    setLastScrollY(window.scrollY);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return isVisible;
} 