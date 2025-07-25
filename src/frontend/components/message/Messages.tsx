import { memo } from 'react';
import PreviewMessage from './Message';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import MessageLoading from '../ui/MessageLoading';
import Error from '../Error';

// Убираем виртуализацию - всегда используем обычные сообщения
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
  isFirstMessagePending,
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
  isFirstMessagePending?: boolean;
}) {
  // Логика индикатора загрузки теперь учитывает isRegenerating и первое сообщение.
  const lastMessage = messages[messages.length - 1];
  const shouldShowLoading =
    (status === 'submitted' && lastMessage?.role === 'user') ||
    (status === 'streaming' && lastMessage?.role === 'user') ||
    (isRegenerating && lastMessage?.role === 'user') ||
    (isFirstMessagePending && messages.length === 0);

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

// Мемоизированный компонент Messages
const MemoizedMessages = memo(PureMessages, (prevProps, nextProps) => {
  return (
    equal(prevProps.messages, nextProps.messages) &&
    prevProps.status === nextProps.status &&
    prevProps.error === nextProps.error &&
    prevProps.isRegenerating === nextProps.isRegenerating &&
    prevProps.isFirstMessagePending === nextProps.isFirstMessagePending
  );
});

MemoizedMessages.displayName = 'Messages';

export interface MessagesProps
  extends React.ComponentProps<typeof PureMessages> {
  /**
   * Ref элемента, который скроллится. Не используется без виртуализации.
   */
  scrollRef?: React.Ref<HTMLDivElement>;
}

// Простой компонент без виртуализации
export default function Messages({ scrollRef, ...props }: MessagesProps) {
  return <MemoizedMessages {...props} />;
}