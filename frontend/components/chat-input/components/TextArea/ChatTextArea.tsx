"use client";

import { memo, useCallback, forwardRef } from 'react';
import { Textarea } from '@/frontend/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useImagePaste } from '../../hooks/useImagePaste';

interface ChatTextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isImageGenerationMode?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const ChatTextArea = memo(forwardRef<HTMLTextAreaElement, ChatTextAreaProps>(({
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder = "What can I do for you?",
  disabled = false,
  isImageGenerationMode = false,
  className,
  'aria-label': ariaLabel = "Chat message input",
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const { handlePaste } = useImagePaste();

  const handleFocus = useCallback(() => {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        (ref as React.RefObject<HTMLTextAreaElement>)?.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }
    onFocus?.();
  }, [onFocus, ref]);

  const effectivePlaceholder = isImageGenerationMode 
    ? "Describe the image you want to generate..." 
    : placeholder;

  return (
    <Textarea
      ref={ref}
      value={value}
      placeholder={effectivePlaceholder}
      className={cn(
        'w-full px-4 py-3 border-none shadow-none bg-white dark:bg-transparent',
        'placeholder:text-muted-foreground resize-none',
        'focus-visible:ring-0 focus-visible:ring-offset-0',
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30',
        'scrollbar-thumb-rounded-full',
        'min-h-[72px]',
        className
      )}
      onKeyDown={onKeyDown}
      onChange={onChange}
      onFocus={handleFocus}
      onPaste={handlePaste}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      {...props}
    />
  );
}));

ChatTextArea.displayName = 'ChatTextArea'; 