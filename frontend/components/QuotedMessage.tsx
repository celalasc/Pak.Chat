import { memo } from 'react';
import { cn } from '@/lib/utils';

interface QuotedMessageProps {
  content: string;
  className?: string;
}

function PureQuotedMessage({ content, className }: QuotedMessageProps) {
  // Разделяем сообщение на цитату и основной текст
  const lines = content.split('\n');
  const quoteLines: string[] = [];
  const messageLines: string[] = [];
  
  let isQuote = false;
  let foundEmptyLine = false;

  for (const line of lines) {
    if (line.startsWith('> ')) {
      isQuote = true;
      quoteLines.push(line.substring(2)); // Убираем "> "
    } else if (isQuote && line.trim() === '') {
      foundEmptyLine = true;
    } else if (foundEmptyLine || !isQuote) {
      messageLines.push(line);
    }
  }

  const hasQuote = quoteLines.length > 0;
  const quoteText = quoteLines.join('\n');
  const messageText = messageLines.join('\n').trim();

  if (!hasQuote) {
    return <p className={className}>{content}</p>;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Цитата */}
      <div className={cn(
        'relative bg-accent/20 border-l-4 border-accent-foreground/50 rounded-r-lg p-3 ml-2',
        'before:content-["""] before:absolute before:-left-1 before:top-0 before:text-lg before:text-muted-foreground/60 before:font-serif',
        'after:content-["""] after:absolute after:right-1 after:bottom-0 after:text-lg after:text-muted-foreground/60 after:font-serif'
      )}>
        <div className="text-sm text-foreground/70 italic pl-2 pr-2 whitespace-pre-wrap leading-relaxed">
          {quoteText}
        </div>
      </div>
      
      {/* Основное сообщение */}
      {messageText && (
        <div className="text-foreground whitespace-pre-wrap leading-relaxed">
          {messageText}
        </div>
      )}
    </div>
  );
}

const QuotedMessage = memo(PureQuotedMessage);
QuotedMessage.displayName = 'QuotedMessage';

export default QuotedMessage; 