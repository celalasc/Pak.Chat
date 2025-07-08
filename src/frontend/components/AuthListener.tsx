'use client';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { ReactNode, useEffect, useState } from 'react';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '@/firebase';

export default function AuthListener({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Инициализируем слушатель auth state один раз
    const unsub = init();
    
    // Проверяем результат редиректа параллельно
    getRedirectResult(auth)
      .then((result) => {
        // Результат обрабатывается в onAuthStateChanged
      })
      .catch((error) => {
        if (error?.code !== 'auth/popup-blocked-by-browser' && error?.code !== 'auth/cancelled-popup-request') {
          console.error('Error handling redirect result:', error);
        }
      })
      .finally(() => {
        if (isMounted) {
          // Даем время на обработку auth state
          setTimeout(() => {
            if (isMounted) {
              setIsInitialized(true);
              // Скрываем глобальный лоадер
              if (typeof window !== 'undefined' && (window as any).__hideGlobalLoader) {
                (window as any).__hideGlobalLoader();
              }
            }
          }, 100);
        }
      });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [init]);

  // Показываем детей только после полной инициализации
  if (!isInitialized) return null;
  
  return <>{children}</>;
}
