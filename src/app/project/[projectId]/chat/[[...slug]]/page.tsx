"use client";

import { useParams } from "next/navigation";
import { use, useEffect, useMemo, useState, useRef, memo, useCallback } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { isConvexId } from "@/lib/ids";
import Chat from "@/frontend/components/Chat";
import ErrorBoundary from "@/frontend/components/ErrorBoundary";
import { useIsMobile } from "@/frontend/hooks/useIsMobile";
import { saveLastChatId, saveLastPath } from "@/frontend/lib/lastChat";
import type { UIMessage } from "ai";
import { useProject } from "@/features/projects/hooks/useProject";
import { useRouter } from "next/navigation";
import ProjectKnowledge from "@/features/projects/components/ProjectKnowledge";
import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/frontend/components/WithTooltip";
import { Settings, Plus } from "lucide-react";
import SettingsDrawer from "@/frontend/components/SettingsDrawer";
import { ChatHistoryButton } from "@/frontend/components/chat-history";

const ProjectChatPageInner = memo(function ProjectChatPageInner({ 
  params 
}: { 
  params: Promise<{ projectId: string; slug: string[] }> 
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId as Id<"projects">;
  const chatId = resolvedParams.slug?.[0];
  
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { isMobile, mounted } = useIsMobile();
  const wasMobileRef = useRef(isMobile);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setIsSettingsOpen(open);
  }, []);

  const handleNewChat = useCallback(() => {
    router.push(`/project/${projectId}/chat`);
  }, [router, projectId]);

  // Load project data
  const { project, files, isLoading: projectLoading, uploadFile, deleteFile, updateProject } = useProject(projectId);

  // Validate chat ID
  const isValidId = useMemo(() => chatId ? isConvexId(chatId) : false, [chatId]);

  // Load chat data if we have a valid chat ID
  const chatPageData = useQuery(
    api.getChatPageData.getChatPageData,
    isValidId ? { threadId: chatId as Id<'threads'> } : 'skip'
  );

  // Extract data from aggregated result
  const thread = chatPageData?.thread;
  const messagesResult = chatPageData?.messages;
  const attachments = chatPageData?.attachments;

  const lastMessagesRef = useRef<UIMessage[]>([]);
  const savedLastChatRef = useRef<{ id?: string, path?: string }>({});

  // Process messages
  const messages = useMemo(() => {
    if (!attachments || !messagesResult) return lastMessagesRef.current;

    const attachmentsMap: Record<
      string,
      {
        id: Id<'attachments'>;
        messageId: Id<'messages'> | undefined;
        name: string;
        type: string;
        url: string | null;
      }[]
    > = {};

    attachments.forEach((a) => {
      if (!a.messageId) return;
      if (!attachmentsMap[a.messageId]) {
        attachmentsMap[a.messageId] = [];
      }
      attachmentsMap[a.messageId].push(a);
    });

    const rawMessages: Doc<'messages'>[] = messagesResult ?? []

    const formatted = rawMessages.map(m => ({
      id: m._id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m._creationTime),
      parts: [{ type: 'text' as const, text: m.content }],
      attachments: attachmentsMap[m._id] ?? [],
      model: m.model,
    }))

    lastMessagesRef.current = formatted
    return formatted
  }, [messagesResult, attachments]);

  // Handle navigation
  const handleNavigation = useCallback(() => {
    if (authLoading || projectLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    if (!project) {
      router.replace('/');
      return;
    }
    
    // If no chat ID or invalid ID, stay on new chat
    if (!chatId || !isValidId) {
      return;
    }
    
    if (thread === null) {
      router.replace(`/project/${projectId}/chat`);
      return;
    }
    
    // Save last chat if successful
    if (thread && isValidId) {
      if (savedLastChatRef.current.id !== chatId) {
        saveLastChatId(chatId);
        savedLastChatRef.current.id = chatId;
      }
      const path = `/project/${projectId}/chat/${chatId}`;
      if (savedLastChatRef.current.path !== path) {
        saveLastPath(path);
        savedLastChatRef.current.path = path;
      }
    }
  }, [authLoading, projectLoading, isAuthenticated, project, chatId, isValidId, router, projectId, thread]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  // Mobile redirect handling
  useEffect(() => {
    if (!mounted || !isAuthenticated || !project || (!chatId && !isValidId)) return;

    if (isMobile && !wasMobileRef.current && chatId) {
      if (savedLastChatRef.current.id !== chatId) {
        saveLastChatId(chatId);
        savedLastChatRef.current.id = chatId;
      }
      const path = `/project/${projectId}/chat/${chatId}`;
      if (savedLastChatRef.current.path !== path) {
        saveLastPath(path);
        savedLastChatRef.current.path = path;
      }
      router.replace('/home');
    }

    wasMobileRef.current = isMobile;
  }, [isMobile, mounted, isAuthenticated, project, chatId, isValidId, projectId, router]);

  // Loading state
  const isLoading = useMemo(() =>
    authLoading ||
    projectLoading ||
    !project ||
    (isValidId && (thread === undefined || messagesResult === undefined || attachments === undefined)),
    [authLoading, projectLoading, project, isValidId, thread, messagesResult, attachments]
  );

  useEffect(() => {
    if (!isLoading) {
      setIsInitialLoad(false);
      if (typeof window !== 'undefined' && window.__hideGlobalLoader) {
        window.__hideGlobalLoader();
      }
    }
  }, [isLoading]);

  if (isInitialLoad) {
    return <div className="w-full h-screen bg-background" />;
  }

  if (!project) {
    return <div className="w-full h-screen bg-background" />;
  }

  if (isValidId && thread === null) {
    return <div className="w-full h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Обычный чат без заголовка проекта и панели знаний */}
      <Chat
        key={chatId || `project-${projectId}-new`}
        threadId={chatId || "new"}
        thread={thread}
        initialMessages={messages}
        projectId={projectId}
        project={project}
        // НЕ используем customLayout для обычного отображения чата
      />
    </div>
  )
});

import { Suspense } from 'react';
import PageSkeleton from '@/frontend/components/PageSkeleton';

export default function ProjectChatPage({ 
  params 
}: { 
  params: Promise<{ projectId: string; slug: string[] }> 
}) {
  return (
    <ErrorBoundary fallbackRedirect="/chat">
      <Suspense fallback={<PageSkeleton />}>
        <ProjectChatPageInner params={params} />
      </Suspense>
    </ErrorBoundary>
  );
}