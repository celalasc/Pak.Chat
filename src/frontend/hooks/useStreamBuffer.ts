import { useRef } from 'react';

export function useStreamBuffer(onFlush: (text: string) => void) {
  const buffer = useRef('');
  const raf = useRef<number | undefined>(undefined);

  const push = (chunk: string) => {
    buffer.current += chunk;
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        onFlush(buffer.current);
        buffer.current = '';
        raf.current = undefined;
      });
    }
  };
  return push;
}
