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
  return (
    <section className="flex flex-col space-y-12">
      {messages.map((message, index) => (
        <PreviewMessage
          key={`${message.id}-${index}`}
          threadId={threadId}
          message={message}
          isStreaming={status === 'streaming' && messages.length - 1 === index}
          setMessages={setMessages}
          reload={reload}
          stop={stop}
        />
      ))}
      {status === 'submitted' && <MessageLoading />}
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

const LargeListBoundary = 50;

export default function Messages(props: React.ComponentProps<typeof PureMessages>) {
  return props.messages.length > LargeListBoundary ? (
    <VirtualMessages {...props} />
  ) : (
    <PureMessagesMemo {...props} />
  );
}
