// frontend/components/MemoizedMarkdown.tsx
import { memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import CopyButton from './ui/CopyButton';
import { Download } from 'lucide-react';
import { useCallback } from 'react';

// Компонент для шапки блока кода с кнопками "Копировать" и "Скачать"
function CodeHeader({ lang, codeString }: { lang: string; codeString: string }) {
  const handleDownload = useCallback(() => {
    const fileExtension = lang === 'plaintext' ? 'txt' : lang;
    const blob = new Blob([codeString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_snippet.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [codeString, lang]);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary rounded-t-lg border-b border-border">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{lang}</span>
      <div className="flex items-center gap-2">
        <button onClick={handleDownload} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Скачать фрагмент кода">
          <Download className="w-4 h-4" />
        </button>
        <CopyButton code={codeString} />
      </div>
    </div>
  );
}

const MemoizedMarkdown = memo(({ content }: { content: string }) => {
  const components: Components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');

      // Если это большой блок кода (не inline и есть язык)
      if (!inline && match) {
        return (
          <div className="relative my-4 rounded-lg border border-border bg-background">
            <CodeHeader lang={match[1]} codeString={codeString} />
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', borderRadius: '0 0 0.5rem 0.5rem', fontFamily: 'var(--font-mono)' }}
              codeTagProps={{ style: { fontFamily: 'inherit' } }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      // Если это простой inline-код
      return (
        <code className="mx-0.5 rounded-md bg-secondary px-1.5 py-1 font-mono text-sm" {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="prose prose-base dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

MemoizedMarkdown.displayName = 'MemoizedMarkdown';
export default MemoizedMarkdown;
