"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { memo, useState } from "react";
import MarkdownRenderer from "./MemoizedMarkdown";
import { cn } from "@/lib/utils";
import MessageLoading from "./ui/MessageLoading";
import SelectableText from "./SelectableText";
import QuotedMessage from "./QuotedMessage";
import { Button } from "./ui/button";
import { Check, Copy, GitBranch } from "lucide-react";
import { useMutation, useQuery as useConvexQuery } from "convex/react";
import { isConvexId } from "@/lib/ids";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/* Константы — подстрой под свой реальный сайдбар                     */
/* ------------------------------------------------------------------ */
const SIDEBAR_WIDTH = 300;  // ширина ChatHistory
const SIDE_GAP      = 20;   // зазор между панелями

/* ------------------------------------------------------------------ */
/* Тип пропсов                                                         */
/* ------------------------------------------------------------------ */
interface ChatPreviewProps {
  threadId: Id<"threads"> | null;
  onClose?: () => void;
}

/* ------------------------------------------------------------------ */
/* Контролы (копирование / ветвление)                                  */
/* ------------------------------------------------------------------ */
const PreviewMessageControls = memo(
  ({
    threadId,
    content,
    message,
    onClose,
  }: {
    threadId: string;
    content: string;
    message: any;
    onClose?: () => void;
  }) => {
    const [copied, setCopied]  = useState(false);
    const cloneThread          = useMutation(api.threads.clone);
    const thread               = useConvexQuery(
      api.threads.get,
      isConvexId(threadId) ? { threadId: threadId as Id<"threads"> } : "skip"
    );
    const router = useRouter();

    const handleCopy = () => {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleBranch = async () => {
      if (!isConvexId(threadId)) return;
      const title = thread?.title ?? content.slice(0, 30);
      const newId = await cloneThread({
        threadId: threadId as Id<"threads">,
        title,
      });
      router.push(`/chat/${newId}`);
      onClose?.();
    };

    return (
      <div
        className={cn(
          "transition-opacity duration-100 flex gap-1 opacity-0 group-hover:opacity-100 pointer-events-auto",
          { "absolute mt-5 right-2 z-10": message.role === "user" }
        )}
      >
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleBranch}>
          <GitBranch className="w-4 h-4" />
        </Button>
      </div>
    );
  }
);
PreviewMessageControls.displayName = "PreviewMessageControls";

/* ------------------------------------------------------------------ */
/* Одно сообщение                                                      */
/* ------------------------------------------------------------------ */
const PreviewMessage = memo(
  ({
    message,
    threadId,
    onClose,
  }: {
    message: any;
    threadId: Id<"threads">;
    onClose?: () => void;
  }) => {
    const isUser = message.role === "user";

    return (
      <div className={cn("flex flex-col", isUser ? "items-end mb-2" : "items-start mb-4")}>
        {isUser ? (
          <div className="relative group px-4 py-3 rounded-xl bg-secondary max-w-[85%] break-words mb-2">
            <QuotedMessage content={message.content} />
            <PreviewMessageControls
              threadId={threadId}
              content={message.content}
              message={message}
              onClose={onClose}
            />
          </div>
        ) : (
          <div className="group flex flex-col gap-2 w-full max-w-full overflow-hidden relative pb-3">
            <SelectableText messageId={message._id}>
              <div className="prose prose-xs dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 break-words">
                <MarkdownRenderer content={message.content} />
              </div>
            </SelectableText>

            <PreviewMessageControls
              threadId={threadId}
              content={message.content}
              message={message}
              onClose={onClose}
            />
          </div>
        )}
      </div>
    );
  }
);
PreviewMessage.displayName = "PreviewMessage";

/* ------------------------------------------------------------------ */
/* Основной компонент                                                  */
/* ------------------------------------------------------------------ */
export default function ChatPreview({ threadId, onClose }: ChatPreviewProps) {
  const messages = useQuery(
    api.messages.preview,
    threadId ? { threadId, limit: 8 } : "skip"
  );

  /* ---------- Заглушки ---------- */
  const placeholder = (text: string, showLoading = false) => (
    <div className="flex items-center justify-center h-full">
      {showLoading ? (
        <MessageLoading />
      ) : (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );

  if (!threadId)                 return placeholder("Hover a chat to preview");
  if (messages === undefined)    return placeholder("", true);
  if (messages.length === 0)     return placeholder("No messages");

  /* ---------- Превью ---------- */
  return (
    <div className="absolute top-0 right-0 bottom-0 w-[600px] bg-background border-l border-border">
      {/* заголовок */}
      <div className="px-4 py-3 shrink-0 border-b border-border">
        <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
      </div>

      {/* список сообщений */}
      <div
        className="flex-1 min-h-0 overflow-y-auto h-[calc(100%-60px)]"
        style={{
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
        }}
      >
        <div className="flex flex-col space-y-6 p-4">
          {messages
            .toReversed() /* newest at top */
            .map((message) => (
              <PreviewMessage
                key={message._id}
                message={message}
                threadId={threadId}
                onClose={onClose}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
