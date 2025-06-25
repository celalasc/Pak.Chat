"use client";

import { memo } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { StopIcon } from '@/frontend/components/ui/icons';

interface StopButtonProps {
  stop: () => void;
}

const PureStopButton = ({ stop }: StopButtonProps) => (
  <Button
    variant="outline"
    size="icon"
    onClick={stop}
    aria-label="Stop generating response"
    className="rounded-full"
  >
    <StopIcon size={20} />
  </Button>
);

export const StopButton = memo(PureStopButton);
StopButton.displayName = 'StopButton'; 