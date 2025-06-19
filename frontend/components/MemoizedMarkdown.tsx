// frontend/components/MemoizedMarkdown.tsx
import { memo, useMemo, useState, createContext, useContext } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import ShikiHighlighter from 'react-shiki';
import type { ComponentProps } from 'react';
import type { ExtraProps } from 'react-markdown';
import { Check, Copy, Download } from 'lucide-react';
import { useCallback } from 'react';
import { copyText } from '@/lib/copyText';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

type CodeComponentProps = ComponentProps<'code'> & ExtraProps;
type MarkdownSize = 'default' | 'small';

// Context to pass size down to components
const MarkdownSizeContext = createContext<MarkdownSize>('default');

const components: Components = {
  code: CodeBlock as Components['code'],
  pre: ({ children }) => <>{children}</>,
};

function CodeBlock({ children, className, ...props }: CodeComponentProps) {
  const size = useContext(MarkdownSizeContext);
  const match = /language-(\w+)/.exec(className || '');

  if (match) {
    const lang = match[1];
    const codeString = String(children);
    
    return (
      <div className="my-4 rounded-lg border border-border/40 bg-card/50 dark:bg-card/30 shadow-sm overflow-hidden">
        <Codebar lang={lang} codeString={codeString} />
        <ShikiHighlighter
          language={lang}
          theme={'material-theme-darker'}
          className="text-sm font-mono overflow-x-auto"
          showLanguage={false}
          style={{
            background: 'var(--color-background)',
            backgroundColor: 'var(--color-background)',
            padding: '1rem',
          }}
        >
          {codeString}
        </ShikiHighlighter>
      </div>
    );
  }

  const inlineCodeClasses =
    size === 'small'
      ? 'mx-0.5 overflow-auto rounded-md px-1 py-0.5 bg-secondary px-1.5 py-1 font-mono text-xs'
      : 'mx-0.5 overflow-auto rounded-md px-2 py-1 bg-secondary px-1.5 py-1 font-mono text-sm';

  return (
    <code className={inlineCodeClasses} {...props}>
      {children}
    </code>
  );
}

function Codebar({ lang, codeString }: { lang: string; codeString: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await copyText(codeString);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code to clipboard:', error);
    }
  };

  const handleDownload = useCallback(() => {
    let fileExtension = 'txt';
    switch (lang.toLowerCase()) {
      case 'javascript': case 'js': fileExtension = 'js'; break;
      case 'typescript': case 'ts': fileExtension = 'ts'; break;
      case 'python': case 'py': fileExtension = 'py'; break;
      case 'java': fileExtension = 'java'; break;
      case 'cpp': case 'c++': fileExtension = 'cpp'; break;
      case 'c': fileExtension = 'c'; break;
      case 'csharp': case 'c#': fileExtension = 'cs'; break;
      case 'html': fileExtension = 'html'; break;
      case 'css': fileExtension = 'css'; break;
      case 'scss': case 'sass': fileExtension = 'scss'; break;
      case 'json': fileExtension = 'json'; break;
      case 'xml': fileExtension = 'xml'; break;
      case 'yaml': case 'yml': fileExtension = 'yml'; break;
      case 'sql': fileExtension = 'sql'; break;
      case 'shell': case 'bash': case 'sh': fileExtension = 'sh'; break;
      case 'php': fileExtension = 'php'; break;
      case 'go': fileExtension = 'go'; break;
      case 'rust': case 'rs': fileExtension = 'rs'; break;
      case 'kotlin': case 'kt': fileExtension = 'kt'; break;
      case 'swift': fileExtension = 'swift'; break;
      case 'r': fileExtension = 'r'; break;
      case 'matlab': fileExtension = 'm'; break;
      case 'plaintext': case 'text': default: fileExtension = 'txt'; break;
    }
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
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-muted/80 dark:bg-muted/60 border-b border-border backdrop-blur-sm rounded-t-lg">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{lang}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Скачать фрагмент кода"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={copyToClipboard}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Копировать код"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

function PureMarkdownRendererBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}

const MarkdownRendererBlock = memo(
  PureMarkdownRendererBlock,
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  }
);

MarkdownRendererBlock.displayName = 'MarkdownRendererBlock';

interface MemoizedMarkdownProps {
  content: string;
  streaming?: boolean;
}

const MemoizedMarkdown = memo(({ content, streaming = false }: MemoizedMarkdownProps) => {
  // Удаляем теги reasoning из основного контента, так как они выводятся отдельно
  const sanitizedContent = content
    // Удаляем блок <think> … </think> или до конца строки, если закрывающего тега ещё нет
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
    // Удаляем токены вида g:"..."
    .replace(/\bg:"[^"]+"/g, '')
    .trim();

  const blocks = useMemo(() => parseMarkdownIntoBlocks(sanitizedContent), [sanitizedContent]);

  const proseClasses = 'prose prose-base dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none';

  return (
    <MarkdownSizeContext.Provider value="default">
      <div className={proseClasses}>
        {blocks.map((block, index) => (
          <MarkdownRendererBlock
            content={block}
            key={`markdown-block-${index}`}
          />
        ))}
      </div>
    </MarkdownSizeContext.Provider>
  );
});

MemoizedMarkdown.displayName = 'MemoizedMarkdown';
export default MemoizedMarkdown;