"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { memo, useState, useMemo } from "react";
import Image from 'next/image';
import MarkdownRenderer from "./MemoizedMarkdown";
import MessageReasoning from "./MessageReasoning";
import { cn } from "@/lib/utils";
import MessageLoading from "./ui/MessageLoading";
import SelectableText from "./SelectableText";
import QuotedMessage from "./QuotedMessage";
import { Button } from "./ui/button";
import { Check, Copy, GitBranch } from "lucide-react";
import { copyText } from '@/lib/copyText';
import { useMutation, useQuery as useConvexQuery } from "convex/react";
import { isConvexId } from "@/lib/ids";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/* Константы — подстрой под свой реальный сайдбар                     */
/* ------------------------------------------------------------------ */
const SIDEBAR_WIDTH = 900;  // ширина ChatPreview (увеличена с 750px на 20%)
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
      copyText(content);
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
    const attachments = (message as any).attachments as {
      id: string;
      url: string;
      name: string;
      type: string;
      ext?: string;
      size?: number;
    }[] | undefined;

    // Извлекаем reasoning из сообщения
    const reasoningData = useMemo(() => {
      const extractReasoning = (text: string) => {
        const openTag = text.indexOf('<think>');
        const closeTag = text.indexOf('</think>');
        
        if (openTag === -1) return null;
        
        const startIndex = openTag + 7;
        const endIndex = closeTag > -1 ? closeTag : text.length;
        const rawReasoning = text.slice(startIndex, endIndex);
        const cleanReasoning = rawReasoning.replace(/g:"([^"]*)"/g, '$1');
        
        return {
          reasoning: cleanReasoning,
          isComplete: closeTag > -1
        };
      };

      // Проверяем содержимое сообщения на наличие reasoning
      if (message.content && message.content.includes('<think>')) {
        return extractReasoning(message.content);
      }
      return null;
    }, [message.content]);

    return (
      <div className={cn("flex flex-col", isUser ? "items-end mb-2" : "items-start mb-4")}>
        {isUser ? (
          <div className="relative group px-4 py-3 rounded-xl bg-secondary max-w-[85%] break-words mb-2">
            {attachments && attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {attachments.map((a, index) =>
                  a.type.startsWith('image') ? (
                    <Image
                      key={`${a.id}-${index}`}
                      src={a.url}
                      className="h-16 w-16 rounded object-cover"
                      alt={a.name}
                      width={64}
                      height={64}
                    />
                  ) : (
                    <a
                      key={`${a.id}-${index}`}
                      href={a.url}
                      target="_blank"
                      className="h-8 w-24 bg-muted rounded flex flex-col items-center justify-center text-[10px] px-1 hover:bg-accent"
                    >
                      <span className="line-clamp-1">{a.name}</span>
                      <span className="text-muted-foreground">{a.ext}</span>
                    </a>
                  )
                )}
              </div>
            )}
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
            {/* Показываем reasoning отдельно если найден */}
            {reasoningData && reasoningData.reasoning.trim() && (
              <MessageReasoning
                key={`reasoning-${message._id}`}
                reasoning={reasoningData.reasoning}
                id={message._id}
                isComplete={reasoningData.isComplete}
              />
            )}

            <SelectableText messageId={message._id}>
              <div className="prose prose-xs dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 break-words">
                <MarkdownRenderer content={message.content} />
              </div>
            </SelectableText>

            {attachments && attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {attachments.map((a, index) =>
                  a.type.startsWith('image') ? (
                    <Image
                      key={`${a.id}-${index}`}
                      src={a.url}
                      className="h-12 w-12 rounded object-cover"
                      alt={a.name}
                      width={48}
                      height={48}
                    />
                  ) : (
                    <a
                      key={`${a.id}-${index}`}
                      href={a.url}
                      target="_blank"
                      className="h-8 w-24 bg-muted rounded flex flex-col items-center justify-center text-[10px] px-1 hover:bg-accent"
                    >
                      <span className="line-clamp-1">{a.name}</span>
                      <span className="text-muted-foreground">{a.ext}</span>
                    </a>
                  )
                )}
              </div>
            )}

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
  // No auto-scroll logic needed
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
    <div className="h-full w-full bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col">


      {/* список сообщений */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex flex-col space-y-6 p-4 pb-16">
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
