// Тестовый скрипт для проверки производительности стриминга
// Запустите его в консоли браузера при открытом чате

// Функция для измерения производительности рендеринга
function measureStreamingPerformance() {
  const startTime = performance.now();
  let frameCount = 0;
  let lastFrameTime = startTime;
  
  const observer = new MutationObserver((mutations) => {
    frameCount++;
    const currentTime = performance.now();
    const frameDuration = currentTime - lastFrameTime;
    
    if (frameDuration > 50) { // Фреймы длиннее 50ms считаются лагами
      console.warn(`Lag detected: ${frameDuration.toFixed(2)}ms`);
    }
    
    lastFrameTime = currentTime;
  });
  
  // Наблюдаем за изменениями в области сообщений
  const messagesArea = document.getElementById('messages-scroll-area');
  if (messagesArea) {
    observer.observe(messagesArea, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    console.log('Performance monitoring started. Send a message to test streaming performance.');
    
    // Останавливаем наблюдение через 30 секунд
    setTimeout(() => {
      observer.disconnect();
      const totalTime = performance.now() - startTime;
      const avgFrameTime = totalTime / frameCount;
      
      console.log('=== Performance Report ===');
      console.log(`Total frames: ${frameCount}`);
      console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
      console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
      console.log(`Target frame time: 16.67ms (60 FPS)`);
      console.log(`Performance score: ${avgFrameTime < 16.67 ? 'EXCELLENT' : avgFrameTime < 33.33 ? 'GOOD' : avgFrameTime < 50 ? 'FAIR' : 'POOR'}`);
    }, 30000);
  } else {
    console.error('Messages area not found. Make sure you are on the chat page.');
  }
}

// Функция для симуляции нагрузки (опционально)
function simulateStreamingLoad() {
  const testMessage = `
# Тестовое сообщение для проверки производительности

Это длинное сообщение с различными элементами для тестирования производительности стриминга.

## Код на Python
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# Тестируем функцию
for i in range(10):
    print(f"Fibonacci({i}) = {fibonacci(i)}")
\`\`\`

## Математические формулы
Квадратное уравнение: $ax^2 + bx + c = 0$

Решение: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

## Список с подробностями
1. **Первый пункт** - с жирным текстом
2. *Второй пункт* - с курсивом
3. \`Третий пункт\` - с инлайн кодом
4. [Четвертый пункт](https://example.com) - со ссылкой

## Таблица данных
| Колонка 1 | Колонка 2 | Колонка 3 |
|-----------|-----------|-----------|
| Данные 1  | Данные 2  | Данные 3  |
| Данные 4  | Данные 5  | Данные 6  |
| Данные 7  | Данные 8  | Данные 9  |

Это конец тестового сообщения для проверки производительности.
`;
  
  // Симулируем ввод в поле чата
  const inputElement = document.querySelector('textarea[name="message"]');
  if (inputElement) {
    inputElement.value = testMessage;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('Test message loaded. Press Enter or click Send to start the test.');
  } else {
    console.error('Chat input not found.');
  }
}

console.log('Performance testing functions loaded.');
console.log('Run measureStreamingPerformance() to start monitoring.');
console.log('Run simulateStreamingLoad() to load a test message.');
