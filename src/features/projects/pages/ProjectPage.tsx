"use client";

import { useParams, useRouter, usePathname } from "next/navigation";
import { useProject } from "../hooks/useProject";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import ProjectHeader from "../components/ProjectHeader";
import ProjectKnowledge from "../components/ProjectKnowledge";
import ProjectPageSkeleton from "../components/ProjectPageSkeleton";
import Chat from "@/frontend/components/Chat";
import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/frontend/components/WithTooltip";
import { Settings, Plus } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import SettingsDrawer from "@/frontend/components/SettingsDrawer";
import { ChatHistoryButton } from "@/frontend/components/chat-history";
import { saveLastPath, saveLastChatId } from "@/frontend/lib/lastChat";


export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params?.projectId as Id<"projects"> | undefined;
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  // Проверяем, находимся ли мы на главной странице проекта (исключая чаты проекта)
  const isProjectHomePage = pathname === `/project/${projectId}`;

  const { project, files, isLoading, updateProject, uploadFile, deleteFile } =
    useProject(projectId);

  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setIsSettingsOpen(open);
  }, []);

  const handleNewChat = useCallback(() => {
    // Если мы внутри проекта, сбрасываем currentChatId и возвращаемся на главную страницу проекта
    if (currentChatId) {
      setCurrentChatId(null);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/project/${projectId}`);
      }
    } else {
      // Если уже на главной странице проекта, остаемся здесь
      // Поле ввода уже показано и готово для нового сообщения
    }
  }, [currentChatId, projectId]);

  const handleBackToHome = useCallback(() => {
    // Сбрасываем currentChatId чтобы вернуться на главную страницу проекта
    setCurrentChatId(null);
    // Обновляем URL только если мы не на главной странице
    if (typeof window !== 'undefined' && pathname !== `/project/${projectId}`) {
      window.history.pushState(null, '', `/project/${projectId}`);
    }
  }, [projectId, pathname]);

  // Обработка навигации браузера (кнопка "назад")
  useEffect(() => {
    const handlePopState = () => {
      // Если URL изменился на главную страницу проекта, сбрасываем currentChatId
      if (window.location.pathname === `/project/${projectId}`) {
        setCurrentChatId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [projectId]);

  const handleThreadCreated = useCallback((threadId: Id<'threads'>) => {
    // Сохраняем информацию о последнем чате и пути
    if (typeof window !== 'undefined') {
      const newUrl = `/project/${projectId}/chat/${threadId}`;
      saveLastPath(newUrl);
      saveLastChatId(threadId);
    }
    
    // НЕ делаем роутинг и НЕ обновляем URL! Просто обновляем состояние чтобы показать чат на главной странице
    setCurrentChatId(threadId);
  }, [projectId]);

  if (isLoading) {
    return <ProjectPageSkeleton />;
  }

  if (!project) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <p className="text-gray-600">
          You may have entered an incorrect URL or you don't have access to this project.
        </p>
      </div>
    );
  }

  return (
    	<>
      <div className="min-h-screen bg-background relative">
        {/* Top-left navigation */}
        <div className="fixed left-4 top-4 z-50 pointer-events-auto">
          <nav className="flex items-center gap-1 text-xl font-bold">
            <a href="/chat" className="text-foreground hover:text-primary transition-colors cursor-pointer hover:underline pointer-events-auto">
              Pak.Chat
            </a>
            <span className="text-muted-foreground">/</span>
            <span 
              className="text-foreground hover:text-primary transition-colors cursor-pointer hover:underline pointer-events-auto"
              onClick={handleBackToHome}
            >
              {project.name}
            </span>
          </nav>
        </div>
        
        {/* Top-right control panel */}
        <div className="fixed right-4 top-4 z-50 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20 pointer-events-auto">
          <WithTooltip label="New Chat" side="bottom">
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm border-border/50 pointer-events-auto"
              onClick={handleNewChat}
              aria-label="Start new chat"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </WithTooltip>
          <ChatHistoryButton className="backdrop-blur-sm pointer-events-auto" projectId={projectId} projectName={project.name} />
          <SettingsDrawer isOpen={isSettingsOpen} setIsOpen={handleSettingsOpenChange}>
            <WithTooltip label="Settings" side="bottom">
              <Button
                variant="outline"
                size="icon"
                className="bg-background/80 backdrop-blur-sm border-border/50 pointer-events-auto"
                aria-label="Open settings"
                onClick={() => handleSettingsOpenChange(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </WithTooltip>
          </SettingsDrawer>
        </div>
        
        {/* Специальный layout для главной страницы проекта */}
        {isProjectHomePage ? (
          // Главная страница проекта с атрибутами
          <div className={currentChatId ? "pt-16 min-h-screen" : "flex pt-16 min-h-screen"}>
            {/* Left side - Project info and chat input */}
            <div className={currentChatId ? "w-full min-h-screen flex flex-col pointer-events-auto" : "flex-1 lg:flex-initial lg:w-[calc(100%-500px)] p-8 pr-4 flex flex-col pointer-events-auto"}>
              <div className={currentChatId ? "w-full flex flex-col h-full pointer-events-auto" : "w-full flex flex-col h-full pointer-events-auto"}>
                {/* Project header - верхняя часть (если нет активного чата) */}
                {!currentChatId && (
                  <div className="mb-4 flex-shrink-0">
                    <ProjectHeader
                      project={project}
                      onUpdate={(updates) => updateProject(updates)}
                    />
                  </div>
                )}
                
                {/* Chat component - full height */}
                <div className="flex-1 flex flex-col">
                  <div className={currentChatId ? "flex-1 w-full" : "flex-1 flex items-start justify-start"}>
                    <div className={currentChatId ? "w-full h-full" : "w-full [&_.fixed.left-1\/2]:left-[20%]"}>
                      <Chat
                           key={`project-home-${projectId}-${currentChatId || 'new'}`} // Уникальный ключ для каждого состояния
                           threadId={currentChatId || "new"}
                           thread={null}
                           initialMessages={[]}
                           projectId={projectId}
                           project={project}
                           customLayout={false} // Используем стандартный layout как на обычной странице
                           projectLayout={!currentChatId} // Добавляем флаг для особого позиционирования на странице проекта
                           onThreadCreated={handleThreadCreated}
                         />
                      </div>
                    </div>
                  </div>
              </div>
            </div>
            
            {/* Right side - Project Knowledge panel (только если нет активного чата) */}
            {!currentChatId && (
              <div className="hidden lg:block w-[500px] p-8 pl-4 pointer-events-auto">
                <div className="h-[calc(100vh-8rem)] overflow-y-auto pointer-events-auto">
                  <ProjectKnowledge
                    files={files || []}
                    project={project}
                    onUpload={uploadFile}
                    onDelete={deleteFile}
                    onUpdateProject={updateProject}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          // Обычный чат для других страниц проекта
          <Chat
            key={`project-other-${projectId}`}
            threadId="new"
            thread={null}
            initialMessages={[]}
            projectId={projectId}
            project={project}
            onThreadCreated={handleThreadCreated}
          />
        )}
      </div>
    </>
  );
}
