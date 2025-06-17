import { memo, useMemo, createContext, useContext } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import { marked } from 'marked';
import CodeBlock from './CodeBlock';
type MarkdownSize = 'default' | 'small';

// Context to pass size down to components
const MarkdownSizeContext = createContext<MarkdownSize>('default');

// Common markdown components used for rendering
const baseComponents: Components = {
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


function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

function PureMarkdownRendererBlock({
  content,
  components,
}: {
  content: string;
  components: Components;
}) {
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
    if (prevProps.components !== nextProps.components) return false;
    return true;
  }
);

MarkdownRendererBlock.displayName = 'MarkdownRendererBlock';

const MemoizedMarkdown = memo(
  ({
    content,
    id,
    size = 'default',
    isStreaming,
  }: {
    content: string;
    id: string;
    size?: MarkdownSize;
    isStreaming?: boolean;
  }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    const proseClasses =
      size === 'small'
        ? 'prose prose-sm dark:prose-invert bread-words max-w-none w-full prose-code:before:content-none prose-code:after:content-none'
        : 'prose prose-base dark:prose-invert bread-words max-w-none w-full prose-code:before:content-none prose-code:after:content-none';

    // Components with current streaming state
    const components = useMemo<Components>(
      () => ({
        ...baseComponents,
        code: (props) => <CodeBlock {...props} isStreaming={isStreaming} />,
      }),
      [isStreaming]
    );

    return (
      <MarkdownSizeContext.Provider value={size}>
        <div className={proseClasses}>
          {blocks.map((block, index) => (
            <MarkdownRendererBlock
              components={components}
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
