import { memo } from 'react';
import { Quote as QuoteIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

interface QuoteButtonProps {
  onQuote: () => void;
  position: { x: number; y: number };
  className?: string;
}

function PureQuoteButton({ onQuote, position, className }: QuoteButtonProps) {
  const { isMobile } = useIsMobile();

  const top = isMobile
    ? `calc(${position.y}px + env(safe-area-inset-top, 0px))`
    : position.y;

  return (
    <div
      className={cn(
        'fixed animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
      style={{
        left: position.x,
        top,
        zIndex: 9999,
      }}
    >
      <Button
        size="sm"
        onClick={onQuote}
        className="shadow-lg border border-border/50 bg-popover text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105"
      >
        <QuoteIcon className="w-4 h-4" />
        Quote
      </Button>
    </div>
  );
}

const QuoteButton = memo(PureQuoteButton);
QuoteButton.displayName = 'QuoteButton';

export default QuoteButton; 