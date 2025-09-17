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
    let timeoutId: NodeJS.Timeout;
    
    // Инициализируем слушатель auth state один раз
    const unsub = init();
    
    // Асинхронная инициализация без блокировки UI
    const initializeAuth = async () => {
      try {
        // Используем Promise.race для таймаута на случай медленного соединения
        const redirectPromise = getRedirectResult(auth);
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Redirect result timeout')), 5000);
        });
        
        await Promise.race([redirectPromise, timeoutPromise]);
        clearTimeout(timeoutId);
      } catch (error: any) {
        if (error?.code !== 'auth/popup-blocked-by-browser' && 
            error?.code !== 'auth/cancelled-popup-request' &&
            error?.message !== 'Redirect result timeout') {
          console.error('Error handling redirect result:', error);
        }
      }
      
      if (isMounted) {
        // Используем scheduler для неблокирующего обновления
        if ('scheduler' in window && (window as any).scheduler?.postTask) {
          (window as any).scheduler.postTask(() => {
            if (isMounted) {
              setIsInitialized(true);
            }
          }, { priority: 'user-blocking' });
        } else {
          // Fallback к requestAnimationFrame
          requestAnimationFrame(() => {
            if (isMounted) {
              setIsInitialized(true);
            }
          });
        }
      }
    };
    
    // Запускаем асинхронную инициализацию с минимальной задержкой
    const initTimeout = setTimeout(() => {
      initializeAuth();
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      clearTimeout(timeoutId);
      unsub();
    };
  }, [init]);

  // Показываем детей только после полной инициализации
  if (!isInitialized) return null;
  
  return <>{children}</>;
}
