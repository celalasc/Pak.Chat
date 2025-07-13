"use client";

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false,
  className
}: PullToRefreshProps) {
  const { isMobile } = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  const threshold = 80; // Minimum distance to trigger refresh
  const maxDistance = 120; // Maximum pull distance

  useEffect(() => {
    if (!isMobile || disabled) return;

    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let touchCurrentY = 0;
    let canPull = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if we're at the top of the page
      if (container.scrollTop === 0) {
        touchStartY = e.touches[0].clientY;
        touchCurrentY = touchStartY;
        canPull = true;
        setStartY(touchStartY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull) return;

      touchCurrentY = e.touches[0].clientY;
      const distance = touchCurrentY - touchStartY;

      if (distance > 10) { // Увеличиваем порог для активации pull-to-refresh
        // Prevent default scroll behavior when pulling down
        e.preventDefault();
        
        // Calculate pull distance with easing
        const easedDistance = Math.min(distance * 0.6, maxDistance);
        setPullDistance(easedDistance);
        setCurrentY(touchCurrentY);
        setIsPulling(true);
      } else {
        // Reset if pulling up
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!canPull) return;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      // Reset states
      setPullDistance(0);
      setIsPulling(false);
      setStartY(0);
      setCurrentY(0);
      canPull = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, disabled, onRefresh, pullDistance, threshold, isRefreshing]);

  const pullPercentage = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full overflow-auto",
        className
      )}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance, maxDistance)}px)` : 'none',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && isMobile && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center"
          style={{
            height: `${Math.min(pullDistance, maxDistance)}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-background/90 backdrop-blur-sm border border-border/20 shadow-lg",
            "transition-all duration-200",
            shouldTrigger ? "bg-primary/10 border-primary/30" : "bg-muted/50"
          )}>
            <RefreshCw 
              className={cn(
                "h-4 w-4 transition-all duration-200",
                isRefreshing ? "animate-spin" : "",
                shouldTrigger ? "text-primary" : "text-muted-foreground"
              )}
              style={{
                transform: isRefreshing ? 'none' : `rotate(${pullPercentage * 180}deg)`,
              }}
            />
            <span className={cn(
              "text-xs font-medium transition-colors duration-200",
              shouldTrigger ? "text-primary" : "text-muted-foreground"
            )}>
              {isRefreshing 
                ? "Обновление..." 
                : shouldTrigger 
                  ? "Отпустите для обновления" 
                  : "Потяните для обновления"
              }
            </span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
 