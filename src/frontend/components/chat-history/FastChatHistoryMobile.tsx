"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  memo,
  useDeferredValue,
} from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useRouter, useParams } from "next/navigation";
import {
  MessageSquare,
  Search,
  Plus,
  Pin,
  PinOff,
  Edit2,
  Share2,
  X,
  Check,
  GitBranch,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/frontend/hooks/useIsMobile";
import { useConvexThreads } from "@/frontend/hooks/useConvexThreads";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "use-debounce";
import { filterByTitle } from "@/lib/searchUtils";
import EmptyState from "@/frontend/components/ui/EmptyState";

interface Thread extends Doc<"threads"> {
  pinned?: boolean;
  clonedFrom?: Id<"threads">;
}

interface ThreadGroup {
  title: string;
  threads: Thread[];
}

interface FastChatHistoryMobileProps {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
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

// Оптимизированный компонент для отображения треда
const MobileThreadItem = memo(({ 
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
  onTogglePin: (threadId: Id<"threads">) => void;
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
    onTogglePin(thread._id);
  }, [thread._id, onTogglePin]);

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
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
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

MobileThreadItem.displayName = "MobileThreadItem";

const FastChatHistoryMobileComponent: React.FC<FastChatHistoryMobileProps> = ({
  children,
  isOpen,
  setIsOpen,
}) => {
  const [rawQuery, setRawQuery] = useState("");
  const searchQuery = useDeferredValue(rawQuery);
  const [editingThreadId, setEditingThreadId] = useState<Id<"threads"> | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState<Id<"threads"> | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isAnonymousShare, setIsAnonymousShare] = useState(false);
  const [sharingThread, setSharingThread] = useState<Thread | null>(null);

  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const id = params?.slug?.[0] as Id<"threads"> | undefined;

  // Используем оптимизированный хук
  const { 
    threads, 
    isLoading, 
    hasValidCache 
  } = useConvexThreads();

  const renameThread = useMutation(api.threads.rename);
  const deleteThread = useMutation(api.threads.remove);
  const togglePin = useMutation(api.threads.togglePin);
  const createShareLink = useMutation(api.threads.createShareLink);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open || isOpen !== open) {
        setIsOpen(open);
      }
    },
    [setIsOpen, isOpen],
  );

  const threadGroups = useMemo(() => {
    if (!threads) return [] as ThreadGroup[];
    
    const filteredThreads = filterByTitle(threads, searchQuery);
    return groupThreadsByTime(filteredThreads);
  }, [threads, searchQuery]);

  const handleThreadClick = useCallback(
    (threadId: Id<"threads">) => {
      router.push(`/chat/${threadId}`);
      handleOpenChange(false);
    },
    [router, handleOpenChange],
  );

  const handleNewChat = useCallback(() => {
    router.push("/chat");
    handleOpenChange(false);
  }, [router, handleOpenChange]);

  const handleEdit = useCallback((thread: Thread) => {
    setEditingThreadId(thread._id);
    setEditingTitle(thread.title);
  }, []);

  const handleSaveEdit = useCallback(
    async (threadId: Id<"threads">) => {
      if (editingTitle.trim() && editingTitle !== threads?.find(t => t._id === threadId)?.title) {
        try {
          await renameThread({ threadId, title: editingTitle });
        } catch (error) {
          console.error("Failed to rename thread:", error);
        }
      }
      setEditingThreadId(null);
      setEditingTitle("");
    },
    [editingTitle, renameThread, threads],
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
      try {
        await deleteThread({ threadId });
        setDeletingThreadId(null);
      } catch (error) {
        console.error("Failed to delete thread:", error);
      }
    },
    [deleteThread],
  );

  const handleTogglePin = useCallback(
    async (threadId: Id<"threads">) => {
      try {
        await togglePin({ threadId });
      } catch (error) {
        console.error("Failed to toggle pin:", error);
      }
    },
    [togglePin],
  );

  const handleShare = useCallback(async (thread: Thread) => {
    setSharingThread(thread);
    setShareDialogOpen(true);
    
    try {
      const shareId = await createShareLink({ 
        threadId: thread._id, 
        isAnonymous: isAnonymousShare 
      });
      setShareLink(`${window.location.origin}/share/${shareId}`);
    } catch (error) {
      console.error("Failed to create share link:", error);
    }
  }, [createShareLink, isAnonymousShare]);

  // Показываем загрузку только если нет кэша
  if (isLoading && !hasValidCache()) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Chat History</DrawerTitle>
          </DrawerHeader>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Chat History</DrawerTitle>
        </DrawerHeader>
        
        <div className="p-4 space-y-4">
          {/* Поиск */}
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

          {/* Кнопка нового чата */}
          <Button
            onClick={handleNewChat}
            className="w-full"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>

          {/* Список чатов */}
          {!threads || threads.length === 0 ? (
            <EmptyState
              type="no-chats"
              title="No chat history"
              hint="Start chatting to build your history"
            />
          ) : (
            <div className="space-y-4">
              {threadGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-3">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.threads.map((thread) => (
                      <MobileThreadItem
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
          )}
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

        {/* Диалог шаринга */}
        {shareDialogOpen && sharingThread && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">Share Chat</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymousShare}
                    onChange={(e) => setIsAnonymousShare(e.target.checked)}
                  />
                  <label htmlFor="anonymous">Share anonymously</label>
                </div>
                {shareLink && (
                  <div className="space-y-2">
                    <Input value={shareLink} readOnly />
                    <Button
                      onClick={() => navigator.clipboard.writeText(shareLink)}
                      className="w-full"
                    >
                      Copy Link
                    </Button>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShareDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default memo(FastChatHistoryMobileComponent);