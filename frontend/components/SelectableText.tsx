import { memo, useCallback, useRef } from 'react';
import { useTextSelection } from '@/frontend/hooks/useTextSelection';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import QuoteButton from './QuoteButton';
import { v4 as uuidv4 } from 'uuid';

interface SelectableTextProps {
  children: React.ReactNode;
  messageId: string;
  className?: string;
  disabled?: boolean;
}

function PureSelectableText({ 
  children, 
  messageId, 
  className, 
  disabled = false 
}: SelectableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection();
  const { setQuote } = useQuoteStore();

  const handleQuote = useCallback(() => {
    if (!selection?.text) return;

    const quote = {
      id: uuidv4(),
      text: selection.text,
      messageId,
      createdAt: new Date(),
    };

    setQuote(quote);
    clearSelection();
  }, [selection, messageId, setQuote, clearSelection]);

  // Проверяем, что выделение находится внутри нашего контейнера
  const isSelectionInContainer = useCallback(() => {
    if (!selection?.range || !containerRef.current) return false;
    
    return containerRef.current.contains(selection.range.commonAncestorContainer);
  }, [selection]);

  const shouldShowQuoteButton = 
    !disabled && 
    selection && 
    selection.text.length > 0 && 
    selection.rect && 
    isSelectionInContainer();

  return (
    <div ref={containerRef} className={className}>
      {children}
      
      {shouldShowQuoteButton && (
        <QuoteButton
          onQuote={handleQuote}
          position={(function() {
            const { left, top, width, bottom } = selection.rect!;
            const buttonHeight = 32; // приблизительная высота кнопки

            let posX = left + width / 2 - 40; // 40 = половина ширины кнопки (80)
            // Горизонтальное ограничение
            posX = Math.max(8, Math.min(posX, window.innerWidth - 88));

            // Сначала пробуем показать над выделением
            let posY = top - buttonHeight - 8;
            // Если не помещается сверху, показываем снизу
            if (posY < 8) {
              posY = bottom + 8;
            }
            // Последняя проверка, чтобы кнопка не вышла за нижний край
            posY = Math.min(posY, window.innerHeight - buttonHeight - 8);

            return { x: posX, y: posY };
          })()}
        />
      )}
    </div>
  );
}

const SelectableText = memo(PureSelectableText);
SelectableText.displayName = 'SelectableText';

export default SelectableText; 