"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  memo,
  useDeferredValue,
  useRef,
  useEffect,
  Suspense,
} from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { useRouter, useParams } from "next/navigation";
import {
  X,
  Pin,
  PinOff,
  Search,
  Edit2,
  Share2,
  Check,
  GitBranch,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/frontend/hooks/useIsMobile";
import { saveLastChatId, clearLastChatId } from "@/frontend/lib/lastChat";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "use-debounce";
import { filterByTitle } from "@/lib/searchUtils";
import EmptyState from "@/frontend/components/ui/EmptyState";
import { useConvexThreads } from "@/frontend/hooks/useConvexThreads";

type Thread = Doc<"threads">;

interface ThreadGroup {
  title: string;
  threads: Thread[];
}

interface FastChatHistoryListProps {
  onSelectThread?: (threadId: Id<"threads">) => void;
  onNewChat?: () => void;
  onShare?: (thread: Thread) => void;
  showSearch?: boolean;
  className?: string;
}

// Оптимизированная функция группировки тредов
const groupThreadsByTime = (threads: Thread[]): ThreadGroup[] => {
  const pinned = threads
    .filter(t => t.pinned)
    .sort((a, b) => b._creationTime - a._creationTime);

  const unpinned = threads
    .filter(t => !t.pinned)
    .sort((a, b) => b._creationTime - a._creationTime);
  
  const groups: ThreadGroup[] = [];
  
  if (pinned.length > 0) {
    groups.push({ title: "Pinned", threads: pinned });
  }
  
  const timeGroups: Record<string, Thread[]> = {};
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const lastYear = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  unpinned.forEach(thread => {
    const threadDate = new Date(thread._creationTime);
    
    if (threadDate >= today) {
      timeGroups["Today"] = timeGroups["Today"] || [];
      timeGroups["Today"].push(thread);
    } else if (threadDate >= yesterday) {
      timeGroups["Yesterday"] = timeGroups["Yesterday"] || [];
      timeGroups["Yesterday"].push(thread);
    } else if (threadDate >= lastWeek) {
      timeGroups["Last Week"] = timeGroups["Last Week"] || [];
      timeGroups["Last Week"].push(thread);
    } else if (threadDate >= lastMonth) {
      timeGroups["Last Month"] = timeGroups["Last Month"] || [];
      timeGroups["Last Month"].push(thread);
    } else if (threadDate >= lastYear) {
      timeGroups["Last Year"] = timeGroups["Last Year"] || [];
      timeGroups["Last Year"].push(thread);
    } else {
      timeGroups["Older"] = timeGroups["Older"] || [];
      timeGroups["Older"].push(thread);
    }
  });
  
  const timeOrder = ["Today", "Yesterday", "Last Week", "Last Month", "Last Year", "Older"];
  timeOrder.forEach(period => {
    if (timeGroups[period] && timeGroups[period].length > 0) {
      groups.push({
        title: period,
        threads: timeGroups[period].sort((a, b) => b._creationTime - a._creationTime),
      });
    }
  });
  
  return groups;
};

// Компонент для отображения одного треда
const ThreadItem = memo(({ 
  thread, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete, 
  onTogglePin, 
  onShare,
  isEditing,
  editingTitle,
  onSaveEdit,
  onCancelEdit,
  setEditingTitle
}: {
  thread: Thread;
  isSelected: boolean;
  onSelect: (threadId: Id<"threads">) => void;
  onEdit: (thread: Thread) => void;
  onDelete: (threadId: Id<"threads">) => void;
  onTogglePin: (threadId: Id<"threads">, pinned: boolean) => void;
  onShare: (thread: Thread) => void;
  isEditing: boolean;
  editingTitle: string;
  onSaveEdit: (threadId: Id<"threads">) => void;
  onCancelEdit: () => void;
  setEditingTitle: (title: string) => void;
}) => {
  const handleClick = useCallback(() => {
    if (!isEditing) {
      onSelect(thread._id);
    }
  }, [thread._id, onSelect, isEditing]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(thread);
  }, [thread, onEdit]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(thread._id);
  }, [thread._id, onDelete]);

  const handleTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(thread._id, !thread.pinned);
  }, [thread._id, thread.pinned, onTogglePin]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(thread);
  }, [thread, onShare]);

  const handleSaveEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveEdit(thread._id);
  }, [thread._id, onSaveEdit]);

  const handleCancelEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCancelEdit();
  }, [onCancelEdit]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
        <Input
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          className="flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSaveEdit(thread._id);
            } else if (e.key === "Escape") {
              onCancelEdit();
            }
          }}
        />
        <Button size="sm" onClick={handleSaveEdit}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent"
      )}
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {thread.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
          <span className="font-medium truncate">{thread.title}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(thread._creationTime).toLocaleDateString()}
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTogglePin}
              className="h-8 w-8 p-0"
            >
              {thread.pinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {thread.pinned ? "Unpin" : "Pin"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="h-8 w-8 p-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

ThreadItem.displayName = "ThreadItem";

function FastChatHistoryList({
  onSelectThread,
  onNewChat,
  onShare,
  showSearch = true,
  className,
}: FastChatHistoryListProps) {
  const [rawQuery, setRawQuery] = useState("");
  const searchQuery = useDeferredValue(rawQuery);
  
  const [editingThreadId, setEditingThreadId] = useState<Id<"threads"> | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState<Id<"threads"> | null>(null);

  const { isMobile, mounted } = useIsMobile(600);
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  // Используем оптимизированный хук
  const { 
    threads, 
    isLoading, 
    isLoadingFromCache,
    hasValidCache,
    getThreadTitles 
  } = useConvexThreads();

  const removeThread = useMutation(api.threads.remove);
  const renameThread = useMutation(api.threads.rename);
  const togglePin = useMutation(api.threads.togglePin);

  // Мемоизированная группировка тредов
  const threadGroups = useMemo(() => {
    if (!threads) return [] as ThreadGroup[];
    
    const filteredThreads = filterByTitle(threads, searchQuery);
    return groupThreadsByTime(filteredThreads);
  }, [threads, searchQuery]);

  const handleThreadClick = useCallback(
    (threadId: Id<"threads">) => {
      if (onSelectThread) {
        onSelectThread(threadId);
      } else {
        if (id === threadId) return;
        router.push(`/chat/${threadId}`);
      }
    },
    [id, router, onSelectThread],
  );

  const handleEdit = useCallback((thread: Thread) => {
    setEditingThreadId(thread._id);
    setEditingTitle(thread.title);
  }, []);

  const handleSaveEdit = useCallback(
    async (threadId: Id<"threads">) => {
      await renameThread({ threadId, title: editingTitle });
      setEditingThreadId(null);
      setEditingTitle("");
    },
    [editingTitle, renameThread],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingThreadId(null);
    setEditingTitle("");
  }, []);

  const handleDelete = useCallback((threadId: Id<"threads">) => {
    setDeletingThreadId(threadId);
  }, []);

  const handleConfirmDelete = useCallback(
    async (threadId: Id<"threads">) => {
      await removeThread({ threadId });
      setDeletingThreadId(null);
    },
    [removeThread],
  );

  const handleTogglePin = useCallback(
    async (threadId: Id<"threads">, pinned: boolean) => {
      await togglePin({ threadId, pinned });
    },
    [togglePin],
  );

  const handleShare = useCallback((thread: Thread) => {
    if (onShare) {
      onShare(thread);
    }
  }, [onShare]);

  // Показываем загрузку только если нет кэша
  if (isLoading && !hasValidCache()) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Показываем пустое состояние если нет тредов
  if (!threads || threads.length === 0) {
    return (
      <EmptyState type="no-history" />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="pl-10"
          />
          {rawQuery && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRawQuery("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {threadGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground px-3">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.threads.map((thread) => (
                <ThreadItem
                  key={thread._id}
                  thread={thread}
                  isSelected={id === thread._id}
                  onSelect={handleThreadClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  onShare={handleShare}
                  isEditing={editingThreadId === thread._id}
                  editingTitle={editingTitle}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  setEditingTitle={setEditingTitle}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Диалог подтверждения удаления */}
      {deletingThreadId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Chat</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this chat? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeletingThreadId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleConfirmDelete(deletingThreadId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(FastChatHistoryList);