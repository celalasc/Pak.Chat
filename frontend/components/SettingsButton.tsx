"use client"

import { useState } from 'react';
import { Button } from './ui/button';
import { Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import SettingsDrawer from './SettingsDrawer';
import { cn } from '@/lib/utils';

interface SettingsButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function SettingsButton({ 
  className, 
  variant = "outline", 
  size = "icon" 
}: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsDrawer isOpen={isOpen} setIsOpen={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn("bg-background/80 backdrop-blur-sm border-border/50", className)}
            aria-label="Open settings"
            onClick={() => setIsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Settings
        </TooltipContent>
      </Tooltip>
    </SettingsDrawer>
  );
} 