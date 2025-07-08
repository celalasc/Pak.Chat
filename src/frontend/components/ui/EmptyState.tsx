import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Search, MessageSquare, Inbox, Globe, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-chats' | 'no-search-results' | 'no-history' | 'loading';
  searchQuery?: string;
  className?: string;
}

const icons = {
  'no-chats': MessageSquare,
  'no-search-results': Search,
  'no-history': Inbox,
  'loading': Sparkles,
};

const messages = {
  'no-chats': {
    title: 'No chats yet',
    subtitle: 'Start a new conversation to begin',
    hint: 'Click the "New Chat" button to get started'
  },
  'no-search-results': {
    title: 'No matching chats found',
    subtitle: 'Try different keywords or check spelling',
    hint: 'Search works in any language - English, Arabic, Chinese, etc.'
  },
  'no-history': {
    title: 'No chat history',
    subtitle: 'Your conversations will appear here',
    hint: 'Start chatting to build your history'
  },
  'loading': {
    title: 'Searching...',
    subtitle: 'Finding your chats',
    hint: ''
  }
};

const EmptyState = memo(function EmptyState({ type, searchQuery, className }: EmptyStateProps) {
  const IconComponent = icons[type];
  const message = messages[type];
  
  const isSearching = type === 'no-search-results' && searchQuery;
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6 text-center",
      "text-muted-foreground space-y-4",
      className
    )}>
      <div className={cn(
        "relative",
        type === 'loading' && "animate-pulse"
      )}>
        <div className={cn(
          "flex items-center justify-center w-16 h-16 rounded-2xl",
          "bg-muted/30 border border-border/50",
          isSearching && "bg-destructive/10 border-destructive/20"
        )}>
          <IconComponent className={cn(
            "w-8 h-8",
            isSearching ? "text-destructive/60" : "text-muted-foreground/60",
            type === 'loading' && "animate-bounce"
          )} />
        </div>
        
        {/* Глобус для указания поддержки языков */}
        {type === 'no-search-results' && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center">
            <Globe className="w-3 h-3 text-primary" />
          </div>
        )}
      </div>
      
      <div className="space-y-2 max-w-sm">
        <h3 className={cn(
          "font-semibold text-lg",
          isSearching ? "text-foreground" : "text-muted-foreground"
        )}>
          {isSearching ? `No results for "${searchQuery}"` : message.title}
        </h3>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          {message.subtitle}
        </p>
        
        {message.hint && (
          <p className="text-xs text-muted-foreground/70 italic pt-2">
            {message.hint}
          </p>
        )}
      </div>
      
      {/* Анимированные точки для поиска */}
      {type === 'loading' && (
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default EmptyState; 