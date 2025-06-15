'use client';

import { useParams, useNavigate } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { useEffect } from 'react';
import Chat from '@/frontend/components/Chat';
import { Id } from '@/convex/_generated/dataModel';
import MessageLoading from '@/frontend/components/ui/MessageLoading';

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
  const messagesResult = useQuery(api.messages.get, id && isConvexId(id) ? { threadId: id as Id<'threads'> } : 'skip');

  // Показываем загрузку пока данные не загружены
  if (!id || !isConvexId(id)) {
    return null; // Перенаправление уже происходит в useEffect
  }

  if (thread === undefined || messagesResult === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <MessageLoading />
      </div>
    );
  }

  // Если тред не найден, перенаправляем на главную
  if (thread === null) {
    navigate('/chat');
    return null;
  }

  // Извлекаем сообщения из пагинированного результата
  const messages = Array.isArray(messagesResult) ? messagesResult : (messagesResult?.page || []);

  return <Chat threadId={id} initialMessages={messages} />;
} 