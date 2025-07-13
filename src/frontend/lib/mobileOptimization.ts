// Сервис для оптимизации производительности на мобильных устройствах
export class MobileOptimizationService {
  private static instance: MobileOptimizationService;
  private isMobile: boolean = false;
  private isLowEndDeviceFlag: boolean = false;
  private connectionSpeed: 'slow' | 'fast' | 'unknown' = 'unknown';

  public static getInstance(): MobileOptimizationService {
    if (!MobileOptimizationService.instance) {
      MobileOptimizationService.instance = new MobileOptimizationService();
    }
    return MobileOptimizationService.instance;
  }

  private constructor() {
    this.initializeOptimizations();
  }

  private initializeOptimizations(): void {
    if (typeof window === 'undefined') return;

    // Определяем тип устройства
    this.detectDeviceCapabilities();
    
    // Применяем оптимизации
    this.applyOptimizations();
    
    // Слушаем изменения сети
    this.listenToNetworkChanges();
  }

  private detectDeviceCapabilities(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    this.isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
    
    // Определяем производительность устройства
    const memory = (navigator as any).deviceMemory || 4;
    const cores = (navigator as any).hardwareConcurrency || 4;
    
    this.isLowEndDeviceFlag = memory < 4 || cores < 4;
  }

  private applyOptimizations(): void {
    if (!this.isMobile) return;

    // Оптимизация для мобильных устройств
    this.optimizeForMobile();
    
    // Дополнительные оптимизации для слабых устройств
    if (this.isLowEndDeviceFlag) {
      this.optimizeForLowEndDevice();
    }
  }

  private optimizeForMobile(): void {
    // Уменьшаем количество анимаций
    document.documentElement.style.setProperty('--animation-duration', '0.2s');
    
    // Оптимизируем скролл
    document.documentElement.style.setProperty('scroll-behavior', 'auto');
    
    // Уменьшаем тени для экономии ресурсов
    document.documentElement.style.setProperty('--shadow-sm', 'none');
    document.documentElement.style.setProperty('--shadow-md', '0 1px 3px rgba(0,0,0,0.1)');
    document.documentElement.style.setProperty('--shadow-lg', '0 4px 6px rgba(0,0,0,0.1)');
  }

  private optimizeForLowEndDevice(): void {
    // Отключаем анимации для слабых устройств
    document.documentElement.style.setProperty('--animation-duration', '0s');
    
    // Уменьшаем качество изображений
    document.documentElement.style.setProperty('--image-quality', '0.7');
    
    // Отключаем сложные эффекты
    document.documentElement.style.setProperty('--backdrop-blur', 'none');
  }

  private listenToNetworkChanges(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionSpeed = () => {
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          this.connectionSpeed = 'slow';
        } else if (connection.effectiveType === '3g' || connection.effectiveType === '4g') {
          this.connectionSpeed = 'fast';
        } else {
          this.connectionSpeed = 'unknown';
        }
        
        this.applyNetworkOptimizations();
      };

      connection.addEventListener('change', updateConnectionSpeed);
      updateConnectionSpeed();
    }
  }

  private applyNetworkOptimizations(): void {
    if (this.connectionSpeed === 'slow') {
      // Оптимизации для медленного соединения
      this.optimizeForSlowConnection();
    }
  }

  private optimizeForSlowConnection(): void {
    // Уменьшаем качество изображений
    document.documentElement.style.setProperty('--image-quality', '0.5');
    
    // Отключаем ненужные анимации
    document.documentElement.style.setProperty('--animation-duration', '0s');
    
    // Уменьшаем размер кэша
    this.reduceCacheSize();
  }

  private reduceCacheSize(): void {
    // Уменьшаем размер кэша для экономии памяти
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('pak-chat')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  }

  // Публичные методы для использования в компонентах
  public isMobileDevice(): boolean {
    return this.isMobile;
  }

  public isLowEndDevice(): boolean {
    return this.isLowEndDeviceFlag;
  }

  public getConnectionSpeed(): 'slow' | 'fast' | 'unknown' {
    return this.connectionSpeed;
  }

  // Метод для получения оптимальных настроек кэша
  public getOptimalCacheSettings(): {
    duration: number;
    maxSize: number;
    priority: 'high' | 'low';
  } {
    if (this.isLowEndDeviceFlag || this.connectionSpeed === 'slow') {
      return {
        duration: 5 * 60 * 1000, // 5 минут
        maxSize: 50, // 50 элементов
        priority: 'low'
      };
    }

    return {
      duration: 10 * 60 * 1000, // 10 минут
      maxSize: 100, // 100 элементов
      priority: 'high'
    };
  }

  // Метод для получения оптимальных настроек изображений
  public getOptimalImageSettings(): {
    quality: number;
    format: 'webp' | 'jpeg' | 'png';
    size: 'small' | 'medium' | 'large';
  } {
    if (this.isLowEndDeviceFlag || this.connectionSpeed === 'slow') {
      return {
        quality: 0.6,
        format: 'jpeg',
        size: 'small'
      };
    }

    return {
      quality: 0.8,
      format: 'webp',
      size: 'medium'
    };
  }

  // Метод для получения оптимальных настроек анимаций
  public getOptimalAnimationSettings(): {
    duration: number;
    easing: string;
    enabled: boolean;
  } {
    if (this.isLowEndDeviceFlag) {
      return {
        duration: 0,
        easing: 'linear',
        enabled: false
      };
    }

    return {
      duration: 200,
      easing: 'ease-out',
      enabled: true
    };
  }

  // Метод для принудительной оптимизации
  public forceOptimize(): void {
    this.applyOptimizations();
    this.applyNetworkOptimizations();
  }
}

export const mobileOptimization = MobileOptimizationService.getInstance();

// Хук для использования оптимизаций в компонентах
export const useMobileOptimization = () => {
  return {
    isMobile: mobileOptimization.isMobileDevice(),
    isLowEndDevice: mobileOptimization.isLowEndDevice(),
    connectionSpeed: mobileOptimization.getConnectionSpeed(),
    getOptimalCacheSettings: mobileOptimization.getOptimalCacheSettings.bind(mobileOptimization),
    getOptimalImageSettings: mobileOptimization.getOptimalImageSettings.bind(mobileOptimization),
    getOptimalAnimationSettings: mobileOptimization.getOptimalAnimationSettings.bind(mobileOptimization),
    forceOptimize: mobileOptimization.forceOptimize.bind(mobileOptimization),
  };
};