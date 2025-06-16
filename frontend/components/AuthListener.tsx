'use client';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { ReactNode, useEffect, useState } from 'react';

interface AuthListenerProps {
  /**
   * Children as render function to signal when auth state is ready.
   */
  children: (authReady: boolean) => ReactNode;
}

export default function AuthListener({ children }: AuthListenerProps) {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = init();
    setReady(true);
    return unsub;
  }, [init]);

  // Provide a boolean indicator whether auth has finished initializing.
  const authReady = ready && !loading;
  return <>{children(authReady)}</>;
}
