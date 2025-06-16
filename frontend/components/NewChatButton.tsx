"use client"

import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { WithTooltip } from './WithTooltip';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useDraftStore } from '@/frontend/stores/DraftStore';

interface NewChatButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function NewChatButton({
  className,
  variant = "outline",
  size = "icon"
}: NewChatButtonProps) {
  const router = useRouter();
  const { setInput } = useChatStore();
  const { clearQuote } = useQuoteStore();

  const handleClick = () => {
    setInput('');
    clearQuote();
    router.push('/chat');
    // Инкрементируем локальный ключ, чтобы Chat пересоздался
    useDraftStore.getState().next();
  };

  return (
    <WithTooltip label="New Chat" side="bottom">
      <Button
        variant={variant}
        size={size}
        className={cn('bg-background/80 backdrop-blur-sm border-border/50', className)}
        aria-label="Create new chat"
        onClick={handleClick}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </WithTooltip>
  );
} 