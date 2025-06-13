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
  threshold = 100,
  ...props
}: ScrollToBottomButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const innerHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      setIsVisible(scrollTop + innerHeight < scrollHeight - threshold);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        'z-50 h-10 w-10 rounded-full transition-all duration-150 ease-out',
        'backdrop-blur-md bg-background/90 hover:bg-background border border-foreground/20',
        'flex items-center justify-center shadow-lg',
        isVisible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none translate-y-2 scale-90 opacity-0',
        className
      )}
      onClick={scrollToBottom}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  );
}
