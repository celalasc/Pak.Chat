'use client';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { ReactNode, useEffect, useState } from 'react';

export default function AuthListener({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = init();
    setReady(true);
    return unsub;
  }, [init]);

  if (!ready || loading) return null;
  return <>{children}</>;
}
