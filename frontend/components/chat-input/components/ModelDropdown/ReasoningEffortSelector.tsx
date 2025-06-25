"use client";

import { memo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ReasoningEffort } from '@/frontend/stores/ModelStore';

interface ReasoningEffortSelectorProps {
  currentEffort: ReasoningEffort;
  onEffortChange: (effort: ReasoningEffort) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const reasoningEfforts: { value: ReasoningEffort; label: string; description: string }[] = [
  { 
    value: 'high', 
    label: 'High', 
    description: 'Maximum reasoning depth and accuracy' 
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    description: 'Balanced reasoning and speed' 
  },
  { 
    value: 'low', 
    label: 'Low', 
    description: 'Faster responses with basic reasoning' 
  },
];

export const ReasoningEffortSelector = memo<ReasoningEffortSelectorProps>(({
  currentEffort,
  onEffortChange,
  isOpen,
  onOpenChange
}) => {
  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500 transition-colors"
          aria-label={`Reasoning effort: ${currentEffort}`}
        >
          <div className="flex items-center gap-1">
            {currentEffort}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        className={cn(
          'w-48',
          'border border-border/50 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden'
        )}
        align="center"
        side="top"
        sideOffset={12}
        avoidCollisions
      >
        <div className="p-1">
          {reasoningEfforts.map(({ value, label, description }) => (
            <DropdownMenuItem
              key={value}
              onSelect={() => onEffortChange(value)}
              className="flex flex-col items-start gap-1 p-3 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">{label}</span>
                {currentEffort === value && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">{description}</span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

ReasoningEffortSelector.displayName = 'ReasoningEffortSelector'; 