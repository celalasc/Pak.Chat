import { memo } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Quote } from '@/frontend/stores/QuoteStore';

interface QuoteDisplayProps {
  quote: Quote;
  onRemove: () => void;
  className?: string;
}

function PureQuoteDisplay({ quote, onRemove, className }: QuoteDisplayProps) {
  const isLongQuote = quote.text.length > 150;
  const displayText = isLongQuote ? `${quote.text.substring(0, 150)}...` : quote.text;
  const lines = quote.text.split('\n');
  const isMultiLine = lines.length > 2;

  return (
    <div
      className={cn(
        'relative bg-accent/40 border border-accent-foreground/20 rounded-lg p-3 mb-3 transition-all duration-200',
        'before:content-["""] before:absolute before:left-1 before:top-2 before:text-3xl before:text-muted-foreground/60 before:font-serif before:leading-none',
        'after:content-["""] after:absolute after:right-1 after:bottom-2 after:text-3xl after:text-muted-foreground/60 after:font-serif after:leading-none',
        'hover:bg-accent/60 hover:border-accent-foreground/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn(
          'flex-1 text-sm text-foreground/80 pl-6 pr-6',
          isMultiLine && isLongQuote && 'max-h-24 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 scrollbar-thumb-rounded-full'
        )}>
          <div className="whitespace-pre-wrap leading-relaxed">
            {isLongQuote ? displayText : quote.text}
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-0 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-6 w-6 shrink-0 hover:bg-destructive/20 hover:text-destructive transition-all duration-200 hover:scale-110"
            title="Remove quote"
          >
            <X className="w-3 h-3" />
          </Button>
          <span className="text-[11px] mt-1 text-muted-foreground select-none">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

const QuoteDisplay = memo(PureQuoteDisplay);
QuoteDisplay.displayName = 'QuoteDisplay';

export default QuoteDisplay; 