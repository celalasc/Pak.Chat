import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import type { Id } from '@/convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface DialogVersionNavigationProps {
  threadId: string;
  className?: string;
  refreshAfterSwitch?: boolean;
}

export default function DialogVersionNavigation({ threadId, className, refreshAfterSwitch = true }: DialogVersionNavigationProps) {
  const router = useRouter();
  const versions = useQuery(
    api.messages.getDialogVersions,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );
  
  const messages = useQuery(
    api.messages.get,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );
  
  const switchVersion = useMutation(api.messages.switchDialogVersion);

  if (!versions || versions.length <= 1) {
    return null;
  }

  // Find current active version by checking which assistant messages are active
  let currentVersion = 1;
  if (messages) {
    const activeAssistant = messages.find(m => m.role === 'assistant' && m.isActive);
    if (activeAssistant) {
      currentVersion = activeAssistant.dialogVersion ?? 1;
    }
  }

  const currentIndex = versions.findIndex(v => v.version === currentVersion);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < versions.length - 1;

  const handlePrevious = async () => {
    if (!canGoPrev || !isConvexId(threadId)) return;
    const prevVersion = versions[currentIndex - 1].version;
    await switchVersion({
      threadId: threadId as Id<'threads'>,
      dialogVersion: prevVersion,
    });
    if (refreshAfterSwitch) router.refresh();
  };

  const handleNext = async () => {
    if (!canGoNext || !isConvexId(threadId)) return;
    const nextVersion = versions[currentIndex + 1].version;
    await switchVersion({
      threadId: threadId as Id<'threads'>,
      dialogVersion: nextVersion,
    });
    if (refreshAfterSwitch) router.refresh();
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        disabled={!canGoPrev}
        className="h-6 w-6 p-0"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      
      <span className="text-xs text-muted-foreground font-mono min-w-[2.5rem] text-center">
        {currentIndex + 1}/{versions.length}
      </span>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        disabled={!canGoNext}
        className="h-6 w-6 p-0"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
} 