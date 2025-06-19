'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '@/lib/copyText';

interface CopyButtonProps {
  /** Text that will be copied to the clipboard */
  code: string;
}

export default function CopyButton({ code }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  // Copy provided code snippet to the clipboard
  const handleCopy = useCallback(async () => {
    await copyText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label={copied ? 'Скопировано!' : 'Копировать код'}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
