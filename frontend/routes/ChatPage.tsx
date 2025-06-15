'use client';

import { useParams, useNavigate } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { useEffect } from 'react';
import Chat from '@/frontend/components/Chat';
import { Id, Doc } from '@/convex/_generated/dataModel';
import MessageLoading from '@/frontend/components/ui/MessageLoading';
import { UIMessage } from 'ai';

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Проверяем валидность ID
  useEffect(() => {
    if (!id || !isConvexId(id)) {
      navigate('/chat');
      return;
    }
  }, [id, navigate]);

  // Получаем данные треда
  const thread = useQuery(api.threads.get, id && isConvexId(id) ? { threadId: id as Id<'threads'> } : 'skip');
  const messagesResult = useQuery(
    api.messages.get,
    id && isConvexId(id) ? { threadId: id as Id<'threads'> } : 'skip'
  );

  // Показываем загрузку пока данные не загружены
  if (!id || !isConvexId(id)) {
    return null; // Перенаправление уже происходит в useEffect
  }

  if (thread === undefined || messagesResult === undefined) {
    return null;
  }

  // Если тред не найден, перенаправляем на главную
  if (thread === null) {
    navigate('/chat');
    return null;
  }

  // Извлекаем сообщения из пагинированного результата
  const rawMessages: Doc<'messages'>[] = Array.isArray(messagesResult)
    ? messagesResult
    : messagesResult?.page || [];

  const messages: UIMessage[] = rawMessages.map((m) => ({
    id: m._id,
    role: m.role,
    content: m.content,
    createdAt: new Date(m.createdAt),
    parts: [{ type: 'text', text: m.content }],
  }));

  return <Chat key={id ?? 'new'} threadId={id ?? ''} initialMessages={messages} />;
}
