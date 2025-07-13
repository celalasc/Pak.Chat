"use client";

import React from 'react';
import { useSettings } from '@/frontend/hooks/useSettings';
import { useSettingsSync } from '@/frontend/stores/SettingsStore';
import { ThemeProvider } from '@/frontend/components/ui/ThemeProvider';
import { useModelVisibilitySync } from '@/frontend/hooks/useModelVisibilitySync';
import { useCustomModesSync } from '@/frontend/stores/CustomModesStore';
import { useModelSync } from '@/frontend/stores/ModelStore';

export default function Providers({ children }: { children: React.ReactNode }) {
  useSettings();
  useSettingsSync();
  // Sync model visibility (favorite models & enabled providers) with Convex
  useModelVisibilitySync();
  // Sync custom modes settings with Convex
  useCustomModesSync();
  // Sync model selection and web search settings with Convex
  useModelSync();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
