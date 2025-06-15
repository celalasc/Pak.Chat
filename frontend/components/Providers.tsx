"use client";

import React from 'react';
import { useSettings } from '@/frontend/hooks/useSettings';
import { useSettingsSync } from '@/frontend/stores/SettingsStore';
import { ThemeProvider } from '@/frontend/components/ui/ThemeProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  useSettings();
  useSettingsSync();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
