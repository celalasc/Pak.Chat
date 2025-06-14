import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import React from 'react';

/**
 * Wraps a child element with Radix Tooltip using `asChild` to avoid nested interactive elements.
 */
export function WithTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
