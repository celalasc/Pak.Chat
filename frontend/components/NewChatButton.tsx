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
}

function NewChatButton({
  className,
  variant = 'outline',
  size = 'icon',
}: NewChatButtonProps) {
  const router = useRouter();
  const { clearQuote } = useQuoteStore();
  const { clear: clearAttachments } = useAttachmentsStore();

  const handleClick = useCallback(() => {
    // Полная очистка состояния перед новым чатом
    clearDraft('');
    clearQuote();
    clearAttachments();

    // Переходим на новый чат и на всякий случай принудительно обновляем
    router.push('/chat');
    router.refresh();
  }, [router, clearQuote, clearAttachments]);

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
