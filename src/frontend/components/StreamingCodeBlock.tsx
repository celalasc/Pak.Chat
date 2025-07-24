import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { getShikiWorker } from '@/frontend/worker/shikiWorkerFactory';
import { Check, Copy, Download } from 'lucide-react';
import { copyText } from '@/lib/copyText';
import { useTheme } from 'next-themes';

interface StreamingCodeBlockProps {
  lang: string;
  codeString: string;
  isStreaming: boolean;
}

function Codebar({ lang, codeString }: { lang: string; codeString: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await copyText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleDownload = useCallback(() => {
    const extensions: Record<string, string> = {
      javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
      cpp: 'cpp', c: 'c', csharp: 'cs', html: 'html', css: 'css',
      json: 'json', xml: 'xml', yaml: 'yml', sql: 'sql', shell: 'sh',
      php: 'php', go: 'go', rust: 'rs', kotlin: 'kt', swift: 'swift',
      r: 'r', matlab: 'm'
    };
    
    const ext = extensions[lang.toLowerCase()] || 'txt';
    const blob = new Blob([codeString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_snippet.${ext}`;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) {
      // Безопасно удаляем созданную ссылку
      a.remove();
    }
    URL.revokeObjectURL(url);
  }, [codeString, lang]);

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-muted/80 dark:bg-muted/60 border-b border-border backdrop-blur-sm rounded-t-lg">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{lang}</span>
      <div className="flex items-center gap-2">
        <button onClick={handleDownload} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={copyToClipboard} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function StreamingCodeBlock({ lang, codeString, isStreaming }: StreamingCodeBlockProps) {
  const { theme } = useTheme();
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [showHighlighted, setShowHighlighted] = useState(false);
  const [isStable, setIsStable] = useState(false);
  const prevCodeRef = useRef<string>('');
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<string>('');
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialHighlightTriggered = useRef(false);

  // Получаем тему с fallback на системную
  const getEffectiveTheme = useCallback(() => {
    if (theme && theme !== 'system') return theme;
    
    // Fallback на системную тему
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    return 'light'; // Дефолтная тема
  }, [theme]);

  // Функция для запуска подсветки
  const triggerHighlighting = useCallback((code: string, immediate = false) => {
    if (!code.trim()) return;
    
    const effectiveTheme = getEffectiveTheme();
    prevCodeRef.current = code;
    
    const worker = getShikiWorker();
    workerRef.current = worker;
    
    const requestId = `${lang}-${Date.now()}-${Math.random()}`;
    requestIdRef.current = requestId;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.id === requestId) {
        if (event.data.status === 'success') {
          setHighlightedCode(event.data.html);
          
          if (immediate) {
            // Моментально для готового кода
            setShowHighlighted(true);
          } else {
            // С анимацией для стриминга
            requestAnimationFrame(() => {
              setTimeout(() => setShowHighlighted(true), 50);
            });
          }
        } else {
          console.warn(`Highlighting failed for ${lang}:`, event.data.error);
          setHighlightedCode(null);
        }
        worker.removeEventListener('message', handleMessage);
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ 
      code, 
      lang, 
      id: requestId, 
      theme: effectiveTheme === 'dark' ? 'dark' : 'light'
    });
  }, [lang, getEffectiveTheme]);

  // Моментальная подсветка для готового кода (используем useLayoutEffect для синхронности)
  useLayoutEffect(() => {
    if (!isStreaming && codeString.trim() && !initialHighlightTriggered.current) {
      initialHighlightTriggered.current = true;
      triggerHighlighting(codeString, true);
    }
  }, [codeString, isStreaming, triggerHighlighting]);

  // Определяем когда код "стабилизировался" (не изменялся 1000мс)
  useEffect(() => {
    if (isStreaming && codeString.trim()) {
      // Сбрасываем таймер при каждом изменении
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
      
      // Устанавливаем новый таймер с увеличенной задержкой
      stabilityTimerRef.current = setTimeout(() => {
        setIsStable(true);
      }, 1000); // 1000мс без изменений = блок завершен
    }

    return () => {
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
    };
  }, [codeString, isStreaming]);

  // Подсветка для стриминг кода
  useEffect(() => {
    const shouldHighlight = isStable && codeString.trim() && codeString !== prevCodeRef.current;
    
    if (shouldHighlight) {
      triggerHighlighting(codeString, false);
    }
  }, [codeString, isStable, triggerHighlighting]);

  // Обновление при смене темы
  useEffect(() => {
    if (highlightedCode !== null && codeString.trim()) {
      triggerHighlighting(codeString, true);
    }
  }, [getEffectiveTheme, highlightedCode, codeString, triggerHighlighting]);

  // Сброс состояния при изменении контента
  useEffect(() => {
    // Сбрасываем если начался новый блок
    if (prevCodeRef.current && codeString.length < prevCodeRef.current.length / 2) {
      setHighlightedCode(null);
      setShowHighlighted(false);
      setIsStable(false);
      prevCodeRef.current = '';
      initialHighlightTriggered.current = false;
    }
  }, [codeString]);

  const currentTheme = getEffectiveTheme();

  return (
    <div className="my-4 rounded-lg border border-border/40 bg-card/50 dark:bg-card/30 shadow-sm overflow-hidden">
      <Codebar lang={lang} codeString={codeString} />
      <div className="p-4 bg-background/50 dark:bg-background/30">
        <div className="min-h-[1.5rem] relative">
          {/* Сырой код - всегда присутствует как основа */}
          <div 
            className={`transition-opacity duration-300 ease-in-out ${
              showHighlighted ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <pre className="bg-transparent m-0 p-0 overflow-x-auto text-sm font-mono leading-6">
              <code className={`block whitespace-pre ${
                currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {codeString}
              </code>
            </pre>
          </div>
          
          {/* Подсвеченный код - появляется поверх */}
          {highlightedCode && (
            <div 
              className={`absolute top-0 left-0 right-0 transition-opacity duration-300 ease-in-out ${
                showHighlighted ? 'opacity-100' : 'opacity-0'
              } overflow-x-auto`}
            >
              <div 
                className="[&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:!text-sm [&_pre]:!font-mono [&_pre]:!leading-6 [&_code]:!text-sm [&_code]:!font-mono [&_code]:!leading-6 [&_code]:!block"
                dangerouslySetInnerHTML={{ __html: highlightedCode }} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 