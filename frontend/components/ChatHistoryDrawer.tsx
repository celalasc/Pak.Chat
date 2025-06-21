"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  memo,
  useDeferredValue,
  useEffect,
  useRef,
  useLayoutEffect,
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
import { Switch } from "./ui/switch";
import { Label } from "@/components/ui/label";
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
  const [selectedThreadIndex, setSelectedThreadIndex] = useState<number>(-1);
  // Разрешать ли автопрокрутку к выбранному элементу
  const allowAutoScrollRef = useRef(false);
  const lastKeyPressRef = useRef(0);
  const pendingScrollRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Remember scroll position to prevent jumps on re-renders
  const scrollPositionRef = useRef(0);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);
  const contentWrapperRef = useRef<HTMLDivElement | null>(null);
  const [mobileMenuThreadId, setMobileMenuThreadId] =
    useState<Id<"threads"> | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isAnonymousShare, setIsAnonymousShare] = useState(false);
  const [sharingThread, setSharingThread] = useState<Thread | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const { isMobile, mounted } = useIsMobile(600);
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { settings } = useSettingsStore();

  // Debounce hovered id to avoid spamming preview requests
  const [debouncedHoverId] = useDebounce(hoveredThreadId, 300);

  // Restore scroll position after updates triggered by hovering
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [hoveredThreadId]);

  const trimmedQuery = searchQuery.trim();
  const threads = useQuery(
    api.threads.list,
    isAuthenticated ? (trimmedQuery ? { searchQuery: trimmedQuery } : {}) : "skip",
  );
  const removeThread = useMutation(api.threads.remove);
  const renameThread = useMutation(api.threads.rename);
  const togglePin = useMutation(api.threads.togglePin);
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
            setSelectedThreadIndex(-1); // Сброс только при закрытии диалога
            setMobileMenuThreadId(null);
            allowAutoScrollRef.current = false;
            lastKeyPressRef.current = 0;
            pendingScrollRef.current = false;
            // Не сбрасываем скролл позицию, чтобы пользователь мог вернуться к тому же месту
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

  // Корректируем selectedThreadIndex если список изменился
  useEffect(() => {
    if (selectedThreadIndex >= allThreadsFlat.length && allThreadsFlat.length > 0) {
      setSelectedThreadIndex(allThreadsFlat.length - 1);
    }
  }, [allThreadsFlat.length, selectedThreadIndex]);

  const handleThreadClick = useCallback(
    (threadId: Id<"threads">) => {
      if (id === threadId) {
        handleOpenChange(false);
        return;
      }
      router.push(`/chat/${threadId}`);
      handleOpenChange(false);
    },
    [id, router, handleOpenChange],
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
      if (id === threadId) {
        router.push("/chat");
      }
      setDeletingThreadId(null);
    },
    [id, router, removeThread],
  );

  const handleCancelDelete = useCallback(() => {
    setDeletingThreadId(null);
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
      setIsAnonymousShare(false); // Reset to default
      setSharingThread(thread);
      setShareLink(null); // Reset link
      setShareDialogOpen(true);
      setMobileMenuThreadId(null);
    },
    [],
  );

  const generateShareLink = useCallback(
    async () => {
      if (!sharingThread) return;
      const shareId = await createShareLink({ 
        threadId: sharingThread._id, 
        isAnonymous: isAnonymousShare 
      });
      const url = `${window.location.origin}/share/${shareId}`;
      setShareLink(url);
    },
    [createShareLink, sharingThread, isAnonymousShare],
  );

  const handleNewChat = useCallback(() => {
    router.push("/chat");
    handleOpenChange(false);
  }, [router, handleOpenChange]);

  // ---------- Keyboard navigation (desktop) --------------------------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || isMobile || editingThreadId) return;

      const now = Date.now();
      const timeSinceLastPress = now - lastKeyPressRef.current;
      const isRapidPress = timeSinceLastPress < 150;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          lastKeyPressRef.current = now;

          // Отменяем любой текущий скролл при быстром нажатии
          if (isRapidPress && pendingScrollRef.current) {
            pendingScrollRef.current = false;
          }

          setSelectedThreadIndex((prev) => {
            // Если индекс не установлен или равен -1, начинаем с первого элемента
            const next =
              prev === -1 || prev >= allThreadsFlat.length
                ? 0
                : Math.min(prev + 1, allThreadsFlat.length - 1);
            // Следующее обновление может автопрокрутить
            allowAutoScrollRef.current = true;
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          lastKeyPressRef.current = now;
          
          // Отменяем любой текущий скролл при быстром нажатии
          if (isRapidPress && pendingScrollRef.current) {
            pendingScrollRef.current = false;
          }
          
          setSelectedThreadIndex((prev) => {
            const next =
              prev === -1 || prev >= allThreadsFlat.length
                ? allThreadsFlat.length - 1
                : Math.max(prev - 1, 0);
            allowAutoScrollRef.current = true;
            return next;
          });
          break;
      }
    },
    [isOpen, isMobile, editingThreadId, allThreadsFlat],
  );

  useEffect(() => {
    if (isOpen && !isMobile) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isMobile, handleKeyDown]);

  useEffect(() => {
    // Выполняем автопрокрутку только при соблюдении всех условий
    if (
      selectedThreadIndex >= 0 &&
      selectedThreadIndex < allThreadsFlat.length &&
      !isMobile &&
      allowAutoScrollRef.current &&
      scrollContainerRef.current &&
      !pendingScrollRef.current
    ) {
      const node = itemRefs.current.get(selectedThreadIndex);
      const container = scrollContainerRef.current;

      if (node && container) {
        const containerRect = container.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();

        const headerHeight = topBarRef.current?.getBoundingClientRect().height ?? 0;
        const footerHeight = bottomBarRef.current?.getBoundingClientRect().height ?? 0;
        const paddingBottom = contentWrapperRef.current
          ? parseFloat(getComputedStyle(contentWrapperRef.current).paddingBottom)
          : 0;

        const viewportTop = containerRect.top + headerHeight;
        const viewportBottom = containerRect.bottom - footerHeight - paddingBottom;
        const fullyVisible =
          nodeRect.top >= viewportTop && nodeRect.bottom <= viewportBottom;

        if (!fullyVisible) {
          // Определяем тип анимации на основе времени последнего нажатия
          const now = Date.now();
          const timeSinceLastPress = now - lastKeyPressRef.current;
          const isRapidNavigation = timeSinceLastPress < 150;

          // При быстрой навигации используем мгновенную прокрутку
          const behavior = isRapidNavigation ? 'auto' : 'smooth';

          // Устанавливаем флаг ожидания только для smooth анимации
          if (behavior === 'smooth') {
            pendingScrollRef.current = true;
          }

          node.scrollIntoView({
            behavior: behavior as ScrollBehavior,
            block: 'nearest',
          });

          // Для auto прокрутки сбрасываем флаг сразу
          if (behavior === 'auto') {
            pendingScrollRef.current = false;
          }
          // Автоскролл выполнен, выключаем разрешение
          allowAutoScrollRef.current = false;
        }
      }
    }
  }, [selectedThreadIndex, allThreadsFlat.length, isMobile]);

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

  const threadIdForPreview = useMemo(() => {
    if (debouncedHoverId) {
      return debouncedHoverId;
    }
    if (selectedThreadIndex >= 0 && allThreadsFlat[selectedThreadIndex]) {
      return allThreadsFlat[selectedThreadIndex]._id;
    }
    return null;
  }, [debouncedHoverId, selectedThreadIndex, allThreadsFlat]);

  // Keyboard shortcuts 
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (deletingThreadId) {
          // Подтверждаем удаление
          handleConfirmDelete(deletingThreadId);
        } else if (threadIdForPreview) {
          handleThreadClick(threadIdForPreview);
        } else if (selectedThreadIndex >= 0 && allThreadsFlat[selectedThreadIndex]) {
          handleThreadClick(allThreadsFlat[selectedThreadIndex]._id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (deletingThreadId) {
          // Отменяем удаление
          setDeletingThreadId(null);
        } else {
          handleOpenChange(false);
        }
      } else if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!deletingThreadId) { // Только если не в режиме удаления
          if (threadIdForPreview) {
            setDeletingThreadId(threadIdForPreview);
          } else if (selectedThreadIndex >= 0 && allThreadsFlat[selectedThreadIndex]) {
            setDeletingThreadId(allThreadsFlat[selectedThreadIndex]._id);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMobile, threadIdForPreview, selectedThreadIndex, allThreadsFlat, deletingThreadId, handleThreadClick, handleOpenChange, handleConfirmDelete]);
  
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
          // Save current scroll position to avoid jumps after re-render
          if (scrollContainerRef.current) {
            scrollPositionRef.current = scrollContainerRef.current.scrollTop;
          }
          setHoveredThreadId(thread._id);
          setSelectedThreadIndex(-1);
          // Немедленно отключаем автопрокрутку и отменяем ожидающие скроллы
          allowAutoScrollRef.current = false;
          pendingScrollRef.current = false;
        }}
        onMouseLeave={() => {
          setHoveredThreadId(null);
        }}
        onClick={() => {
          // Отключаем автопрокрутку и отменяем ожидающие скроллы при клике мышью
          allowAutoScrollRef.current = false;
          pendingScrollRef.current = false;
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
      >
        <div
          className={cn(
            "group flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer w-full",
            id === thread._id
              ? "bg-primary/10 border border-primary/20"
              : (!isMobile && (threadIndex === selectedThreadIndex || thread._id === hoveredThreadId))
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
                  onClick={() => {
                    allowAutoScrollRef.current = false;
                    pendingScrollRef.current = false;
                    handleSaveEdit(thread._id);
                  }}
                >
                  <Check className="size-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    allowAutoScrollRef.current = false;
                    pendingScrollRef.current = false;
                    handleCancelEdit();
                  }}
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
          className="flex gap-0.5 sm:gap-1 shrink-0 opacity-0 group-hover:opacity-100"
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
                      allowAutoScrollRef.current = false;
                      pendingScrollRef.current = false;
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
                      allowAutoScrollRef.current = false;
                      pendingScrollRef.current = false;
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
                      allowAutoScrollRef.current = false;
                      pendingScrollRef.current = false;
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
                      allowAutoScrollRef.current = false;
                      pendingScrollRef.current = false;
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
                      allowAutoScrollRef.current = false;
                      pendingScrollRef.current = false;
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
                          allowAutoScrollRef.current = false;
                          pendingScrollRef.current = false;
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
                      onClick={(e) => {
                        allowAutoScrollRef.current = false;
                        pendingScrollRef.current = false;
                        handlePinToggle(thread._id, e);
                      }}
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
                        allowAutoScrollRef.current = false;
                        pendingScrollRef.current = false;
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
                          allowAutoScrollRef.current = false;
                          pendingScrollRef.current = false;
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
      </div>
    ),
    [
      id,
      isMobile,
      selectedThreadIndex,
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
    <div className="h-full flex flex-col">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-none enhanced-scroll px-3 sm:px-4"
        tabIndex={-1}
        onWheel={() => {
          // Полностью запрещаем автопрокрутку при колёсике
          allowAutoScrollRef.current = false;
          pendingScrollRef.current = false;
          // Сбрасываем выбор, чтобы клавиатурная навигация не "возвращала" элемент
          setSelectedThreadIndex(-1);
          // Отменяем плавную прокрутку, если она все еще выполняется
          if (scrollContainerRef.current) {
            const c = scrollContainerRef.current;
            const current = c.scrollTop;
            c.scrollTo({ top: current, behavior: 'auto' });
          }
        }}
        onScroll={() => {
          // Сбрасываем флаг ожидания когда скролл завершен
          if (pendingScrollRef.current) {
            setTimeout(() => {
              pendingScrollRef.current = false;
            }, 50);
          }
        }}
      >
        <div ref={contentWrapperRef} className="space-y-4 sm:space-y-6 pt-2 pb-16">
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
            <div
              ref={topBarRef}
              className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50"
            >
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
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Share Chat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous-mode"
                  checked={isAnonymousShare}
                  onCheckedChange={setIsAnonymousShare}
                />
                <Label htmlFor="anonymous-mode">Stay anonymous</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, your avatar and name will be replaced with "Anonymous" for viewers
              </p>
              
              {!shareLink ? (
                <Button onClick={generateShareLink} className="w-full">
                  Create Link
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="flex-1"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <CopyButton code={shareLink} />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShareLink(null)} 
                    className="w-full"
                  >
                    Create New Link
                  </Button>
                </div>
              )}
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
        "w-[85vw] sm:max-w-none max-w-none h-[80vh] p-0 [&>button]:top-2 [&>button]:right-2 overflow-hidden focus:outline-none grid-rows-none rounded-3xl",
        !settings.showChatPreview && "w-[650px] max-w-[650px]"
      )}>
        <div className={cn(
          "grid h-full grid-rows-1",
          settings.showChatPreview ? "grid-cols-[1fr_1px_900px]" : "grid-cols-1"
        )}>
          <div className="relative h-full flex-shrink-0 w-[320px]">
            <DialogHeader className="px-4 pt-4 pb-2 flex flex-col gap-2">
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
            <div className="absolute top-[120px] left-0 right-0 bottom-0">
              <ContentComponent />
            </div>
          </div>
          {settings.showChatPreview && (
            <>
              <div className="bg-border/50 w-px h-full"></div>
              <ChatPreview threadId={threadIdForPreview} onClose={() => handleOpenChange(false)} />
            </>
          )}
        </div>
        
        {/* Универсальная нижняя плашка на весь диалог */}
        {!isMobile && (
          <div
            ref={bottomBarRef}
            className="absolute bottom-0 left-0 right-0 h-12 bg-background/20 backdrop-blur-2xl border-t border-border/50 shadow-2xl pointer-events-none rounded-b-3xl"
          >
            <div className="flex items-center justify-between px-6 h-full text-xs text-muted-foreground">
              {/* Левая часть - навигация */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground/80 bg-muted/80 border border-border/50 rounded text-xs">↑</kbd>
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground/80 bg-muted/80 border border-border/50 rounded text-xs">↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground/80 bg-muted/80 border border-border/50 rounded text-xs">Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
              
              {/* Правая часть - действия */}
              {settings.showChatPreview && (threadIdForPreview || selectedThreadIndex >= 0) && (
                <div className="flex items-center gap-4">
                  {deletingThreadId ? (
                    /* Подсказки при удалении */
                    <>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground/80 bg-muted/80 border border-border/50 rounded text-xs">Enter</kbd>
                        <span>Confirm</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground/80 bg-muted/80 border border-border/50 rounded text-xs">Esc</kbd>
                        <span>Cancel</span>
                      </div>
                    </>
                  ) : (
                    /* Обычные подсказки */
                    <>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground/80 bg-muted/80 border border-border/50 rounded text-xs">Enter</kbd>
                        <span>Open</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground/80 bg-muted/80 border border-border/50 rounded text-xs">
                          {typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'}
                        </kbd>
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground/80 bg-muted/80 border border-border/50 rounded text-xs">D</kbd>
                        <span>Delete</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {desktop}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Share Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous-mode-desktop"
                checked={isAnonymousShare}
                onCheckedChange={setIsAnonymousShare}
              />
              <Label htmlFor="anonymous-mode-desktop">Stay anonymous</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, your avatar and name will be replaced with "Anonymous" for viewers
            </p>
            
            {!shareLink ? (
              <Button onClick={generateShareLink} className="w-full">
                Create Link
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={shareLink}
                    readOnly
                    className="flex-1"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <CopyButton code={shareLink} />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShareLink(null)} 
                  className="w-full"
                >
                  Create New Link
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(ChatHistoryDrawerComponent);
