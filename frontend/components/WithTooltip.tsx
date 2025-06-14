import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import React from 'react';

interface WithTooltipProps {
  label: string;
  children: React.ReactElement;
  side?: React.ComponentProps<typeof TooltipContent>['side'];
}

export function WithTooltip({ label, children, side = 'top' }: WithTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
