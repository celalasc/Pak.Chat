import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import React from 'react';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

interface WithTooltipProps {
  label: string;
  children: React.ReactElement;
  side?: React.ComponentProps<typeof TooltipContent>['side'];
}

export function WithTooltip({ label, children, side = 'top' }: WithTooltipProps) {
  const { isMobile } = useIsMobile();
  
  // На мобильных устройствах не показываем tooltip-ы, 
  // так как они конфликтуют с touch-событиями
  if (isMobile) {
    return children;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
