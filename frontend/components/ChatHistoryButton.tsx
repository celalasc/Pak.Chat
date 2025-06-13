"use client"

import { useState } from 'react';
import { Button } from './ui/button';
import { History } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import { cn } from '@/lib/utils';

interface ChatHistoryButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function ChatHistoryButton({ 
  className, 
  variant = "outline", 
  size = "icon" 
}: ChatHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ChatHistoryDrawer isOpen={isOpen} setIsOpen={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn("bg-background/80 backdrop-blur-sm border-border/50", className)}
            aria-label="Open chat history"
            onClick={() => setIsOpen(true)}
          >
            <History className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          History
        </TooltipContent>
      </Tooltip>
    </ChatHistoryDrawer>
  );
} 