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
import { filterByTitle } from "@/lib/searchUtils";
import EmptyState from "@/frontend/components/ui/EmptyState";

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
            placeholder="Search chats in any language..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() === '' ? (
          <EmptyState 
            type="no-history" 
            className="h-full flex flex-col justify-center"
          />
        ) : threads === undefined ? (
          <EmptyState type="loading" className="h-full flex flex-col justify-center" />
        ) : threads.length === 0 ? (
          <EmptyState 
            type="no-search-results" 
            searchQuery={searchQuery.trim()}
            className="h-full flex flex-col justify-center"
          />
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
                  {new Date(thread._creationTime).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 