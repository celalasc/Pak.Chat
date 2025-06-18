"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  memo,
  useDeferredValue,
  useEffect,
  useRef,
} from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/frontend/components/ui/dialog";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import CopyButton from "./ui/CopyButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useRouter, useParams } from "next/navigation";
import {
  X,
  Pin,
  PinOff,
  Search,
  MessageSquare,
  Plus,
  Edit2,
  Share2,
  Check,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/frontend/hooks/useIsMobile";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import ChatPreview from "./ChatPreview";
import MessageLoading from "./ui/MessageLoading";
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { useDebounce } from "use-debounce";


type Thread = Doc<"threads">;

interface ChatHistoryDrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface ThreadGroup {
  title: string;
  threads: Thread[];
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
  const pinned = threads.filter(t => t.pinned);
  const unpinned = threads.filter(t => !t.pinned);
  
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
      groups.push({ title: period, threads: timeGroups[period] });
    }
  });
  
  return groups;
};



function ChatHistoryDrawerComponent({
  children,
  isOpen,
  setIsOpen,
}: ChatHistoryDrawerProps) {
  const [rawQuery, setRawQuery] = useState("");
  const searchQuery = useDeferredValue(rawQuery);
  const [editingThreadId, setEditingThreadId] =
    useState<Id<"threads"> | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingThreadId, setDeletingThreadId] =
    useState<Id<"threads"> | null>(null);
  const [hoveredThreadId, setHoveredThreadId] =
    useState<Id<"threads"> | null>(null);
  const [longPressThreadId, setLongPressThreadId] =
    useState<Id<"threads"> | null>(null);
  const [selectedThreadIndex, setSelectedThreadIndex] = useState<number>(-1);
  const [mobileMenuThreadId, setMobileMenuThreadId] =
    useState<Id<"threads"> | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const { isMobile, mounted } = useIsMobile(600);
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { settings } = useSettingsStore();

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
  const createShareLink = useMutation(api.threads.createShareLink);
  const createShareLink = useMutation(api.threads.createShareLink);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open || isOpen !== open) {
        setIsOpen(open);
        if (!open) {
          setRawQuery("");
          setEditingThreadId(null);
          setEditingTitle("");
          setDeletingThreadId(null);
          setHoveredThreadId(null);
          setLongPressThreadId(null);
          setSelectedThreadIndex(-1);
          setMobileMenuThreadId(null);
        }
      }
    },
    [setIsOpen, isOpen],
  );

  // ---------------- Memoized, grouped & sorted thread lists ----------
  const threadGroups = useMemo(() => {
    if (!threads) return [] as ThreadGroup[];
    return groupThreadsByTime(threads);
  }, [threads]);

  const allThreadsFlat = useMemo(() => {
    return threadGroups.flatMap(group => group.threads);
  }, [threadGroups]);

  const handleThreadClick = useCallback(
    (threadId: Id<"threads">) => {
      if (id === threadId) {
        handleOpenChange(false);
        return;
      }
      router.push(`/chat/${threadId}`);
      setLongPressThreadId(null);
      handleOpenChange(false);
    },
    [id, router, handleOpenChange],
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
    async (threadId: Id<"threads">, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const thread = threads?.find((t) => t._id === threadId);
      if (!thread) return;
      await togglePin({ threadId, pinned: !thread.pinned });
    },
    [togglePin, threads],
  );


  const handleShare = useCallback(
    async (thread: Thread) => {
      const shareId = await createShareLink({ threadId: thread._id });
      const url = `${window.location.origin}/share/${shareId}`;
      setShareLink(url);
      setShareDialogOpen(true);
      setLongPressThreadId(null);
      setMobileMenuThreadId(null);
    },
    [createShareLink],
  );

  const handleNewChat = useCallback(() => {
    router.push("/chat");
    handleOpenChange(false);
  }, [router, handleOpenChange]);

  // ---------- Keyboard navigation (desktop) --------------------------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || isMobile || editingThreadId) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHoveredThreadId(null);
          setSelectedThreadIndex((prev) => (prev < allThreadsFlat.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHoveredThreadId(null);
          setSelectedThreadIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedThreadIndex >= 0 && selectedThreadIndex < allThreadsFlat.length) {
            const selectedThread = allThreadsFlat[selectedThreadIndex];
            handleThreadClick(selectedThread._id);
          }
          break;
        case "Escape":
          handleOpenChange(false);
          break;
      }
    },
    [isOpen, isMobile, editingThreadId, selectedThreadIndex, allThreadsFlat, handleThreadClick, handleOpenChange],
  );

  useEffect(() => {
    if (isOpen && !isMobile) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isMobile, handleKeyDown]);

  useEffect(() => {
    if (selectedThreadIndex >= 0 && !isMobile) {
      const node = itemRefs.current.get(selectedThreadIndex);
      node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedThreadIndex, isMobile]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (mobileMenuThreadId !== null) {
        const menu = document.getElementById(`mobile-menu-${mobileMenuThreadId}`);
        if (menu && !menu.contains(e.target as Node)) {
          setMobileMenuThreadId(null);
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [mobileMenuThreadId]);

  const previewThreadId = useMemo(() => {
    if (debouncedHoverId) return debouncedHoverId;
    if (selectedThreadIndex >= 0 && allThreadsFlat[selectedThreadIndex]) {
      return allThreadsFlat[selectedThreadIndex]._id;
    }
    return null;
  }, [debouncedHoverId, selectedThreadIndex, allThreadsFlat]);

  // ------------------------ Render thread item -----------------------
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
          if (isMobile) {
            setMobileMenuThreadId(null);
          }
        }}
        onContextMenu={(e) => {
          if (isMobile) {
            e.preventDefault();
            setLongPressThreadId(thread._id);
            setMobileMenuThreadId(thread._id);
          }
        }}
        onTouchStart={(e) => {
          if (isMobile) {
            const touchStartTime = Date.now();
            const touchTimer = setTimeout(() => {
              setLongPressThreadId(thread._id);
              setMobileMenuThreadId(thread._id);
            }, 500);
            
            const handleTouchEnd = () => {
              clearTimeout(touchTimer);
              if (Date.now() - touchStartTime < 500) {
                setMobileMenuThreadId(null);
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
          "group flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer",
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
        <div
          className={cn(
            "flex gap-0.5 sm:gap-1 shrink-0",
            isMobile
              ? longPressThreadId === thread._id ? "opacity-100" : "opacity-0"
              : longPressThreadId === thread._id ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {!editingThreadId && (
            <>
              {/* Mobile action menu */}
              {isMobile && mobileMenuThreadId === thread._id && (
                <div
                  id={`mobile-menu-${thread._id}`}
                  className="absolute right-2 top-0 bottom-0 flex items-center bg-background shadow-lg rounded-lg p-1 z-10"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePinToggle(thread._id, e);
                      setMobileMenuThreadId(null);
                    }}
                  >
                    {thread.pinned ? (
                      <PinOff className="size-4" />
                    ) : (
                      <Pin className="size-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleShare(thread);
                      setMobileMenuThreadId(null);
                    }}
                  >
                    <Share2 className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(thread._id);
                      setMobileMenuThreadId(null);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}
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
      </div>
    ),
    [
      id,
      isMobile,
      selectedThreadIndex,
      longPressThreadId,
      mobileMenuThreadId,
      deletingThreadId,
      editingThreadId,
      editingTitle,
      handleThreadClick,
      handlePinToggle,
      handleDelete,
      handleEdit,
      handleSaveEdit,
      handleCancelEdit,
      setEditingTitle,
      handleShare,
      setMobileMenuThreadId,
    ],
  );

  if (!isAuthenticated || threads === undefined) return null;

  // ------------------ Main scrollable content component --------------
  const ContentComponent: React.FC = () => (
    <div className="flex h-full flex-col">
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
      {!isMobile && (
        <div className="px-4 py-3 border-t border-border bg-muted/30 pointer-events-none">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                ↓
              </kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                Enter
              </kbd>
              <span>Open</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                Esc
              </kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ---------------------- Render mobile vs desktop -------------------
  if (!mounted) return null; // SSR guard

  if (isMobile) {
    const main = (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="max-h-[95vh] flex flex-col w-full">
          <div className="flex h-full max-h-[90vh] flex-col">
            {/* Pull handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-16 h-2 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
              <DrawerHeader className="pb-2 flex flex-col gap-2">
                <DrawerTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" /> Chat History
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewChat}
                    className="ml-auto flex items-center gap-2 text-sm hover:bg-accent focus:outline-none focus:ring-0"
                  >
                    <Plus className="size-4" /> New chat
                  </Button>
                </DrawerTitle>
                <div className="relative">
                  <Input
                    placeholder="Search…"
                    className="rounded-lg py-1.5 pl-8 text-sm w-full"
                    value={rawQuery}
                    onChange={(e) => setRawQuery(e.target.value)}
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                </div>
              </DrawerHeader>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none enhanced-scroll">
              <ContentComponent />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
    return (
      <>
        {main}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share link</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input
                value={shareLink ?? ''}
                readOnly
                className="flex-1"
                onFocus={(e) => e.currentTarget.select()}
              />
              {shareLink && <CopyButton code={shareLink} />}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const desktop = (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={cn(
        "w-[85vw] sm:max-w-none max-w-none h-[80vh] p-0 [&>button]:top-2 [&>button]:right-2 overflow-hidden focus:outline-none",
        !settings.showChatPreview && "w-[600px] max-w-[600px]"
      )}>
        <div className={cn(
          "grid h-full",
          settings.showChatPreview ? "grid-cols-[1fr_600px]" : "grid-cols-1"
        )}>
          <div className="flex flex-col overflow-hidden">
            <DialogHeader className="px-4 pt-4 pb-2 flex flex-col gap-2 shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Chat History
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewChat}
                  className="ml-auto flex items-center gap-2 text-sm hover:bg-accent focus:outline-none focus:ring-0"
                >
                  <Plus className="size-4" /> New chat
                </Button>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Browse and search through your chat history
              </DialogDescription>
              <div className="relative">
                <Input
                  placeholder="Search…"
                  className="rounded-lg py-1.5 pl-8 text-sm w-full"
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ContentComponent />
            </div>
          </div>
          {settings.showChatPreview && (
            <ChatPreview threadId={previewThreadId} onClose={() => handleOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {desktop}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share link</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={shareLink ?? ''}
              readOnly
              className="flex-1"
              onFocus={(e) => e.currentTarget.select()}
            />
            {shareLink && <CopyButton code={shareLink} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(ChatHistoryDrawerComponent);
