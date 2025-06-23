import { useEffect } from 'react';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';

export function useQuoteShortcuts() {
  const { currentQuote, clearQuote } = useQuoteStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape - очистить цитату только если есть активная цитата
      if (event.key === 'Escape' && currentQuote) {
        // Проверяем, что нет открытых модальных окон
        const hasOpenModal = document.querySelector('[role="dialog"]') || 
                            document.querySelector('.modal') ||
                            document.querySelector('[data-state="open"]') ||
                            document.querySelector('.fixed.inset-0');
        
        // Проверяем, что фокус не в текстовом поле (чтобы не конфликтовать с другими обработчиками)
        const activeElement = document.activeElement;
        const isInTextField = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.hasAttribute('contenteditable')
        );
        
        // Отменяем цитату только если нет модальных окон и фокус не в поле ввода
        if (!hasOpenModal && !isInTextField) {
          event.preventDefault();
          clearQuote();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentQuote, clearQuote]);
} 