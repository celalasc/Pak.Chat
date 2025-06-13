"use client"

import { Link } from 'react-router';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/chat">
          <Button
            variant={variant}
            size={size}
            className={cn("bg-background/80 backdrop-blur-sm border-border/50", className)}
            aria-label="Create new chat"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        New Chat
      </TooltipContent>
    </Tooltip>
  );
} 