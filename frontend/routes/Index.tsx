'use client';

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { Button } from '@/frontend/components/ui/button';
import MessageLoading from '@/frontend/components/ui/MessageLoading';

export default function Index() {
  const { user, loading, login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);
  
  if (loading || (!loading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <MessageLoading />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Welcome to Pak.Chat</h1>
      <p className="text-lg text-muted-foreground">Your high-performance LLM application.</p>
      <Button size="lg" onClick={login} disabled={loading}>
        Sign In with Google to Continue
      </Button>
    </main>
  );
}

export { ErrorBoundary } from '@/frontend/components/ErrorBoundary';
