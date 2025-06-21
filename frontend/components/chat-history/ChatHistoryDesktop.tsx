"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  memo,
  useDeferredValue,
  useEffect,
  useRef,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import CopyButton from "../ui/CopyButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";
import { Label } from "@/components/ui/label";
import { useRouter, useParams } from "next/navigation";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../ui/command";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConvexThreads } from "@/frontend/hooks/useConvexThreads";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import ChatPreview from "./components/ChatPreview";
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { useDebounce } from "use-debounce";

interface Thread extends Doc<"threads"> {
  pinned?: boolean;
  clonedFrom?: Id<"threads">;
}

interface ThreadGroup {
  title: string;
  threads: Thread[];
}

interface ChatHistoryDesktopProps {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ChatHistoryDesktopComponent: React.FC<ChatHistoryDesktopProps> = ({
  children,
  isOpen,
  setIsOpen,
}) => {
  const [rawQuery, setRawQuery] = useState("");
  const searchQuery = useDeferredValue(rawQuery);
  const [editingThreadId, setEditingThreadId] = useState<Id<"threads"> | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState<Id<"threads"> | null>(null);
  const [hoveredThreadId, setHoveredThreadId] = useState<Id<"threads"> | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isAnonymousShare, setIsAnonymousShare] = useState(false);
  const [sharingThread, setSharingThread] = useState<Thread | null>(null);

  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const router = useRouter();
  const params = useParams();
  const id = params?.slug?.[0] as Id<"threads"> | undefined;

  const { threads } = useConvexThreads();
  const renameThread = useMutation(api.threads.rename);
  const deleteThread = useMutation(api.threads.remove);
  const togglePin = useMutation(api.threads.togglePin);
  const createShareLink = useMutation(api.threads.createShareLink);

  // Debounced hover for preview - minimal delay for better responsiveness
  const [debouncedHoverId] = useDebounce(hoveredThreadId, 50);
  
