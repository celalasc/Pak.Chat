'use client';

import React, { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { WithTooltip } from './WithTooltip';
import { cn } from '@/lib/utils';
import { clearDraft } from '@/frontend/lib/drafts';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { Id } from '@/convex/_generated/dataModel';

interface NewChatButtonProps {
  className?: string;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  projectId?: Id<"projects">; // Добавляем projectId как опциональный пропс
}

function NewChatButton({
  className,
  variant = 'outline',
  size = 'icon',
  projectId,
}: NewChatButtonProps) {
  const router = useRouter();
  const { clearQuote } = useQuoteStore();
  const { clear: clearAttachments } = useAttachmentsStore();

  const handleClick = useCallback(() => {
    // Полная очистка состояния перед новым чатом
    clearDraft('');
    clearQuote();
    clearAttachments();

    if (projectId) {
      // Если в контексте проекта - идем на главную страницу проекта
      router.push(`/project/${projectId}`);
    } else {
      // Иначе на обычный новый чат
      router.push('/chat');
    }
    router.refresh();
  }, [router, clearQuote, clearAttachments, projectId]);

  return (
    <WithTooltip label="New Chat" side="bottom">
      <Button
        variant={variant}
        size={size}
        className={cn(
          'bg-background/80 backdrop-blur-sm border-border/50',
          className,
        )}
        aria-label="Create new chat"
        onClick={handleClick}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </WithTooltip>
  );
}

export default memo(NewChatButton);
