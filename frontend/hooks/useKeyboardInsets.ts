import { useEffect } from 'react';

export function useKeyboardInsets(onChange: (height: number) => void) {
  useEffect(() => {
    const handle = () => {
      const height = window.visualViewport
        ? window.innerHeight - window.visualViewport.height
        : 0;
      onChange(height);
    };
    window.visualViewport?.addEventListener('resize', handle);
    return () => window.visualViewport?.removeEventListener('resize', handle);
  }, [onChange]);
}
