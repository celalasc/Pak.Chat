"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  memo,
  useDeferredValue,
  useRef,
} from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/frontend/hooks/useIsMobile";
import { saveLastChatId, clearLastChatId } from "@/frontend/lib/lastChat";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "use-debounce";

type Thread = Doc<"threads">;

interface ThreadGroup {
  title: string;
  threads: Thread[];
}

interface ChatHistoryListProps {
  onSelectThread?: (threadId: Id<"threads">) => void;
  onNewChat?: () => void;
  onShare?: (thread: Thread) => void;
  showSearch?: boolean;
  className?: string;
}

// Helper function to get time period for grouping
const getTimePeriod = (date: Date): string => {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday"; 
  if (diffDays <= 7) return "Last Week";
  if (diffDays <= 30) return "Last Month";
  if (diffDays <= 365) return "Last Year";
  return "Older";
};

// Group threads by time period
const groupThreadsByTime = (threads: Thread[]): ThreadGroup[] => {
  // Разделяем закреплённые и обычные треды
  // Чтобы история отображалась корректно (новые сверху), сразу сортируем обе коллекции
  const pinned = threads
    .filter(t => t.pinned)
    .sort((a, b) => b._creationTime - a._creationTime);

  const unpinned = threads
    .filter(t => !t.pinned)
    .sort((a, b) => b._creationTime - a._creationTime);
  
  const groups: ThreadGroup[] = [];
  
  // Add pinned group if there are pinned threads
  if (pinned.length > 0) {
    groups.push({ title: "Pinned", threads: pinned });
  }
  
  // Group unpinned threads by time
  const timeGroups: Record<string, Thread[]> = {};
  
  unpinned.forEach(thread => {
    const period = getTimePeriod(new Date(thread._creationTime));
    if (!timeGroups[period]) {
      timeGroups[period] = [];
    }
    timeGroups[period].push(thread);
  });
  
  // Add time groups in order
  const timeOrder = ["Today", "Yesterday", "Last Week", "Last Month", "Last Year", "Older"];
  timeOrder.forEach(period => {
    if (timeGroups[period] && timeGroups[period].length > 0) {
      // Сортируем внутри каждой временной группы так, чтобы новые диалоги были сверху
      groups.push({
        title: period,
        threads: timeGroups[period].sort((a, b) => b._creationTime - a._creationTime),
      });
    }
  });
  
  return groups;
};

