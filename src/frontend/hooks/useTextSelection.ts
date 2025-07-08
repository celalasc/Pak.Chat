import { useCallback, useEffect, useState } from 'react';

export interface TextSelection {
  text: string;
  range: Range | null;
  rect: DOMRect | null;
}

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    
    if (!sel || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();

    if (!text) {
      setSelection(null);
      return;
    }

    // Получаем позицию выделенного текста
    const rect = range.getBoundingClientRect();

    // Проверяем, что выделение видимо на экране
    if (rect.width === 0 || rect.height === 0) {
      setSelection(null);
      return;
    }

    setSelection({
      text,
      range,
      rect,
    });
  }, []);

  const clearSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
    }
    setSelection(null);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return {
    selection,
    clearSelection,
  };
} 