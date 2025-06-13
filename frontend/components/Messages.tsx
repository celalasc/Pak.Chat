import { memo, useEffect } from 'react';
import PreviewMessage from './Message';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import MessageLoading from './ui/MessageLoading';
import Error from './Error';
import useAutoHide from '../hooks/useAutoHide';
import useVirtual from '../hooks/useVirtual';

function PureMessages({
  threadId,
  messages,
  status,
  setMessages,
  reload,
  error,
  stop,
}: {
  threadId: string;
  messages: UIMessage[];
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  stop: UseChatHelpers['stop'];
}) {
  const { id: activeControlsId, show: showControls } = useAutoHide(800);
  const shouldVirtualize = messages.length >= 50;
  const { parentRef, virtualizer } = useVirtual({
    count: messages.length,
    estimateSize: () => 200,
    overscan: 5,
    threshold: 50,
  });

  useEffect(() => {
    const doc = document.documentElement;
    const atBottom = doc.scrollHeight - doc.scrollTop - doc.clientHeight < 10;
    if (atBottom) {
      if (shouldVirtualize) {
        virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
      } else {
        window.scrollTo({ top: doc.scrollHeight });
      }
    }
  }, [messages.length, status, shouldVirtualize, virtualizer]);

  return (
    <section
      ref={shouldVirtualize ? parentRef : undefined}
      className={shouldVirtualize ? 'relative' : 'flex flex-col space-y-12'}
      style={shouldVirtualize ? { height: virtualizer.getTotalSize() } : undefined}
    >
      {shouldVirtualize
        ? virtualizer.getVirtualItems().map((item) => {
            const message = messages[item.index];
            return (
              <div
                key={message.id}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${item.start}px)`,
                }}
                className={item.index === 0 ? '' : 'mt-12'}
              >
                <PreviewMessage
                  threadId={threadId}
                  message={message}
                  isStreaming={
                    status === 'streaming' && messages.length - 1 === item.index
                  }
                  setMessages={setMessages}
                  reload={reload}
                  stop={stop}
                  isControlsVisible={activeControlsId === message.id}
                  onShowControls={() => showControls(message.id)}
                />
              </div>
            );
          })
        : messages.map((message, index) => (
            <PreviewMessage
              key={message.id}
              threadId={threadId}
              message={message}
              isStreaming={
                status === 'streaming' && messages.length - 1 === index
              }
              setMessages={setMessages}
              reload={reload}
              stop={stop}
              isControlsVisible={activeControlsId === message.id}
              onShowControls={() => showControls(message.id)}
            />
          ))}
      {status === 'submitted' && <MessageLoading />}
      {error && <Error message={error.message} />}
    </section>
  );
}

const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.error !== nextProps.error) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  return true;
});

Messages.displayName = 'Messages';

export default Messages;