function ChatHistoryList({
  onSelectThread,
  onNewChat,
  onShare,
  showSearch = true,
  className,
}: ChatHistoryListProps) {
  const [rawQuery, setRawQuery] = useState("");
  const searchQuery = useDeferredValue(rawQuery);
  const [editingThreadId, setEditingThreadId] = useState<Id<"threads"> | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState<Id<"threads"> | null>(null);
  const [hoveredThreadId, setHoveredThreadId] = useState<Id<"threads"> | null>(null);
  const [longPressThreadId, setLongPressThreadId] = useState<Id<"threads"> | null>(null);
  const [selectedThreadIndex, setSelectedThreadIndex] = useState<number>(-1);
  const itemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const { isMobile, mounted } = useIsMobile(600);
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  // Debounce hovered id to avoid spamming preview requests
  const [debouncedHoverId] = useDebounce(hoveredThreadId, 300);

  const trimmedQuery = searchQuery.trim();
  const threads = useQuery(
    api.threads.list,
    isAuthenticated ? (trimmedQuery ? { searchQuery: trimmedQuery } : {}) : "skip",
  );
  const removeThread = useMutation(api.threads.remove);
  const renameThread = useMutation(api.threads.rename);
  const togglePin = useMutation(api.threads.togglePin);

  // ---------------- Memoized, grouped & sorted thread lists ----------
  const threadGroups = useMemo(() => {
    if (!threads) return [] as ThreadGroup[];
    return groupThreadsByTime(threads);
  }, [threads]);

  const handleThreadClick = useCallback(
    (threadId: Id<"threads">) => {
      if (onSelectThread) {
        onSelectThread(threadId);
      } else {
        // Default behavior: navigate to chat
        if (id === threadId) return;
        router.push(`/chat/${threadId}`);
      }
      setLongPressThreadId(null);
    },
    [id, router, onSelectThread],
  );

  const handleEdit = useCallback((thread: Thread) => {
    setEditingThreadId(thread._id);
    setEditingTitle(thread.title);
    setLongPressThreadId(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (threadId: Id<"threads">) => {
      await renameThread({ threadId, title: editingTitle });
      setEditingThreadId(null);
      setEditingTitle("");
      setLongPressThreadId(null);
    },
    [editingTitle, renameThread],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingThreadId(null);
    setEditingTitle("");
    setLongPressThreadId(null);
  }, []);

  const handleDelete = useCallback((threadId: Id<"threads">) => {
    setDeletingThreadId(threadId);
    setLongPressThreadId(null);
  }, []);

  const handleConfirmDelete = useCallback(
    async (threadId: Id<"threads">) => {
      await removeThread({ threadId });
      if (id === threadId) {
        router.push("/chat");
        clearLastChatId();
      }
      setDeletingThreadId(null);
      setLongPressThreadId(null);
    },
    [id, router, removeThread],
  );

  const handleCancelDelete = useCallback(() => {
    setDeletingThreadId(null);
    setLongPressThreadId(null);
  }, []);

  const handlePinToggle = useCallback(
    async (threadId: Id<"threads">, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Find the thread to get current pinned state
      const thread = threads?.find(t => t._id === threadId);
      if (thread) {
        await togglePin({ threadId, pinned: !thread.pinned });
      }
      setLongPressThreadId(null);
    },
    [togglePin, threads],
  );

  const handleShare = useCallback(
    (thread: Thread) => {
      if (onShare) {
        onShare(thread);
      }
      setLongPressThreadId(null);
    },
    [onShare],
  );

  // ---------------------- Render thread item -----------------------
  const renderThreadItem = useCallback(
    (thread: Thread, threadIndex: number) => (
      <div
        key={thread._id}
        data-thread-index={threadIndex}
        ref={(node) => {
          if (node) itemRefs.current.set(threadIndex, node);
          else itemRefs.current.delete(threadIndex);
        }}
        onMouseEnter={() => {
          setHoveredThreadId(thread._id);
          if (!isMobile) {
            setSelectedThreadIndex(threadIndex);
          }
          // Сбрасываем состояние удаления при наведении на другой элемент
          if (deletingThreadId && deletingThreadId !== thread._id) {
            setDeletingThreadId(null);
          }
        }}
        onMouseLeave={() => {
          setHoveredThreadId(null);
          setLongPressThreadId(null);
        }}
        onContextMenu={(e) => {
          if (isMobile) {
            e.preventDefault();
          }
        }}
        onTouchStart={(e) => {
          if (isMobile) {
            // Prevent triggering the browser context menu on long press
            const touchStartTime = Date.now();
            const touchTimer = setTimeout(() => {
              /* noop - long press disabled on mobile */
            }, 500);

            const handleTouchEnd = () => {
              clearTimeout(touchTimer);
              const duration = Date.now() - touchStartTime;
              if (duration >= 500) {
                e.preventDefault();
              }
            };

            e.currentTarget.addEventListener('touchend', handleTouchEnd, { once: true });
          }
        }}
        onClick={() => {
          // Не переходим в чат если редактируем заголовок
          if (!editingThreadId) {
            handleThreadClick(thread._id);
          }
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isMobile) {
            handleEdit(thread);
          }
        }}
        className={cn(
          "group flex items-center justify-between rounded-lg px-2 py-2 min-h-12 cursor-pointer",
          id === thread._id
            ? "bg-primary/10 border border-primary/20"
            : (!isMobile && threadIndex === selectedThreadIndex)
            ? "bg-accent"
            : "hover:bg-accent",
        )}
      >
        {/* Left side */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            {thread.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
            {thread.clonedFrom && <GitBranch className="h-3 w-3 text-primary shrink-0" />}
            {editingThreadId === thread._id ? (
              <div className="flex items-center gap-2 w-full">
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="h-6 text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveEdit(thread._id);
                    } else if (e.key === "Escape") {
                      handleCancelEdit();
                    }
                  }}
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleSaveEdit(thread._id)}
                >
                  <Check className="size-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={handleCancelEdit}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <span className="line-clamp-1 text-sm font-medium">{thread.title}</span>
            )}
          </div>
        </div>
        {/* Right side buttons */}
        {!isMobile && (
        <div
          className={cn(
            "flex gap-0.5 sm:gap-1 shrink-0",
            longPressThreadId === thread._id
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          {!editingThreadId && (
            <>
              {deletingThreadId === thread._id ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmDelete(thread._id);
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCancelDelete();
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-6 w-6 sm:h-7 sm:w-7", isMobile && "h-8 w-8")}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(thread);
                        }}
                      >
                        <Edit2 className={cn("size-2.5 sm:size-3", isMobile && "size-3.5")}></Edit2>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-6 w-6 sm:h-7 sm:w-7", isMobile && "h-8 w-8")}
                        onClick={(e) => handlePinToggle(thread._id, e)}
                      >
                        {thread.pinned ? (
                          <PinOff className={cn("size-2.5 sm:size-3", isMobile && "size-3.5")} />
                        ) : (
                          <Pin className={cn("size-2.5 sm:size-3", isMobile && "size-3.5")} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{thread.pinned ? "Unpin" : "Pin"}</TooltipContent>
                  </Tooltip>
                  {onShare && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={cn("h-6 w-6 sm:h-7 sm:w-7", isMobile && "h-8 w-8")}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShare(thread);
                          }}
                        >
                          <Share2 className={cn("size-2.5 sm:size-3", isMobile && "size-3.5")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-6 w-6 sm:h-7 sm:w-7", isMobile && "h-8 w-8")}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(thread._id);
                        }}
                      >
                        <X className={cn("size-2.5 sm:size-3", isMobile && "size-3.5")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </>
              )}
            </>
          )}
          </div>
        )}
        </div>
      ),
    [
      isMobile,
      id,
      editingThreadId,
      editingTitle,
      deletingThreadId,
      longPressThreadId,
      selectedThreadIndex,
      handleThreadClick,
      handleEdit,
      handleSaveEdit,
      handleCancelEdit,
      handleDelete,
      handleConfirmDelete,
      handleCancelDelete,
      handlePinToggle,
      handleShare,
      onShare,
    ],
  );

  if (!mounted) return null; // SSR guard

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Search header */}
      {showSearch && (
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Input
              placeholder="Search…"
              className="rounded-lg py-1.5 pl-8 text-sm w-full"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
          </div>
        </div>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto scrollbar-none enhanced-scroll px-3 sm:px-4">
        <div className="space-y-4 sm:space-y-6 pt-2 pb-8">
          {threadGroups.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              {searchQuery ? "No chats found." : "No chat history found."}
            </div>
          ) : (
            threadGroups.map((group, groupIndex) => {
              let currentThreadIndex = 0;
              // Calculate the starting index for this group
              for (let i = 0; i < groupIndex; i++) {
                currentThreadIndex += threadGroups[i].threads.length;
              }
              
              return (
                <div key={group.title} className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.threads.map((thread, idx) => 
                      renderThreadItem(thread, currentThreadIndex + idx)
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ChatHistoryList); 