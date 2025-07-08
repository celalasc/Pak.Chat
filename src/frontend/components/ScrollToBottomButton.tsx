"use client";

import { Button } from '@/frontend/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState, RefObject } from 'react';

export type ScrollToBottomButtonProps = {
  className?: string;
  threshold?: number;
  scrollContainerRef: RefObject<HTMLElement | null>;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function ScrollToBottomButton({
  className,
  threshold = 20, // Уменьшаем порог для большей отзывчивости
  scrollContainerRef,
  ...props
}: ScrollToBottomButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Контейнер прокрутки, если он не предоставлен — используем window
    const scrollArea = scrollContainerRef.current ?? window;

    const handleScroll = () => {
      const scrollTop = scrollArea instanceof HTMLElement ? scrollArea.scrollTop : window.scrollY;
      const clientHeight = scrollArea instanceof HTMLElement ? scrollArea.clientHeight : document.documentElement.clientHeight;
      const scrollHeight = scrollArea instanceof HTMLElement ? scrollArea.scrollHeight : document.documentElement.scrollHeight;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const shouldBeVisible = distanceFromBottom > threshold && scrollHeight > clientHeight;
      
      setIsVisible(shouldBeVisible);
    };

    // Добавляем обработчик скролла напрямую к элементу из ref
    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    
    // Начальная проверка
    handleScroll();
    
    // Убираем обработчик при размонтировании
    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
    };
  // Отслеживаем изменение текущего DOM-элемента, чтобы корректно
  // перевесить обработчик при появлении контейнера
  }, [scrollContainerRef.current, threshold]);

  const scrollToBottom = () => {
    const scrollArea = scrollContainerRef.current;
    if (scrollArea) {
      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: 'smooth',
      });
      return;
    }

    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        'z-50 h-10 w-10 rounded-full transition-all duration-150 ease-out',
        'backdrop-blur-md border border-foreground/20 shadow-lg',
        'flex items-center justify-center',
        'bg-white/70 hover:bg-white/80 border-gray-200/60',
        'dark:bg-background/90 dark:hover:bg-background',
        'translate-y-0 scale-100 opacity-100',
        className
      )}
      onClick={scrollToBottom}
      style={{ touchAction: 'manipulation' }}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  );
}
