"use client"

import { useState, useMemo, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/frontend/components/ui/dialog';
import { Button, buttonVariants } from './ui/button';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
// Dexie imports removed as Convex is now the data source
import { useNavigate, useParams } from 'react-router';
import { X, Pin, PinOff, Search, MessageSquare, Plus, Edit2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePinnedThreads } from '@/frontend/hooks/usePinnedThreads';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';

// Minimal thread interface used for rendering
type Thread = Doc<'threads'>;

interface ChatHistoryDrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function ChatHistoryDrawer({ children, isOpen, setIsOpen }: ChatHistoryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<Id<'threads'> | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingThreadId, setDeletingThreadId] = useState<Id<'threads'> | null>(null);
  
  const { isMobile, mounted } = useIsMobile(600);
  const { pinnedThreads, togglePin } = usePinnedThreads();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  
  const threads = useQuery(
    api.threads.list,
    isAuthenticated ? undefined : "skip"
  );
  const createThread = useMutation(api.threads.create);
  const removeThread = useMutation(api.threads.remove);
  const renameThread = useMutation(api.threads.rename);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
      setEditingThreadId(null);
      setEditingTitle('');
      setDeletingThreadId(null);
    }
  }, [setIsOpen]);

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    
    const filtered = searchQuery.trim() 
      ? threads.filter(thread => 
          thread.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : threads;

    // Separate pinned and unpinned threads
    const pinned = filtered.filter(thread => pinnedThreads.has(thread._id));
    const unpinned = filtered.filter(thread => !pinnedThreads.has(thread._id));

    return [...pinned, ...unpinned];
  }, [threads, searchQuery, pinnedThreads]);

  const handleThreadClick = useCallback((threadId: Id<'threads'>) => {
    if (id === threadId) {
      handleOpenChange(false);
      return;
    }
    navigate(`/chat/${threadId}`);
    handleOpenChange(false);
  }, [id, navigate, handleOpenChange]);

  const handleEdit = useCallback((thread: Thread) => {
    setEditingThreadId(thread._id);
    setEditingTitle(thread.title);
  }, []);

  const handleSaveEdit = useCallback(async (threadId: Id<'threads'>) => {
    await renameThread({ threadId, title: editingTitle });
    setEditingThreadId(null);
    setEditingTitle('');
  }, [editingTitle, renameThread]);

  const handleCancelEdit = useCallback(() => {
    setEditingThreadId(null);
    setEditingTitle('');
  }, []);

  const handleDelete = useCallback((threadId: Id<'threads'>) => {
    setDeletingThreadId(threadId);
  }, []);

  const handleConfirmDelete = useCallback(async (threadId: Id<'threads'>) => {
    await removeThread({ threadId });
    if (id === threadId) {
      navigate('/chat');
    }
    setDeletingThreadId(null);
  }, [id, navigate, removeThread]);

  const handleCancelDelete = useCallback(() => {
    setDeletingThreadId(null);
  }, []);

  const handlePinToggle = useCallback((threadId: Id<'threads'>, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    togglePin(threadId);
  }, [togglePin]);

  const handleNewChat = useCallback(async () => {
    const newThreadId = await createThread({ title: 'New Chat' });
    navigate(`/chat/${newThreadId}`);
    handleOpenChange(false);
  }, [createThread, navigate, handleOpenChange]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const groupThreadsByDate = (threads: Thread[]) => {
    if (searchQuery) return [{ name: 'Search Results', threads }];
    
    const groups: { name: string; threads: Thread[] }[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const todayThreads = threads.filter(t =>
      new Date(t._creationTime).toDateString() === today.toDateString()
    );
    const yesterdayThreads = threads.filter(t =>
      new Date(t._creationTime).toDateString() === yesterday.toDateString()
    );
    const lastWeekThreads = threads.filter(t => {
      const threadDate = new Date(t._creationTime);
      return threadDate > lastWeek && threadDate < yesterday;
    });
    const olderThreads = threads.filter(t =>
      new Date(t._creationTime) <= lastWeek
    );
    
    if (todayThreads.length > 0) groups.push({ name: 'Today', threads: todayThreads });
    if (yesterdayThreads.length > 0) groups.push({ name: 'Yesterday', threads: yesterdayThreads });
    if (lastWeekThreads.length > 0) groups.push({ name: 'Last 7 days', threads: lastWeekThreads });
    if (olderThreads.length > 0) groups.push({ name: 'Older', threads: olderThreads });
    
    return groups;
  };

  const groupedThreads = useMemo(() => groupThreadsByDate(filteredThreads), [filteredThreads, searchQuery]);

  const renderThreadItem = useCallback((thread: Thread) => (
    <div key={thread._id}>
      <div className="space-y-1.5">
        {editingThreadId === thread._id ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEdit(thread._id);
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              className="flex-1 h-8 text-sm"
              autoFocus
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={() => handleSaveEdit(thread._id)}
            >
              <Check className="size-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={handleCancelEdit}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : deletingThreadId === thread._id ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <span className="flex-1 text-sm">Delete this chat?</span>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleConfirmDelete(thread._id)}
            >
              Delete
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCancelDelete}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent cursor-pointer transition-colors",
              id === thread._id && "bg-accent"
            )}
            onClick={() => handleThreadClick(thread._id)}
          >
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                {pinnedThreads.has(thread._id) && (
                  <Pin className="h-3 w-3 text-primary shrink-0" />
                )}
                <span className="line-clamp-1 text-sm font-medium">{thread.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(new Date(thread._creationTime))}</span>
            </div>
            <div className="flex gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      handleEdit(thread); 
                    }}
                  >
                    <Edit2 className="size-2.5 sm:size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={(e) => handlePinToggle(thread._id, e)}
                  >
                    {pinnedThreads.has(thread._id) ? (
                      <PinOff className="size-2.5 sm:size-3" />
                    ) : (
                      <Pin className="size-2.5 sm:size-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{pinnedThreads.has(thread._id) ? 'Unpin' : 'Pin'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      handleDelete(thread._id);
                    }}
                  >
                    <X className="size-2.5 sm:size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </div>
  ), [editingThreadId, deletingThreadId, id, editingTitle, pinnedThreads, handleThreadClick, handleEdit, handleSaveEdit, handleCancelEdit, handleConfirmDelete, handleCancelDelete, handlePinToggle, handleDelete]);

  // Early returns after all hooks
  if (!isAuthenticated) {
    return null;
  }
  
  if (threads === undefined) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading chat history...</p>
      </div>
    );
  }

  const ContentComponent = () => (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-none enhanced-scroll px-3 sm:px-4">
        <div className="space-y-4 sm:space-y-6 pt-2 pb-8">
          {filteredThreads.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              {searchQuery ? 'No chats found.' : 'No chat history found.'}
            </div>
          ) : searchQuery ? (
            filteredThreads.map(thread => renderThreadItem(thread))
          ) : (
            groupedThreads.map(group => (
              <div key={group.name} className="space-y-0.5">
                <h3 className="pl-2 text-sm font-medium text-muted-foreground">{group.name}</h3>
                <div className="space-y-1 sm:space-y-2">
                  {group.threads.map(thread => renderThreadItem(thread))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 flex flex-col gap-2">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat History
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="ml-auto"
              >
                <Plus className="size-4" />
              </Button>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Browse and search through your chat history
            </DialogDescription>
            <div className="relative">
              <Input
                placeholder="Search…"
                className="rounded-lg py-1.5 pl-8 text-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ContentComponent />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="max-h-[95vh] flex flex-col w-full">
          <div className="flex h-full max-h-[90vh] flex-col">
            {/* Pull handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-16 h-2 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Header with backdrop blur and search */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
              <DrawerHeader className="pb-2 flex flex-col gap-2">
                <DrawerTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" />
                  Chat History
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNewChat}
                    className="ml-auto"
                  >
                    <Plus className="size-4" />
                  </Button>
                </DrawerTitle>
                <div className="relative">
                  <Input
                    placeholder="Search…"
                    className="rounded-lg py-1.5 pl-8 text-sm w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                </div>
              </DrawerHeader>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none enhanced-scroll">
              <ContentComponent />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 flex flex-col gap-2">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat History
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="ml-auto"
            >
              <Plus className="size-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Browse and search through your chat history
          </DialogDescription>
          <div className="relative">
            <Input
              placeholder="Search…"
              className="rounded-lg py-1.5 pl-8 text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ContentComponent />
        </div>
      </DialogContent>
    </Dialog>
  );
} 