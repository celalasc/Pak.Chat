import { memo, useRef, useEffect } from 'react';
import PreviewMessage from './Message';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import MessageLoading from './ui/MessageLoading';
import Error from './Error';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAutoHide } from '../hooks/useAutoHide';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { cn } from '@/lib/utils';

/** Постоянная оценка высоты одного сообщения для виртуализатора. */
const ESTIMATED_MESSAGE_HEIGHT = 200;

interface MessagesProps {
  threadId: string;
  messages: UIMessage[];
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  stop: UseChatHelpers['stop'];
}

/**
 * Список сообщений чата с виртуализацией и автоскроллом к последнему сообщению.
 * При количестве сообщений ≥ 50 включается @tanstack/react-virtual.
 */
function PureMessages({
  threadId,
  messages,
  setMessages,
  reload,
  status,
  error,
  stop,
}: MessagesProps) {
  /* Показывать/прятать кнопки действий над сообщением (копировать, удалить …) */
  const { id: activeControlsId, show: showControls } = useAutoHide(800);

  /* На длинных списках включаем виртуализацию */
  const shouldVirtualize = messages.length >= 50;

  /* Контейнер прокрутки (на десктопе это div, на мобилке — сам document) */
  const parentRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useIsMobile();

  /* Инициализируем виртуализатор */
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () =>
      isMobile
        ? document.scrollingElement ?? document.documentElement
        : parentRef.current,
    estimateSize: () => ESTIMATED_MESSAGE_HEIGHT,
    overscan: 5,
  });

  /* Якорь — чтобы скроллить вниз без пересчёта всей виртуальной сетки */
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  /* Прокручиваем к низу, когда появляется новое сообщение */
  useEffect(() => {
    const el = isMobile ? document.scrollingElement : parentRef.current;
    if (!el) return;

    const scrolledToBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 10;

    if (scrolledToBottom && messages.length) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isMobile]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <section
      ref={parentRef}
      className={cn(
        'flex flex-col space-y-12 h-full',
        !isMobile && 'overflow-y-auto'
      )}
    >
      {shouldVirtualize ? (
        /* «Плёнка» с абсолютным позиционированием виртуальных строк */
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
                    status === 'streaming' &&
                    messages.length - 1 === virtualItem.index
                  }
                  setMessages={setMessages}
                  reload={reload}
                  stop={stop}
                  isControlsVisible={activeControlsId === message.id}
                  onShowControls={() => showControls(message.id)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        /* Короткий список — обычный map без виртуализации */
        messages.map((message, index) => (
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
        ))
      )}

      {status === 'submitted' && <MessageLoading />}
      {error && <Error message={error.message} />}
      {/* Якорь для плавного автоскролла вниз */}
      <div ref={bottomAnchorRef} />
    </section>
  );
}

/**
 * memo: перерисовываемся только если действительно что-то поменялось.
 * fast-deep-equal сравнивает массив сообщений по содержимому.
 */
const Messages = memo(PureMessages, (prev, next) => {
  if (prev.status !== next.status) return false;
  if (prev.error !== next.error) return false;
  if (prev.messages.length !== next.messages.length) return false;
  if (!equal(prev.messages, next.messages)) return false;
  return true; // пропсы идентичны → сохранить результат предыдущего рендера
});

Messages.displayName = 'Messages';

export default Messages;
