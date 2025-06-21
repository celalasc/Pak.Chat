"use client";

import { Button } from '@/frontend/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ScrollToBottomButtonProps = {
  className?: string;
  threshold?: number;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function ScrollToBottomButton({
  className,
  threshold = 50, // Уменьшаю threshold для более раннего появления
  ...props
}: ScrollToBottomButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scrollArea = document.getElementById('messages-scroll-area');
    if (!scrollArea) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = scrollArea;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;
      
      // Показываем кнопку если НЕ в самом низу и есть что прокручивать
      const shouldBeVisible = !isAtBottom && scrollHeight > clientHeight;
      
      setIsVisible(shouldBeVisible);
    };

    // Добавляем обработчик и вызываем сразу
    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    
    // Задержка для правильного вычисления размеров после рендера
    const timeoutId = setTimeout(handleScroll, 100);
    
    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [threshold]);

  const scrollToBottom = () => {
    const scrollArea = document.getElementById('messages-scroll-area');
    if (!scrollArea) return;
    
    scrollArea.scrollTo({
      top: scrollArea.scrollHeight,
      behavior: 'smooth',
    });
  };

  if (!isVisible) {
    return null; // Не рендерим вообще если не видим
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
        'translate-y-0 scale-100 opacity-100', // Всегда видима если рендерится
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
