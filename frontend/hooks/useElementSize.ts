import { useLayoutEffect, useState, useRef } from 'react';

// Hook that returns a ref and size of the referenced element
export function useElementSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setSize({ width: element.offsetWidth, height: element.offsetHeight });

    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
}
