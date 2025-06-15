import { memo, useMemo, useState, createContext, useContext } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import { marked } from 'marked';
import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import type { ExtraProps } from 'react-markdown';
import { Check, Copy } from 'lucide-react';
import { useTheme } from 'next-themes';

type CodeComponentProps = ComponentProps<'code'> & ExtraProps;
type MarkdownSize = 'default' | 'small';

// Context to pass size down to components
const MarkdownSizeContext = createContext<MarkdownSize>('default');

const components: Components = {
  code: CodeBlock as Components['code'],
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div 
      className="overflow-x-auto" 
      style={{
        scrollbarWidth: 'none',  // Firefox
        msOverflowStyle: 'none', // IE and Edge
      }}
    >
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <table className="min-w-full border-collapse">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border px-4 py-2 text-left bg-secondary/50">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border px-4 py-2">
      {children}
    </td>
  ),
};

function CodeBlock({ children, className, ...props }: CodeComponentProps) {
  const size = useContext(MarkdownSizeContext);
  const { theme } = useTheme();
  const match = /language-(\w+)/.exec(className || '');

  if (match) {
    const lang = match[1];
    const shikiTheme = theme === 'light' ? 'github-light' : 'material-theme-darker';

    const [html, setHtml] = useState<string | null>(null);
    const codeRef = useRef(String(children));

    useEffect(() => {
      const worker = new Worker(new URL('../worker/shikiWorker.ts', import.meta.url), { type: 'module' });
      worker.postMessage({ code: codeRef.current, lang, theme: shikiTheme });
      worker.onmessage = (e) => setHtml(e.data as string);
      return () => worker.terminate();
    }, [lang, shikiTheme]);

    return (
      <div className="rounded-none">
        <Codebar lang={lang} codeString={codeRef.current} />
        <pre className="shiki text-sm font-mono" dangerouslySetInnerHTML={{ __html: html || '' }} />
      </div>
    );
  }

  const inlineCodeClasses =
    size === 'small'
      ? 'mx-0.5 overflow-auto rounded-md px-1 py-0.5 bg-primary/10 text-foreground font-mono text-xs'
      : 'mx-0.5 overflow-auto rounded-md px-2 py-1 bg-primary/10 text-foreground font-mono';

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
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code to clipboard:', error);
    }
  };

  return (
    <div className="flex justify-between items-center px-4 py-2 bg-secondary text-foreground rounded-t-md">
      <span className="text-sm font-mono">{lang}</span>
      <button onClick={copyToClipboard} className="text-sm cursor-pointer">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
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
      remarkPlugins={[remarkGfm, [remarkMath]]}
      rehypePlugins={[rehypeKatex, rehypeSanitize]}
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

const MemoizedMarkdown = memo(
  ({
    content,
    id,
    size = 'default',
  }: {
    content: string;
    id: string;
    size?: MarkdownSize;
  }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    const proseClasses =
      size === 'small'
        ? 'prose prose-sm dark:prose-invert bread-words max-w-none w-full prose-code:before:content-none prose-code:after:content-none'
        : 'prose prose-base dark:prose-invert bread-words max-w-none w-full prose-code:before:content-none prose-code:after:content-none';

    return (
      <MarkdownSizeContext.Provider value={size}>
        <div className={proseClasses}>
          {blocks.map((block, index) => (
            <MarkdownRendererBlock
              content={block}
              key={`${id}-block-${index}`}
            />
          ))}
        </div>
      </MarkdownSizeContext.Provider>
    );
  }
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown';

export default MemoizedMarkdown;
