import { useEffect, useRef } from 'react';
import { useVirtualizer, type VirtualizerOptions } from '@tanstack/react-virtual';

export interface UseVirtualParams<
  ItemElement extends Element = HTMLElement
> extends Omit<VirtualizerOptions<HTMLDivElement, ItemElement>, 'getScrollElement'> {
  /**
   * Minimum number of items before virtualization is enabled.
   * Defaults to 50.
   */
  threshold?: number;
}

export default function useVirtual<
  ItemElement extends Element = HTMLElement
>(options: UseVirtualParams<ItemElement>) {
  const { count, threshold = 50, getScrollElement, ...rest } = options;
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: getScrollElement ?? (() => parentRef.current!),
    ...rest,
  });

  // When virtualization is disabled, ensure measurements are updated
  useEffect(() => {
    if (count < threshold) {
      virtualizer.measure();
    }
  }, [count, threshold, virtualizer]);

  return { parentRef, virtualizer } as const;
}
