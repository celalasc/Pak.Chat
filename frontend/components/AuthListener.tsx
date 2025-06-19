'use client';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { ReactNode, useEffect, useState } from 'react';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '@/firebase';

export default function AuthListener({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Сначала инициализируем слушатель auth state
    const unsub = init();
    
    // Затем проверяем результат редиректа
    getRedirectResult(auth)
      .then((result) => {
        if (result && isMounted) {
          // Пользователь уже будет установлен через onAuthStateChanged
        }
      })
      .catch((error) => {
        if (error?.code !== 'auth/popup-blocked-by-browser' && error?.code !== 'auth/cancelled-popup-request') {
          console.error('Error handling redirect result:', error);
        }
      })
      .finally(() => {
        if (isMounted) {
          setReady(true);
        }
      });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [init]);

  if (!ready || loading) return null;
  return <>{children}</>;
}
