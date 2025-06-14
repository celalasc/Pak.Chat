"use client"

import { useNavigate } from 'react-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { WithTooltip } from './WithTooltip';
import { cn } from '@/lib/utils';

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
  const navigate = useNavigate();
  const createThread = useMutation(api.threads.create);

  const handleClick = async () => {
    const newId = await createThread({ title: 'New chat' });
    navigate(`/chat/${newId}`);
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