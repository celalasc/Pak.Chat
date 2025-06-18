'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (isOnline) {
      router.push('/chat');
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-muted">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Нет подключения к интернету
          </h1>
          <p className="text-muted-foreground">
            Проверьте подключение к интернету и попробуйте снова
          </p>
        </div>

        <div className="space-y-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isOnline 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {isOnline ? 'Онлайн' : 'Офлайн'}
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleRetry}
              className="w-full"
              disabled={!isOnline}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isOnline ? 'Вернуться в чат' : 'Повторить попытку'}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Pak.Chat работает офлайн с ограниченной функциональностью
        </div>
      </div>
    </div>
  );
} 