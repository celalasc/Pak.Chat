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
  threshold = 100, // Увеличиваю threshold для более раннего появления
  ...props
}: ScrollToBottomButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10; // Попытки найти элемент
    
    const findElementAndSetupScroll = () => {
      const scrollArea = document.getElementById('messages-scroll-area');
      
      if (!scrollArea) {
        // Retry через небольшой интервал если элемент не найден
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(findElementAndSetupScroll, 100);
        }
        return;
      }

      const handleScroll = () => {
        const { scrollTop, clientHeight, scrollHeight } = scrollArea;
        
        // Более надежное определение что пользователь не в самом низу
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        const shouldBeVisible = distanceFromBottom > threshold && scrollHeight > clientHeight;
        
        setIsVisible(shouldBeVisible);
      };

      // Добавляем обработчик скролла
      scrollArea.addEventListener('scroll', handleScroll, { passive: true });
      
      // Вызываем сразу для начальной проверки
      handleScroll();
      
      // Также проверяем через небольшую задержку когда DOM стабилизируется
      const timeoutId = setTimeout(handleScroll, 200);
      
      return () => {
        scrollArea.removeEventListener('scroll', handleScroll);
        clearTimeout(timeoutId);
      };
    };

    const cleanup = findElementAndSetupScroll();
    
    return cleanup;
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
