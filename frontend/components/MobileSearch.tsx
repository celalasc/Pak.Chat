"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useDebounce } from 'use-debounce';
import type { Id } from '@/convex/_generated/dataModel';
import { saveLastChatId } from '@/frontend/lib/lastChat';

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSearch({ isOpen, onClose }: MobileSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const threads = useQuery(
    api.threads.search,
    debouncedQuery.trim() ? { searchQuery: debouncedQuery } : 'skip'
  );

  // Фокус на input при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300); // Даем время на анимацию
    }
  }, [isOpen]);

  // Очистка при закрытии
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleThreadClick = (threadId: Id<'threads'>) => {
    router.push(`/chat/${threadId}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 bg-background z-50 flex flex-col transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chats..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() === '' ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start typing to search your chats</p>
            </div>
          </div>
        ) : threads === undefined ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>No chats found</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {threads.map((thread) => (
              <div
                key={thread._id}
                onClick={() => handleThreadClick(thread._id)}
                className="p-3 rounded-lg border border-border/50 bg-card hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="font-medium truncate">{thread.title}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {new Date(thread.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 