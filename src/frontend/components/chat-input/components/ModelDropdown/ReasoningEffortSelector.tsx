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

const reasoningEfforts: { value: ReasoningEffort; label: string }[] = [
  { 
    value: 'high', 
    label: 'High'
  },
  { 
    value: 'medium', 
    label: 'Medium'
  },
  { 
    value: 'low', 
    label: 'Low'
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
          'w-32',
          'border border-border/50 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden'
        )}
        align="center"
        side="top"
        sideOffset={12}
        avoidCollisions={false}
        alignOffset={0}
      >
        <div className="p-1">
          {reasoningEfforts.map(({ value, label }) => (
            <DropdownMenuItem
              key={value}
              onSelect={() => onEffortChange(value)}
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <span className="font-medium text-sm">{label}</span>
              {currentEffort === value && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

ReasoningEffortSelector.displayName = 'ReasoningEffortSelector'; 