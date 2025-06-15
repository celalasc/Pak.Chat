'use client';

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/frontend/stores/AuthStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  
  return <>{children}</>;
} 