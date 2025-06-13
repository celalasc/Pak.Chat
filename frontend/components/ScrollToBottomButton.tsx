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
    // document.scrollingElement accounts for browsers that scroll <body>
    const scrollEl = document.scrollingElement ?? document.documentElement;
    const handleScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = scrollEl;
      setIsVisible(scrollTop + clientHeight < scrollHeight - threshold);
    };

    // Listen on document to track the actual scrolling element
    document.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const scrollToBottom = () => {
    const scrollEl = document.scrollingElement ?? document.documentElement;
    scrollEl.scrollTo({
      top: scrollEl.scrollHeight,
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
