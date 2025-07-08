'use client';

import { useEffect } from 'react';

export default function ClientScripts() {
  useEffect(() => {
    // ВРЕМЕННО ОТКЛЮЧАЕМ И УДАЛЯЕМ СУЩЕСТВУЮЩИЙ SERVICE WORKER
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          console.log('Unregistering SW:', registration);
          registration.unregister();
        });
      });
    }
    
    return;
    
    // Register Service Worker for PWA only in production
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
            // Тихо игнорируем ошибки PWA в production
          });
      });
    }
  }, []);

  return null;
} 