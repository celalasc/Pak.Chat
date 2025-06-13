import { useEffect } from 'react';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';

export function useSettings() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    // Apply selected fonts using data attributes for CSS hooks
    root.setAttribute(
      'data-general-font',
      settings.generalFont.replace(/\s+/g, '-').toLowerCase()
    );
    root.setAttribute(
      'data-code-font',
      settings.codeFont.replace(/\s+/g, '-').toLowerCase()
    );
  }, [settings.generalFont, settings.codeFont]);

  return settings;
}
