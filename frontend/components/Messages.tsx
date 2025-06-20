import { memo } from 'react';
import PreviewMessage from './Message';
import VirtualMessages from './VirtualMessages';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import MessageLoading from './ui/MessageLoading';
import Error from './Error';

// Шаг 1: Оставляем PureMessages из `fix/responsive-navigation-bug` с параметрами регенерации.
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
  // Логика индикатора загрузки теперь учитывает isRegenerating.
  const lastMessage = messages[messages.length - 1];
  const shouldShowLoading =
    (status === 'submitted' && lastMessage?.role === 'user') ||
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

// Переименовываем мемоизированный компонент, чтобы избежать конфликта имен с компонентом-оберткой.
// Логика сравнения взята из `fix/responsive-navigation-bug` для учета `isRegenerating`.
const MemoizedMessages = memo(PureMessages, (prevProps, nextProps) => {
  return (
    equal(prevProps.messages, nextProps.messages) &&
    prevProps.status === nextProps.status &&
    prevProps.error === nextProps.error &&
    prevProps.isRegenerating === nextProps.isRegenerating
  );
});

MemoizedMessages.displayName = 'Messages';

// Шаг 2: Оставляем новую структуру экспорта из `main`.
export const LargeListBoundary = 20;

export interface MessagesProps
  extends React.ComponentProps<typeof PureMessages> {
  /**
   * Ref элемента, который скроллится. Нужен для отслеживания
   * позиции скролла при включенной виртуализации.
   */
  scrollRef?: React.Ref<HTMLDivElement>;
}

// Шаг 3: Объединяем в финальной функции.
// Используем обертку и логику виртуализации из `main`.
// Она будет вызывать либо `VirtualMessages`, либо `MemoizedMessages`,
// передавая все параметры, включая `forceRegeneration` и `isRegenerating`.
export default function Messages({ scrollRef, ...props }: MessagesProps) {
  return props.messages.length > LargeListBoundary ? (
    <div className="h-full flex-1">
      <VirtualMessages {...props} outerRef={scrollRef} />
    </div>
  ) : (
    <MemoizedMessages {...props} />
  );
}