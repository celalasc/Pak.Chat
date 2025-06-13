import { useEffect } from 'react';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';

export function useSettings() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const applyFontSettings = () => {
      const root = document.documentElement;
      
      // Apply general font
      if (settings.generalFont === 'Proxima Vara') {
        root.style.setProperty('--font-sans', 'Proxima Vara, sans-serif');
      } else {
        root.style.setProperty('--font-sans', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      }

      // Apply code font
      if (settings.codeFont === 'Berkeley Mono') {
        root.style.setProperty('--font-mono', 'Berkeley Mono, "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace');
      } else {
        root.style.setProperty('--font-mono', 'ui-monospace, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace');
      }
    };

    applyFontSettings();
  }, [settings.generalFont, settings.codeFont]);

  return settings;
} 