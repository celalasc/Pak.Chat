import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function AppShellSkeleton() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">Pak.Chat</span>
        </div>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
