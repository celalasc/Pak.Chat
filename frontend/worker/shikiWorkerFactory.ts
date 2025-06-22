let worker: Worker | null = null;

export function getShikiWorker(): Worker {
  if (worker) {
    return worker;
  }
  
  // Создаем воркер один раз
  worker = new Worker(new URL('./shikiWorker.ts', import.meta.url), {
    type: 'module',
  });
  
  return worker;
}

// Функция для очистки воркера при необходимости
export function cleanupShikiWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
