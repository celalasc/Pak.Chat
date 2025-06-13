import { memo, useRef, useEffect } from 'react';
import PreviewMessage from './Message';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import MessageLoading from './ui/MessageLoading';
import Error from './Error';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAutoHide } from '../hooks/useAutoHide';

// Height estimate for each message in the virtualized list. Keeping this
// outside the component ensures the function is not recreated on every render.
const ESTIMATED_MESSAGE_HEIGHT = 200;

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

  // Reference to the scroll container used by the virtualizer
  const parentRef = useRef<HTMLDivElement>(null);

  // Initialize the virtualizer; this handles measuring and rendering only
  // the visible portion of a potentially long list of messages.
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_MESSAGE_HEIGHT,
    overscan: 5,
  });

  // Cache the virtualizer instance so effects have a stable reference.
  const rowVirtualizerRef = useRef(rowVirtualizer);
  rowVirtualizerRef.current = rowVirtualizer;

  // Anchor element used to maintain scroll position when new messages arrive.
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
    if (atBottom && messages.length) {
      // Scroll to the anchor element instead of recalculating the entire tree.
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <section
      ref={parentRef}
      className="flex flex-col space-y-12 h-full overflow-y-auto"
    >
      {shouldVirtualize ? (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const message = messages[virtualItem.index];
            return (
              <div
                key={message.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <PreviewMessage
                  threadId={threadId}
                  message={message}
                  isStreaming={
                    status === 'streaming' && messages.length - 1 === virtualItem.index
                  }
                  setMessages={setMessages}
                  reload={reload}
                  stop={stop}
                  // Visibility of message controls is managed via useAutoHide
                  isControlsVisible={activeControlsId === message.id}
                  onShowControls={() => showControls(message.id)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        messages.map((message, index) => (
          <PreviewMessage
            key={message.id}
            threadId={threadId}
            message={message}
            isStreaming={status === 'streaming' && messages.length - 1 === index}
            setMessages={setMessages}
            reload={reload}
            stop={stop}
            isControlsVisible={activeControlsId === message.id}
            onShowControls={() => showControls(message.id)}
          />
        ))
      )}

      {status === 'submitted' && <MessageLoading />}
      {error && <Error message={error.message} />}
      <div ref={bottomAnchorRef} />
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