  // Track keyboard navigation for preview - simplified version
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Debounced update for preview
        setTimeout(() => {
          const selectedItem = document.querySelector('[cmdk-item][data-selected="true"]');
          if (selectedItem) {
            const threadId = selectedItem.getAttribute('data-thread-id') as Id<"threads">;
            if (threadId && threadId !== hoveredThreadId) {
              setHoveredThreadId(threadId);
            }
          }
        }, 50);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hoveredThreadId]);

  // Group threads by time period
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

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Сбрасываем все состояния при закрытии
        setEditingThreadId(null);
        setEditingTitle("");
        setDeletingThreadId(null);
        setHoveredThreadId(null);
        setShareDialogOpen(false);
        setShareLink(null);
        setSharingThread(null);
      }
      setIsOpen(open);
    },
    [setIsOpen],
  );

  const threadGroups = useMemo(() => {
    if (!threads) return [] as ThreadGroup[];
    
    let filteredThreads = threads;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredThreads = threads.filter(thread => 
        thread.title.toLowerCase().includes(query)
      );
    }
    
    return groupThreadsByTime(filteredThreads);
  }, [threads, searchQuery]);

  // Simplified memoization
  const memoizedThreadGroups = threadGroups;

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
          await renameThread({ threadId, title: editingTitle.trim() });
        } catch (error) {
          console.error("Failed to update thread title:", error);
        }
      }
      setEditingThreadId(null);
      setEditingTitle("");
    },
    [editingTitle, threads, renameThread],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingThreadId(null);
    setEditingTitle("");
  }, []);

  const handlePinToggle = useCallback(
    async (threadId: Id<"threads">, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const thread = threads?.find(t => t._id === threadId);
      if (thread) {
        try {
          await togglePin({ threadId, pinned: !thread.pinned });
        } catch (error) {
          console.error("Failed to toggle pin:", error);
        }
      }
    },
    [threads, togglePin],
  );

  const handleDelete = useCallback((threadId: Id<"threads">) => {
    setDeletingThreadId(threadId);
  }, []);

  const handleConfirmDelete = useCallback(
    async (threadId: Id<"threads">) => {
      try {
        await deleteThread({ threadId });
        if (id === threadId) {
          router.push("/chat");
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
      }
      setDeletingThreadId(null);
    },
    [deleteThread, id, router],
  );

  const handleCancelDelete = useCallback(() => {
    setDeletingThreadId(null);
  }, []);

  const generateShareLink = useCallback(async () => {
    if (!sharingThread) return;
    
    try {
      const result = await createShareLink({
        threadId: sharingThread._id,
        isAnonymous: isAnonymousShare,
      });
      
      if (result) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        setShareLink(`${baseUrl}/share/${result}`);
      }
    } catch (error) {
      console.error("Failed to generate share link:", error);
    }
  }, [sharingThread, isAnonymousShare, createShareLink]);

  const handleShare = useCallback(
    async (thread: Thread) => {
      setIsAnonymousShare(false);
      setSharingThread(thread);
      setShareLink(null);
      setShareDialogOpen(true);
    },
    [],
  );

  // Thread item component
  const ThreadItem = ({ thread }: { thread: Thread }) => (
    <CommandItem
      key={thread._id}
      value={thread._id}
      onSelect={() => handleThreadClick(thread._id)}
      onMouseEnter={() => setHoveredThreadId(thread._id)}
      className="group flex items-center justify-between p-2 cursor-pointer hover:bg-accent/50 data-[selected=true]:bg-accent text-foreground min-h-[40px]"
      data-thread-id={thread._id}
    >
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          {thread.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
          {thread.clonedFrom && <GitBranch className="h-3 w-3 text-primary shrink-0" />}
          {editingThreadId === thread._id ? (
            <div className="flex items-center gap-2 w-full">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="h-6 text-sm flex-1 bg-background border-border"
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
                className="h-6 w-6 hover:bg-accent hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveEdit(thread._id);
                }}
              >
                <Check className="size-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelEdit();
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            <span className="line-clamp-1 text-sm font-medium text-foreground">{thread.title}</span>
          )}
        </div>
      </div>
      
      {/* Action buttons */}
      <div 
        className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!editingThreadId && deletingThreadId !== thread._id && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdit(thread);
              }}
            >
              <Edit2 className="size-3" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePinToggle(thread._id, e);
              }}
            >
              {thread.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleShare(thread);
              }}
            >
              <Share2 className="size-3" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(thread._id);
              }}
            >
              <X className="size-3" />
            </Button>
          </>
        )}
        
        {deletingThreadId === thread._id && (
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
        )}
      </div>
    </CommandItem>
  );

  // Thread item renderer
  const renderThreadItem = (thread: Thread) => <ThreadItem key={thread._id} thread={thread} />;

  if (!user || threads === undefined) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className={cn(
          "w-[85vw] sm:max-w-none max-w-none h-[80vh] p-0 [&>button]:hidden overflow-hidden focus:outline-none grid-rows-none rounded-3xl bg-background border-border flex flex-col",
          !settings.showChatPreview && "w-[650px] max-w-[650px]"
        )}>
          <DialogHeader className="sr-only">
            <DialogTitle>История чатов</DialogTitle>
          </DialogHeader>
          
          <Command className="flex-1 bg-background">
            <div className={cn(
              "grid h-full grid-rows-1",
              settings.showChatPreview ? "grid-cols-[500px_1px_1fr]" : "grid-cols-1"
            )}>
              <div 
                className={cn(
                  "relative h-full flex-shrink-0 flex flex-col",
                  settings.showChatPreview ? "w-[500px]" : "w-full"
                )}
                onMouseLeave={() => {
                  // Убираем hover только при выходе из левой панели
                  if (settings.showChatPreview) {
                    // Увеличиваем задержку, чтобы успеть навести на превью
                    setTimeout(() => {
                      // Проверяем, не наведен ли курсор на превью
                      const previewElement = document.querySelector('[data-preview-area]');
                      if (previewElement && !previewElement.matches(':hover')) {
                        setHoveredThreadId(null);
                      }
                    }, 300);
                  }
                }}
              >
                {/* Search Header - только для левой панели */}
                <div className="p-4 border-b border-border bg-background">
                  <CommandInput
                    placeholder="Search..."
                    value={rawQuery}
                    onValueChange={setRawQuery}
                    className="w-full bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 bg-background">
                  <CommandList className="max-h-none h-full bg-background">
                    <CommandEmpty className="text-muted-foreground">No chats found.</CommandEmpty>
                    {memoizedThreadGroups.map((group) => (
                      <CommandGroup key={group.title} heading={group.title} className="text-muted-foreground">
                        {group.threads.map(renderThreadItem)}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </div>

                {/* Footer */}
                <div className="border-t border-border p-3 bg-background">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-accent border border-border rounded text-foreground">↑</kbd>
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-accent border border-border rounded text-foreground">↓</kbd>
                        <span>Navigate</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-accent border border-border rounded text-foreground">Enter</kbd>
                        <span>Open</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-accent border border-border rounded text-foreground">Esc</kbd>
                        <span>Close</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              {settings.showChatPreview && (
                <>
                  <div className="bg-border/50 w-px h-full"></div>
                  <div 
                    className="flex-1 min-w-0"
                    data-preview-area
                    onMouseEnter={() => {
                      // Сохраняем текущий hover при наведении на превью
                    }}
                    onMouseLeave={() => {
                      // Убираем hover только при выходе из превью с задержкой
                      setTimeout(() => setHoveredThreadId(null), 200);
                    }}
                  >
                    <ChatPreview threadId={debouncedHoverId} onClose={() => handleOpenChange(false)} />
                  </div>
                </>
              )}
            </div>
          </Command>
        </DialogContent>
      </Dialog>

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
};

export default memo(ChatHistoryDesktopComponent); 