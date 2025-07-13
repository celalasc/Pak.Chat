# Исправления для проблемы с touch событиями на мобильных устройствах

## Проблема
На мобильных устройствах при скроллинге чата случайно активировалась анимация, которая должна появляться только при долгом нажатии (long press).

## Внесенные изменения

### 1. Исправлен хук `useLongPress` (`src/frontend/hooks/useLongPress.ts`)

**Проблема 1:** Анимация `isPressed` активировалась сразу при `onTouchStart`, что мешало нормальному скроллингу.

**Проблема 2:** В таймауте `setIsPressed(true)` сразу же сменялся на `setIsPressed(false)`, делая визуальный фидбек невидимым.

**Проблема 3:** `event.type` в таймауте был `null` из-за React's SyntheticEvent pooling.

**Решение:** 
- Сохраняем тип события в переменную перед таймаутом
- Убираем `setIsPressed(false)` из таймаута - пусть `cancel()` это сделает
- Анимация `isPressed` теперь активируется только после задержки (500ms)
- Для touch событий анимация не устанавливается сразу, а только после таймаута

```typescript
// Было:
timeoutRef.current = setTimeout(() => {
  if (event.type === 'touchstart') { // event.type будет null!
    setIsPressed(true);
  }
  onLongPress();
  setIsPressed(false); // Сразу сбрасываем!
}, threshold);

// Стало:
const eventType = event.type; // Сохраняем тип события
timeoutRef.current = setTimeout(() => {
  if (eventType === 'touchstart') {
    setIsPressed(true);
  }
  onLongPress();
  // НЕ сбрасываем isPressed здесь - пусть cancel() это сделает
}, threshold);
```

### 2. Улучшен компонент `CustomModesDialog` (`src/frontend/components/CustomModesDialog.tsx`)

**Проблема:** Анимация `scale-95 opacity-70` активировалась сразу при касании.

**Решение:**
- Анимация `isPressed` теперь устанавливается только в таймауте long press
- Уменьшен порог для отмены анимации при движении (с 10px до 5px)

```typescript
// Было:
setIsPressed(true); // Сразу при touch start

// Стало:
// setIsPressed(true); // Убрано
// Анимация устанавливается только в таймауте:
const timer = setTimeout(() => {
  setIsPressed(true);
  setShowContextMenu(true);
  navigator.vibrate?.(50);
}, 500);
```

### 3. Упрощен компонент `ChatHistoryList` (`src/frontend/components/chat-history/components/ChatHistoryList.tsx`)

**Проблема:** Сложная логика обработки long press мешала скроллингу.

**Решение:**
- Убрана обработка long press на мобильных устройствах
- Оставлен только `preventDefault()` для предотвращения контекстного меню

```typescript
// Было:
const touchStartTime = Date.now();
const touchTimer = setTimeout(() => {
  /* noop - long press disabled on mobile */
}, 500);
// ... сложная логика

// Стало:
if (isMobile) {
  e.preventDefault(); // Только предотвращение контекстного меню
}
```

### 4. Улучшен компонент `PullToRefresh` (`src/frontend/components/mobile/PullToRefresh.tsx`)

**Проблема:** Pull-to-refresh активировался при малейшем движении вниз.

**Решение:**
- Увеличен порог для активации pull-to-refresh (с 0px до 10px)

```typescript
// Было:
if (distance > 0) {

// Стало:
if (distance > 10) { // Увеличен порог
```

## Результат

Теперь на мобильных устройствах:
- ✅ Нормальный скроллинг не активирует анимации long press
- ✅ Анимации появляются только при настоящем долгом нажатии (500ms)
- ✅ Pull-to-refresh активируется только при значительном движении вниз
- ✅ Улучшена чувствительность к движениям - анимации отменяются при малейшем движении

## Тестирование

Для тестирования изменений:
1. Откройте приложение на мобильном устройстве
2. Попробуйте скроллить чат - анимации не должны появляться
3. Попробуйте долго нажать на элементы - анимации должны появляться только после 500ms
4. Попробуйте pull-to-refresh - он должен активироваться только при значительном движении вниз