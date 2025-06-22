import { getSingletonHighlighter } from 'shiki/bundle/web';

interface WorkerMessage {
  code: string;
  lang: string;
  id: string;
  theme?: string;
}

let highlighter: any = null;
const lightTheme = 'github-light';
const darkTheme = 'material-theme-darker';

// Инициализируем подсветчик один раз с обеими темами
async function initializeHighlighter() {
  if (!highlighter) {
    highlighter = await getSingletonHighlighter({
      themes: [lightTheme, darkTheme],
      langs: [], // Не загружаем языки заранее
    });
  }
  return highlighter;
}

self.onmessage = async (ev: MessageEvent<WorkerMessage>) => {
  const { code, lang, id, theme } = ev.data;
  
  try {
    const highlighterInstance = await initializeHighlighter();
    
    if (!highlighterInstance) {
      throw new Error('Failed to initialize highlighter');
    }
    
    // Определяем какую тему использовать
    const selectedTheme = theme === 'light' ? lightTheme : darkTheme;
    
    // Определяем какой язык использовать
    let finalLang = lang;
    
    // Проверяем, есть ли такой язык, если нет - загружаем
    try {
      if (!highlighterInstance.getLoadedLanguages().includes(finalLang as any)) {
        await highlighterInstance.loadLanguage(finalLang as any);
      }
    } catch (langError) {
      // Если язык не найден, используем plaintext
      console.warn(`Language "${finalLang}" not found, using plaintext`);
      finalLang = 'text';
    }
    
    // Пытаемся подсветить код
    const html = highlighterInstance.codeToHtml(code, { 
      lang: finalLang as any, 
      theme: selectedTheme
    });
    
    self.postMessage({ status: 'success', html, id });
  } catch (error) {
    console.error(`Shiki worker error for lang "${lang}":`, error);
    // В случае ошибки возвращаем исходный код
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({ status: 'error', code, id, error: errorMessage });
  }
};
