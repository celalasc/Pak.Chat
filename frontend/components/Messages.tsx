import { memo } from 'react';
import PreviewMessage from './Message';
import VirtualMessages from './VirtualMessages';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import MessageLoading from './ui/MessageLoading';
import Error from './Error';

function PureMessages({
  threadId,
  messages,
  status,
  setMessages,
  reload,
  append,
  error,
  stop,
}: {
  threadId: string;
  messages: UIMessage[];
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  append: UseChatHelpers['append'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  stop: UseChatHelpers['stop'];
}) {
  // Показываем прыгающие точки только когда сообщение отправлено но ответ не начался
  const lastMessage = messages[messages.length - 1];
  const shouldShowLoading = status === 'submitted' && lastMessage?.role === 'user';

  return (
    <section className="flex flex-col space-y-12">
      {messages.map((message) => (
        <PreviewMessage
          key={message.id}
          messages={messages}
          threadId={threadId}
          message={message}
          isStreaming={
            status === 'streaming' && messages[messages.length - 1]?.id === message.id
          }
          append={append}
          setMessages={setMessages}
          reload={reload}
          stop={stop}
        />
      ))}
      {shouldShowLoading && <MessageLoading />}
      {error && <Error message={error.message} />}
    </section>
  );
}

const PureMessagesMemo = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.error !== nextProps.error) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  return true;
});

PureMessagesMemo.displayName = 'Messages';

// Enable virtualization once the chat grows to 20 messages.
export const LargeListBoundary = 20;

export interface MessagesProps
  extends React.ComponentProps<typeof PureMessages> {
  /**
   * Ref of the element that actually scrolls. Needed so the parent can
   * track scroll position when virtualization is enabled.
   */
  scrollRef?: React.Ref<HTMLDivElement>;
}

export default function Messages({ scrollRef, ...props }: MessagesProps) {
  return props.messages.length > LargeListBoundary ? (
    <div className="h-full flex-1">
      <VirtualMessages {...props} outerRef={scrollRef} />
    </div>
  ) : (
    <PureMessagesMemo {...props} />
  );
}
