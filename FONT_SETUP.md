# Настройка шрифтов для Pak.Chat

## Проблема
В настройках приложения есть опции выбора шрифтов "Proxima Vara" и "Berkeley Mono", но файлы шрифтов не включены в репозиторий.

## Решение
Добавьте файлы шрифтов в папку `public/fonts/`:

### Proxima Vara
- `ProximaVara-Regular.woff2`
- `ProximaVara-Regular.woff`
- `ProximaVara-Medium.woff2`
- `ProximaVara-Medium.woff`
- `ProximaVara-Semibold.woff2`
- `ProximaVara-Semibold.woff`

### Berkeley Mono
- `BerkeleyMono-Regular.woff2`
- `BerkeleyMono-Regular.woff`
- `BerkeleyMono-Medium.woff2`
- `BerkeleyMono-Medium.woff`
- `BerkeleyMono-Bold.woff2`
- `BerkeleyMono-Bold.woff`

## Где получить шрифты
- **Proxima Vara**: Коммерческий шрифт от Mark Simonson Studio
- **Berkeley Mono**: Коммерческий шрифт от Neil Summerour

## Fallback
Если шрифты не добавлены, приложение автоматически использует системные шрифты:
- Вместо Proxima Vara: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
- Вместо Berkeley Mono: ui-monospace, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas

## Статус
✅ CSS правила добавлены
✅ Fallback шрифты настроены
⚠️ Требуется добавить файлы шрифтов в `public/fonts/` 