// frontend/components/MemoizedMarkdown.tsx
import { memo, useMemo, createContext, useContext } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import StreamingCodeBlock from './StreamingCodeBlock';
import type { ComponentProps } from 'react';
import type { ExtraProps } from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

type CodeComponentProps = ComponentProps<'code'> & ExtraProps & {
  isStreaming?: boolean;
};
type MarkdownSize = 'default' | 'small';

// Context to pass size and streaming down to components
const MarkdownContext = createContext<{
  size: MarkdownSize;
  isStreaming: boolean;
}>({
  size: 'default',
  isStreaming: false,
});

const components: Components = {
  code: CodeBlock as Components['code'],
  pre: ({ children }) => <>{children}</>,
};

function CodeBlock({ children, className, ...props }: CodeComponentProps) {
  const { size, isStreaming } = useContext(MarkdownContext);
  const match = /language-(\w+)/.exec(className || '');

  // Для блоков кода используем наш новый компонент с реал-тайм подсветкой
  if (match && children) {
    return (
      <StreamingCodeBlock
        lang={match[1]}
        codeString={String(children).replace(/\n$/, '')}
        isStreaming={isStreaming}
      />
    );
  }

  // Для инлайн-кода оставляем старую логику
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
    <MarkdownContext.Provider value={{ size: 'default', isStreaming: streaming }}>
      <div className={proseClasses}>
        {blocks.map((block, index) => (
          <MarkdownRendererBlock
            content={block}
            key={`markdown-block-${index}`}
          />
        ))}
      </div>
    </MarkdownContext.Provider>
  );
});

MemoizedMarkdown.displayName = 'MemoizedMarkdown';
export default MemoizedMarkdown;