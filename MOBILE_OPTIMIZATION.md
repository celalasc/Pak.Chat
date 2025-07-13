# Оптимизация производительности для мобильных устройств

## Обзор оптимизаций

Данный проект включает комплексную оптимизацию для максимально быстрой загрузки истории чатов на мобильных устройствах.

## Ключевые оптимизации

### 1. Улучшенное кэширование (`src/frontend/lib/threadsCache.ts`)

- **Увеличенное время кэширования**: с 5 до 10 минут для мобильных устройств
- **Версионирование кэша**: автоматическая инвалидация при обновлениях
- **Быстрая проверка кэша**: метод `hasValidCache()` для мгновенной проверки
- **Оптимизированное хранение**: только необходимые данные в localStorage

### 2. Оптимизированный хук (`src/frontend/hooks/useConvexThreads.ts`)

- **Приоритет кэша**: показ кэшированных данных мгновенно
- **Ленивая загрузка**: загрузка с сервера только при необходимости
- **Мемоизация**: предотвращение лишних ре-рендеров
- **Статус загрузки**: отдельный индикатор для загрузки из кэша

### 3. Мобильная оптимизация (`src/frontend/lib/mobileOptimization.ts`)

- **Автоопределение устройства**: анализ производительности и сети
- **Адаптивные настройки**: разные оптимизации для разных устройств
- **Сетевая адаптация**: оптимизация под скорость соединения
- **Ресурсная экономия**: отключение анимаций на слабых устройствах

### 4. Оптимизированные компоненты

#### `OptimizedChatHistory.tsx`
- **Мемоизированные компоненты**: предотвращение лишних ре-рендеров
- **Ленивая группировка**: оптимизированная группировка тредов
- **Условная загрузка**: показ загрузки только при отсутствии кэша

#### `FastChatHistoryMobile.tsx`
- **Мобильная адаптация**: оптимизированный UI для мобильных устройств
- **Быстрые действия**: оптимизированные обработчики событий
- **Адаптивная производительность**: разные настройки для разных устройств

### 5. Конфигурация Next.js (`next.config.ts`)

- **Разделение чанков**: отдельные чанки для Convex и UI компонентов
- **Оптимизация изображений**: поддержка WebP и AVIF
- **Сжатие**: включено сжатие для всех ресурсов
- **Кэширование**: оптимизированные заголовки кэширования

## Использование оптимизаций

### В компонентах

```typescript
import { useConvexThreads } from "@/frontend/hooks/useConvexThreads";
import { useMobileOptimization } from "@/frontend/lib/mobileOptimization";

function MyComponent() {
  const { threads, isLoading, hasValidCache } = useConvexThreads();
  const { isMobile, isLowEndDevice, getOptimalCacheSettings } = useMobileOptimization();

  // Используем оптимизированные настройки
  const cacheSettings = getOptimalCacheSettings();

  // Показываем загрузку только если нет кэша
  if (isLoading && !hasValidCache()) {
    return <LoadingSpinner />;
  }

  return <ChatList threads={threads} />;
}
```

### Настройка кэша

```typescript
import { threadsCache } from "@/frontend/lib/threadsCache";

// Принудительная очистка кэша
threadsCache.clear();

// Проверка наличия кэша
const hasCache = threadsCache.hasValidCache(userId);

// Получение только заголовков для быстрого отображения
const titles = threadsCache.getThreadTitles(userId);
```

## Метрики производительности

### Целевые показатели

- **Время до интерактивности**: < 1 секунды на мобильных устройствах
- **Время загрузки истории**: < 500ms при наличии кэша
- **Размер бандла**: < 2MB для мобильных устройств
- **FPS**: > 60 на всех устройствах

### Мониторинг

```typescript
// Проверка производительности
const performance = {
  cacheHit: threadsCache.hasValidCache(userId),
  loadTime: Date.now() - startTime,
  deviceType: mobileOptimization.isMobileDevice() ? 'mobile' : 'desktop',
  connectionSpeed: mobileOptimization.getConnectionSpeed()
};
```

## Дополнительные оптимизации

### 1. Предзагрузка данных

```typescript
import { preloadService } from "@/frontend/lib/preloadService";

// Принудительная предзагрузка
await preloadService.forcePreload();

// Проверка статуса
const isPreloading = preloadService.isPreloadingData();
```

### 2. Адаптивные изображения

```typescript
const { getOptimalImageSettings } = useMobileOptimization();
const imageSettings = getOptimalImageSettings();

// Использование оптимальных настроек
<img 
  src={imageUrl} 
  quality={imageSettings.quality}
  format={imageSettings.format}
/>
```

### 3. Оптимизация анимаций

```typescript
const { getOptimalAnimationSettings } = useMobileOptimization();
const animationSettings = getOptimalAnimationSettings();

// Применение настроек
const animationStyle = {
  transition: animationSettings.enabled 
    ? `all ${animationSettings.duration}ms ${animationSettings.easing}`
    : 'none'
};
```

## Рекомендации по развертыванию

### 1. Production оптимизации

- Включить сжатие Gzip/Brotli
- Настроить CDN для статических ресурсов
- Использовать HTTP/2 для параллельной загрузки
- Настроить Service Worker для кэширования

### 2. Мониторинг

- Отслеживать Core Web Vitals
- Мониторить время загрузки на разных устройствах
- Анализировать использование кэша
- Отслеживать ошибки производительности

### 3. Тестирование

```bash
# Тест производительности
npm run build
npm run start
# Открыть Chrome DevTools -> Performance
# Профилировать загрузку на мобильном устройстве
```

## Заключение

Данные оптимизации обеспечивают:

- **Мгновенную загрузку** истории чатов при наличии кэша
- **Адаптивную производительность** под разные устройства
- **Экономию трафика** на мобильных устройствах
- **Плавную работу** даже на слабых устройствах

Все оптимизации автоматически применяются в зависимости от характеристик устройства и сети пользователя.