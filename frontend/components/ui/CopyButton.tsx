import { Check, Copy } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';

interface CopyButtonProps {
  copied: boolean;
  onClick: () => void;
}

export default function CopyButton({ copied, onClick }: CopyButtonProps) {
  const label = copied ? 'Скопировано' : 'Скопировать';
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}
