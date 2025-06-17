import React, {
  DetailedHTMLProps,
  HTMLAttributes,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { getShikiWorker } from '@/worker/shikiWorkerFactory';
import CopyButton from '@/components/ui/CopyButton';
import { escapeHtml } from '@/lib/escapeHtml';

type CodeProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  className?: string;
  children: React.ReactNode;
  isStreaming?: boolean;
};

export default function CodeBlock({ className = '', children, ...rest }: CodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const languageMatch = /language-(\w+)/.exec(className);
  const language = languageMatch?.[1] ?? 'plaintext';
  const code = typeof children === 'string' ? children : React.Children.toArray(children).join('');

  /** 150 мс = комфортный отклик, не создаёт «водопада» сообщений в воркер */
  const highlight = useDebouncedCallback(async (src: string) => {
    const worker = await getShikiWorker(language);
    worker.postMessage({ code: src, lang: language });
    worker.onmessage = (e: MessageEvent<string>) => setHtml(e.data);
  }, 150);

  useEffect(() => {
    highlight(code);
    return highlight.cancel;
  }, [code, highlight]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div
      ref={containerRef}
      className="code-block-container relative rounded-lg border border-border bg-secondary overflow-auto max-h-[500px]"
      {...rest}
    >
      {/* Шапка */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-secondary rounded-t-lg">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
        <CopyButton copied={copied} onClick={handleCopy} />
      </div>

      {/* Контент */}
      <pre
        className="shiki !bg-transparent !p-4 !rounded-b-lg text-sm font-mono leading-snug"
        role="region"
        aria-label={`Исходный код на ${language}`}
        dangerouslySetInnerHTML={{
          __html: html || `<code>${escapeHtml(code)}</code>`,
        }}
      />
    </div>
  );
}
