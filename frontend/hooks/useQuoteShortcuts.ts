import { useEffect } from 'react';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';

export function useQuoteShortcuts() {
  const { clearQuote } = useQuoteStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape - очистить цитату
      if (event.key === 'Escape') {
        clearQuote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearQuote]);
} 