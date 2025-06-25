"use client";

import { memo } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';

interface SendButtonProps {
  onSubmit: () => void;
  disabled: boolean;
}

const PureSendButton = ({ onSubmit, disabled }: SendButtonProps) => (
  <Button
    onClick={onSubmit}
    variant="default"
    size="icon"
    disabled={disabled}
    aria-label="Send message"
    className="rounded-full"
  >
    <ArrowUpIcon size={18} />
  </Button>
);

export const SendButton = memo(PureSendButton, (p, n) => p.disabled === n.disabled);
SendButton.displayName = 'SendButton'; 