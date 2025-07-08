"use client";

import { useEffect } from 'react';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

export default function MobileEnhancements() {
  const { isMobile } = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;

    // Установка custom viewport height для более точного контроля
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Обработка изменения размера экрана для virtual keyboard
    const handleResize = () => {
      setViewportHeight();
      
      // Определяем, открыта ли виртуальная клавиатура
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const isKeyboardOpen = viewportHeight < window.innerHeight * 0.75;
      
      document.documentElement.style.setProperty(
        '--keyboard-open', 
        isKeyboardOpen ? '1' : '0'
      );
    };

    // Улучшенная обработка orientation change
    const handleOrientationChange = () => {
      setTimeout(() => {
        setViewportHeight();
      }, 100);
    };

    // Инициализация
    setViewportHeight();

    // Event listeners
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    // Add mobile app classes
    document.documentElement.classList.add('mobile-app');
    if (window.matchMedia('(display-mode: standalone)').matches) {
      document.documentElement.classList.add('standalone-app');
    }

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }

      document.documentElement.classList.remove('mobile-app', 'standalone-app');
    };
  }, [isMobile]);

  return null;
} 