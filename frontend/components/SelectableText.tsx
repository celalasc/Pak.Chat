import { memo, useCallback, useRef } from 'react';
import { useTextSelection } from '@/frontend/hooks/useTextSelection';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import QuoteButton from './QuoteButton';
import { v4 as uuidv4 } from 'uuid';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

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
  const { isMobile } = useIsMobile();

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
            const buttonWidth = 80; // приблизительная ширина кнопки

            let posX = left + width / 2 - buttonWidth / 2;

            // Горизонтальное ограничение с учетом мобильных устройств
            const margin = isMobile ? 16 : 8;
            posX = Math.max(margin, Math.min(posX, window.innerWidth - buttonWidth - margin));

            // Вертикальное позиционирование
            let posY = top - buttonHeight - 8;

            // Минимальный отступ от верхнего края на мобильных устройствах
            const safeTop = isMobile ? 24 : 0;

            // Если не помещается сверху, показываем снизу
            if (posY < margin + safeTop) {
              posY = bottom + 8;
            }

            // Последняя проверка для нижнего края
            posY = Math.min(posY, window.innerHeight - buttonHeight - margin);

            // Гарантируем отступ от верхней системной панели
            posY = Math.max(posY, safeTop);

            // На мобильных устройствах добавляем дополнительный отступ снизу
            if (isMobile && posY > window.innerHeight - buttonHeight - 60) {
              posY = Math.max(top - buttonHeight - 8, safeTop);
            }

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