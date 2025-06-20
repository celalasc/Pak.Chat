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
  forceRegeneration,
  isRegenerating,
}: {
  threadId: string;
  messages: UIMessage[];
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  append: UseChatHelpers['append'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  stop: UseChatHelpers['stop'];
  forceRegeneration: () => void;
  isRegenerating: boolean;
}) {
  // Показываем прыгающие точки когда сообщение отправлено или идет регенерация
  const lastMessage = messages[messages.length - 1];
  const shouldShowLoading = (status === 'submitted' && lastMessage?.role === 'user') || 
                           (isRegenerating && lastMessage?.role === 'user');

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
          forceRegeneration={forceRegeneration}
        />
      ))}
      {shouldShowLoading && <MessageLoading />}
      {error && <Error message={error.message} />}
    </section>
  );
}

const Messages = memo(PureMessages, (prevProps, nextProps) => {
  return (
    equal(prevProps.messages, nextProps.messages) &&
    prevProps.status === nextProps.status &&
    prevProps.error === nextProps.error &&
    prevProps.isRegenerating === nextProps.isRegenerating
  );
});

Messages.displayName = 'Messages';

// Enable virtualization once the chat grows to 20 messages.
function MessagesRoot(props: any) {
  return props.messages.length > 20 ? (
    <div style={{ height: '100%', width: '100%' }}>
      <VirtualMessages {...props} />
    </div>
  ) : (
    <Messages {...props} />
  );
}

export default MessagesRoot;
