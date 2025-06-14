'use client';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useEffect } from 'react';

export default function AuthListener() {
  const init = useAuthStore((s) => s.init);

  // Start Firebase auth listener on mount and clean up on unmount
  useEffect(() => init(), [init]);

  return null;
}
