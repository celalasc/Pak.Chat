"use client";

import { memo, useCallback, useRef } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';

interface SendButtonProps {
  onSubmit: () => void;
  disabled: boolean;
}

const PureSendButton = ({ onSubmit, disabled }: SendButtonProps) => {
  const isSubmittingRef = useRef(false);
  
  const handleClick = useCallback(() => {
    if (isSubmittingRef.current || disabled) return;
    
    isSubmittingRef.current = true;
    onSubmit();
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 1000);
  }, [onSubmit, disabled]);
  
  return (
    <Button
      onClick={handleClick}
      variant="default"
      size="icon"
      disabled={disabled}
      aria-label="Send message"
      className="rounded-full"
    >
      <ArrowUpIcon size={18} />
    </Button>
  );
};

export const SendButton = memo(PureSendButton, (p, n) => p.disabled === n.disabled);
SendButton.displayName = 'SendButton';