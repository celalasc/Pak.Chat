import { useEffect } from 'react';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import Cookies from 'js-cookie';

export function useSettings() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;

    const generalFont = settings.generalFont;
    root.classList.remove('font-sans-inter', 'font-sans-system-font');
    const generalFontClass = `font-sans-${generalFont.replace(/\s+/g, '-').toLowerCase()}`;
    root.classList.add(generalFontClass);
    Cookies.set('general-font', generalFont, { expires: 365 });

    const codeFont = settings.codeFont;
    root.classList.remove('font-mono-jetbrains-mono', 'font-mono-system-monospace-font');
    const codeFontClass = `font-mono-${codeFont.replace(/\s+/g, '-').toLowerCase()}`;
    root.classList.add(codeFontClass);
    Cookies.set('code-font', codeFont, { expires: 365 });

  }, [settings.generalFont, settings.codeFont]);

  return settings;
}
