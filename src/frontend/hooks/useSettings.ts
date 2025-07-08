import { useEffect } from 'react';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { useAuthStore } from '@/frontend/stores/AuthStore';

export function useSettings() {
  const { settings } = useSettingsStore();
  const setBlur = useAuthStore((s) => s.toggleBlur);
  const blurPersonalData = useAuthStore((s) => s.blurPersonalData);

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
    if (blurPersonalData !== settings.hidePersonal) {
      setBlur();
    }
  }, [settings.generalFont, settings.codeFont, settings.hidePersonal]);

  return settings;
} 