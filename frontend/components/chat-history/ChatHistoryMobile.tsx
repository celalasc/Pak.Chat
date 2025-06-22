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
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import CopyButton from "../ui/CopyButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/frontend/hooks/useIsMobile";
import { useConvexThreads } from "@/frontend/hooks/useConvexThreads";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import ChatPreview from "./components/ChatPreview";
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
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

interface ChatHistoryMobileProps {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ChatHistoryMobileComponent: React.FC<ChatHistoryMobileProps> = ({
  children,
  isOpen,
  setIsOpen,
}) => {
  const [rawQuery, setRawQuery] = useState("");
  const searchQuery = useDeferredValue(rawQuery);
  const [editingThreadId, setEditingThreadId] = useState<Id<"threads"> | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState<Id<"threads"> | null>(null);
  const [mobileMenuThreadId, setMobileMenuThreadId] = useState<Id<"threads"> | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isAnonymousShare, setIsAnonymousShare] = useState(false);
  const [sharingThread, setSharingThread] = useState<Thread | null>(null);

  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const id = params?.slug?.[0] as Id<"threads"> | undefined;

  const { threads } = useConvexThreads();
  const renameThread = useMutation(api.threads.rename);
  const deleteThread = useMutation(api.threads.remove);
  const togglePin = useMutation(api.threads.togglePin);
  const createShareLink = useMutation(api.threads.createShareLink);

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
      if (!open || isOpen !== open) {
        setIsOpen(open);
      }
    },
    [setIsOpen, isOpen],
  );

  const threadGroups = useMemo(() => {
    if (!threads) return [] as ThreadGroup[];
    
    // Используем улучшенную фильтрацию с поддержкой Unicode
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
      setMobileMenuThreadId(null);
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
      setMobileMenuThreadId(null);
    },
    [],
  );

  const renderThreadItem = useCallback(
    (thread: Thread) => (
      <div
        key={thread._id}
        onClick={() => {
          if (!editingThreadId) {
            handleThreadClick(thread._id);
          }
        }}
        className={cn(
          "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-accent border border-transparent",
          id === thread._id
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-accent",
        )}
      >
        {/* Left side icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {thread.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
          {thread.clonedFrom && <GitBranch className="h-3.5 w-3.5 text-primary" />}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingThreadId === thread._id ? (
            <div className="flex items-center gap-2">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="h-8 text-sm flex-1"
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
                className="h-8 w-8"
                onClick={() => {
                  handleSaveEdit(thread._id);
                }}
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  handleCancelEdit();
                }}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <h4 className="text-sm font-medium line-clamp-1 text-foreground">{thread.title}</h4>
          )}
        </div>

        {/* Right side buttons */}
        <div className="flex gap-0.5 sm:gap-1 shrink-0">
          {!editingThreadId && (
            <>
              {/* Mobile action menu */}
              {mobileMenuThreadId === thread._id && (
                <div
                  id={`mobile-menu-${thread._id}`}
                  className="absolute right-2 top-12 z-50 bg-background border rounded-lg shadow-lg p-1 min-w-[120px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePinToggle(thread._id, e);
                      setMobileMenuThreadId(null);
                    }}
                  >
                    {thread.pinned ? <PinOff className="size-3 mr-2" /> : <Pin className="size-3 mr-2" />}
                    {thread.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleShare(thread);
                      setMobileMenuThreadId(null);
                    }}
                  >
                    <Share2 className="size-3 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 px-2 text-xs text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(thread._id);
                      setMobileMenuThreadId(null);
                    }}
                  >
                    <X className="size-3 mr-2" />
                    Delete
                  </Button>
                </div>
              )}

              {deletingThreadId === thread._id ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 px-3 text-xs"
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
                    className="h-8 px-3 text-xs"
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
                  {/* Desktop buttons */}
                  <div className="hidden sm:flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEdit(thread);
                          }}
                        >
                          <Edit2 className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            handlePinToggle(thread._id, e);
                          }}
                        >
                          {thread.pinned ? (
                            <PinOff className="size-3" />
                          ) : (
                            <Pin className="size-3" />
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
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShare(thread);
                          }}
                        >
                          <Share2 className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(thread._id);
                          }}
                        >
                          <X className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Mobile menu trigger */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 sm:hidden"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMobileMenuThreadId(
                        mobileMenuThreadId === thread._id ? null : thread._id
                      );
                    }}
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    ),
    [
      id,
      editingThreadId,
      editingTitle,
      mobileMenuThreadId,
      deletingThreadId,
      handleThreadClick,
      handleEdit,
      handleSaveEdit,
      handleCancelEdit,
      handlePinToggle,
      handleShare,
      handleDelete,
      handleConfirmDelete,
      handleCancelDelete,
      setMobileMenuThreadId,
    ],
  );

  if (!user || threads === undefined) return null;

  return (
    <>
      <Drawer 
        open={isOpen} 
        onOpenChange={handleOpenChange}
        shouldScaleBackground={false}
        dismissible={true}
        modal={true}
        snapPoints={[1]}
        fadeFromIndex={0}
        closeThreshold={0.5}
      >
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="h-[85vh] flex flex-col bg-background border-border">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <DrawerHeader className="pb-2 flex flex-col gap-2 border-b border-border bg-background">
              <DrawerTitle className="flex items-center gap-2 text-lg text-foreground">
                <MessageSquare className="h-5 w-5 text-foreground" />
                Chat History
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewChat}
                  className="ml-auto flex items-center gap-2 text-sm hover:bg-accent text-foreground"
                >
                  <Plus className="size-4" />
                  New chat
                </Button>
              </DrawerTitle>
              <div className="relative">
                <Input
                  placeholder="Search in any language…"
                  className="rounded-lg py-2 pl-8 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground"
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
              </div>
            </DrawerHeader>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none enhanced-scroll bg-background">
              {threads === undefined ? (
                searchQuery.trim() ? (
                  <EmptyState type="loading" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-pulse text-muted-foreground text-sm">Loading chats...</div>
                  </div>
                )
              ) : threadGroups.length === 0 ? (
                <EmptyState 
                  type={searchQuery.trim() ? "no-search-results" : "no-history"} 
                  searchQuery={searchQuery.trim()}
                />
              ) : (
                <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 pb-16">
                  {threadGroups.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                        {group.title}
                      </h3>
                      <div className="space-y-1">
                        {group.threads.map(renderThreadItem)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

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
};

export default memo(ChatHistoryMobileComponent); 