import { useEffect } from 'react';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';

export function useSettings() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    const generalFontClass = `font-sans-${settings.generalFont
      .replace(/\s+/g, '-')
      .toLowerCase()}`;
    const codeFontClass = `font-mono-${settings.codeFont
      .replace(/\s+/g, '-')
      .toLowerCase()}`;

    root.classList.remove(
      'font-sans-inter',
      'font-sans-system-font',
      'font-mono-jetbrains-mono',
      'font-mono-system-monospace-font'
    );
    root.classList.add(generalFontClass, codeFontClass);
  }, [settings.generalFont, settings.codeFont]);

  return settings;
}
