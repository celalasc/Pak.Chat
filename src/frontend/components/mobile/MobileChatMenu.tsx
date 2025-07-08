"use client";

import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MoreHorizontal, Share2, Edit2, Trash2, Pin, PinOff, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { copyText } from '@/lib/copyText';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import type { Id, Doc } from '@/convex/_generated/dataModel';

interface MobileChatMenuProps {
  threadId: string;
  className?: string;
}

type MenuMode = 'main' | 'delete-confirm' | 'rename' | 'share';

function MobileChatMenu({ threadId, className }: MobileChatMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<MenuMode>('main');
  const [renameValue, setRenameValue] = useState('');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isAnonymousShare, setIsAnonymousShare] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const deleteThread = useMutation(api.threads.remove);
  const renameThread = useMutation(api.threads.rename);
  const togglePinThread = useMutation(api.threads.togglePin);
  const createShareLink = useMutation(api.threads.createShareLink);
  
  const thread = useQuery(
    api.threads.get,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setMode('main');
        setShareLink(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Сброс при закрытии меню
  useEffect(() => {
    if (!isOpen) {
      setMode('main');
      setShareLink(null);
      setRenameValue('');
    }
  }, [isOpen]);

  // Фокус на input при переходе в режим переименования
  useEffect(() => {
    if (mode === 'rename' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  const handleStartShare = useCallback(() => {
    setIsAnonymousShare(false);
    setShareLink(null);
    setMode('share');
  }, []);

  const generateShareLink = useCallback(async () => {
    if (!isConvexId(threadId)) return;
    
    const shareId = await createShareLink({ 
      threadId: threadId as Id<'threads'>, 
      isAnonymous: isAnonymousShare 
    });
    const url = `${window.location.origin}/share/${shareId}`;
    setShareLink(url);
  }, [threadId, createShareLink, isAnonymousShare]);

  const copyShareLink = useCallback(() => {
    if (shareLink) {
      copyText(shareLink);
    }
  }, [shareLink]);

  const handleStartRename = useCallback(() => {
    setRenameValue(thread?.title || '');
    setMode('rename');
  }, [thread?.title]);

  const handleSaveRename = useCallback(async () => {
    if (isConvexId(threadId) && renameValue.trim()) {
      await renameThread({ 
        threadId: threadId as Id<'threads'>, 
        title: renameValue.trim() 
      });
    }
    setIsOpen(false);
    setMode('main');
  }, [threadId, renameValue, renameThread]);

  const handleCancelRename = useCallback(() => {
    setMode('main');
    setRenameValue('');
  }, []);

  const handleStartDelete = useCallback(() => {
    setMode('delete-confirm');
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (isConvexId(threadId)) {
      await deleteThread({ threadId: threadId as Id<'threads'> });
      router.push('/home');
    }
    setIsOpen(false);
    setMode('main');
  }, [threadId, deleteThread, router]);

  const handleCancelDelete = useCallback(() => {
    setMode('main');
  }, []);

  const handleTogglePin = useCallback(async () => {
    if (!isConvexId(threadId)) return;
    
    await togglePinThread({ 
      threadId: threadId as Id<'threads'>, 
      pinned: !thread?.pinned 
    });
    setIsOpen(false);
    setMode('main');
  }, [threadId, thread?.pinned, togglePinThread]);

  // Обработка Enter в режиме переименования
  const handleRenameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="bg-background/60 backdrop-blur-xl border border-border/20 rounded-full h-9 w-9 shadow-lg hover:bg-background/80 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-12 right-0 z-50 min-w-[200px] bg-background/95 backdrop-blur-xl border border-border/20 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200 max-w-sm">
          {mode === 'main' && (
            <div className="py-2">
              <button
                onClick={handleStartShare}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-foreground hover:bg-accent/50 transition-colors duration-150"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              
              <button
                onClick={handleTogglePin}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-foreground hover:bg-accent/50 transition-colors duration-150"
              >
                {thread?.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {thread?.pinned ? 'Unpin' : 'Pin'}
              </button>
              
              <button
                onClick={handleStartRename}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-foreground hover:bg-accent/50 transition-colors duration-150"
              >
                <Edit2 className="h-4 w-4" />
                Rename
              </button>
              
              <div className="h-px bg-border/30 mx-2 my-1" />
              
              <button
                onClick={handleStartDelete}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-destructive hover:bg-destructive/10 transition-colors duration-150"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}

          {mode === 'rename' && (
            <div className="p-4">
              <div className="mb-3">
                <Input
                  ref={inputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={handleRenameKeyPress}
                  placeholder="Chat name"
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelRename}
                  className="flex-1 h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveRename}
                  disabled={!renameValue.trim()}
                  className="flex-1 h-8"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          )}

          {mode === 'delete-confirm' && (
            <div className="p-4">
              <div className="mb-3 text-sm text-foreground">
                Delete this chat?
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelDelete}
                  className="flex-1 h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  className="flex-1 h-8"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          {mode === 'share' && (
            <div className="p-4 space-y-3">
              <div className="text-sm font-medium text-foreground">Share this chat</div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymousShare}
                  onChange={(e) => setIsAnonymousShare(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="anonymous" className="text-sm text-foreground">
                  Share anonymously
                </label>
              </div>

              {!shareLink && (
                <Button
                  size="sm"
                  onClick={generateShareLink}
                  className="w-full h-8"
                >
                  Generate Link
                </Button>
              )}

              {shareLink && (
                <div className="space-y-2">
                  <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                    {shareLink}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode('main')}
                      className="flex-1 h-8"
                    >
                      Close
                    </Button>
                    <Button
                      size="sm"
                      onClick={copyShareLink}
                      className="flex-1 h-8"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(MobileChatMenu);