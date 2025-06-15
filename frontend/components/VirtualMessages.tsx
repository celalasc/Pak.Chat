import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import PreviewMessage from './Message';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';

interface Props {
  messages: UIMessage[];
  threadId: string;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  stop: UseChatHelpers['stop'];
}

export default function VirtualMessages({ messages, ...rest }: Props) {
  const itemHeight = 240;
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={messages.length}
          itemSize={itemHeight}
          width={width}
          overscanCount={4}
        >
          {({ index, style }) => (
            <div style={style}>
              <PreviewMessage
                {...rest}
                message={messages[index]}
                isStreaming={
                  rest.status === 'streaming' && index === messages.length - 1
                }
              />
            </div>
          )}
        </List>
      )}
    </AutoSizer>
  );
}
