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
  threshold = 100,
  scrollContainerRef,
  ...props
}: ScrollToBottomButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Функция проверки позиции скролла
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Показываем кнопку если прокрутили вверх больше чем на threshold пикселей
      setIsVisible(distanceFromBottom > threshold);
    };

    // Ждем пока контейнер появится
    const waitForContainer = () => {
      const container = scrollContainerRef.current;
      if (container) {
        // Контейнер найден, добавляем слушатель
        container.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll(); // Проверяем начальное состояние
        return true;
      }
      return false;
    };

    // Пытаемся найти контейнер
    if (!waitForContainer()) {
      // Если не нашли сразу, проверяем каждые 100мс
      const interval = setInterval(() => {
        if (waitForContainer()) {
          clearInterval(interval);
        }
      }, 100);
      
      return () => {
        clearInterval(interval);
        const container = scrollContainerRef.current;
        if (container) {
          container.removeEventListener('scroll', checkScroll);
        }
      };
    }

    // Cleanup
    return () => {
      const container = scrollContainerRef.current;
      if (container) {
        container.removeEventListener('scroll', checkScroll);
      }
    };
  }, [scrollContainerRef, threshold]);

  const handleClick = () => {
    const container = scrollContainerRef.current;
    if (container) {
      // Прокручиваем контейнер вниз
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      // Если контейнер не найден, пробуем найти по ID
      const messagesArea = document.getElementById('messages-scroll-area');
      if (messagesArea) {
        messagesArea.scrollTo({
          top: messagesArea.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        'h-10 w-10 rounded-full transition-all duration-200',
        'backdrop-blur-md border border-gray-200 dark:border-gray-700',
        'bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800',
        'shadow-lg hover:shadow-xl',
        'flex items-center justify-center',
        'hover:scale-105 active:scale-95',
        className
      )}
      onClick={handleClick}
      aria-label="Scroll to bottom"
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  );
}
