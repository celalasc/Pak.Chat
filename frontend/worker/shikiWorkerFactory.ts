const cache: Record<string, Worker> = {};

export async function getShikiWorker(lang: string): Promise<Worker> {
  if (cache[lang]) return cache[lang];
  const worker = new Worker(new URL('./shikiWorker.ts', import.meta.url), {
    type: 'module',
  });
  cache[lang] = worker;
  return worker;
}
