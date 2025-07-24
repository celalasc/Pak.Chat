"use client";

import React from 'react';
import { useSettings } from '@/frontend/hooks/useSettings';
import { ThemeProvider } from '@/frontend/components/ui/ThemeProvider';
import { useAsyncStoreSync } from '@/frontend/hooks/useAsyncStoreSync';

export default function Providers({ children }: { children: React.ReactNode }) {
  useSettings();
  
  // Асинхронная синхронизация всех store для улучшения производительности
  useAsyncStoreSync({
    autoInit: true,
    onSyncComplete: () => {
      console.log('✅ All stores synced successfully');
    },
    onSyncError: (error) => {
      console.error('❌ Store sync error:', error);
    },
  });
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
