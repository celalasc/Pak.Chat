"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ChatPreviewProps {
  threadId: Id<"threads"> | null;
}

export default function ChatPreview({ threadId }: ChatPreviewProps) {
  const messages = useQuery(
    api.messages.preview,
    threadId ? { threadId, limit: 4 } : "skip"
  );

  if (!threadId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Hover a chat to preview
      </div>
    );
  }

  if (messages === undefined) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No messages</div>
    );
  }

  return (
    <div className="p-4 space-y-2 overflow-y-auto">
      {messages
        .slice()
        .reverse()
        .map((m) => (
          <div key={m._id} className="text-sm text-muted-foreground">
            {m.content}
          </div>
        ))}
    </div>
  );
}
