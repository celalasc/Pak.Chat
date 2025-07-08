"use client"

import { useState, useCallback, memo } from 'react';
import { Button } from './ui/button';
import { Settings } from 'lucide-react';
import { WithTooltip } from './WithTooltip';
import SettingsDrawer from './SettingsDrawer';
import { cn } from '@/lib/utils';

interface SettingsButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const SettingsButton = memo(({ 
  className, 
  variant = "outline", 
  size = "icon" 
}: SettingsButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenSettings = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <SettingsDrawer isOpen={isOpen} setIsOpen={setIsOpen}>
      <WithTooltip label="Settings" side="bottom">
        <Button
          variant={variant}
          size={size}
          className={cn('bg-background/80 backdrop-blur-sm border-border/50', className)}
          aria-label="Open settings"
          onClick={handleOpenSettings}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </WithTooltip>
    </SettingsDrawer>
  );
});

SettingsButton.displayName = 'SettingsButton';

export default SettingsButton; 