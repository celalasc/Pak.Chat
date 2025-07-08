"use client";

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Проверяем iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Проверяем, запущено ли приложение в standalone режиме
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Проверяем, было ли уведомление уже отклонено
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    setDismissed(!!wasDismissed);

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Показываем промпт только если он не был отклонен и не в standalone режиме
      if (!wasDismissed && !standalone) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Не показываем промпт если:
  // - Уже в standalone режиме
  // - Был отклонен
  // - Нет отложенного промпта (кроме iOS)
  if (isStandalone || dismissed || (!deferredPrompt && !isIOS) || !showPrompt) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm",
      "bg-background/95 backdrop-blur-xl border border-border/20 rounded-2xl shadow-2xl",
      "p-4 animate-in slide-in-from-bottom-4 duration-500"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-xl">
          {isIOS ? <Smartphone className="h-6 w-6 text-primary" /> : <Download className="h-6 w-6 text-primary" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground">
            Install Pak.Chat
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isIOS 
              ? "Press Share → Add to Home Screen to install"
              : "Install the app for a better experience"
            }
          </p>
          
          <div className="flex gap-2 mt-3">
            {!isIOS && (
              <Button
                size="sm"
                onClick={handleInstall}
                className="h-8 px-3 text-xs"
              >
                Install
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 px-3 text-xs"
            >
              Not now
            </Button>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 