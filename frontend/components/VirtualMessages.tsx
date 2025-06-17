import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import PreviewMessage from './Message';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';

interface Props {
  messages: UIMessage[];
  threadId: string;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  append: UseChatHelpers['append'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  stop: UseChatHelpers['stop'];
}

export default function VirtualMessages({ messages, ...rest }: Props) {
  const getItemSize = (index: number) => {
    const msg = messages[index];
    const textLength = msg.parts
      .map((p) => (p.type === 'text' ? p.text.length : 0))
      .reduce((a, b) => a + b, 0);
    const lines = Math.max(1, Math.ceil(textLength / 80));
    return 80 + lines * 24;
  };
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={messages.length}
          itemSize={getItemSize}
          width={width}
          overscanCount={4}
        >
          {({ index, style }) => (
            <div style={style}>
              <PreviewMessage
                {...rest}
                messages={messages}
                message={messages[index]}
                isStreaming={
                  rest.status === 'streaming' && index === messages.length - 1
                }
                append={rest.append}
              />
            </div>
          )}
        </List>
      )}
    </AutoSizer>
  );
}
