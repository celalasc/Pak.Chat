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
import { useState, useCallback } from "react";
import SettingsDrawer from "@/frontend/components/SettingsDrawer";
import { ChatHistoryButton } from "@/frontend/components/chat-history";
import { saveLastPath, saveLastChatId } from "@/frontend/lib/lastChat";


export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params?.projectId as Id<"projects"> | undefined;
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Проверяем, находимся ли мы на главной странице проекта (исключая чаты проекта)
  const isProjectHomePage = pathname === `/project/${projectId}`;

  const { project, files, isLoading, updateProject, uploadFile, deleteFile } =
    useProject(projectId);



  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setIsSettingsOpen(open);
  }, []);

  const handleNewChat = useCallback(() => {
    // Navigate to project chat page
    router.push(`/project/${projectId}/chat`);
  }, [router, projectId]);

  const handleBackToHome = useCallback(() => {
    // Сбрасываем currentChatId чтобы вернуться на главную страницу проекта
    setCurrentChatId(null);
    // Обновляем URL
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/project/${projectId}`);
    }
  }, [projectId]);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const handleThreadCreated = useCallback((threadId: Id<'threads'>) => {
    // Сохраняем информацию о последнем чате и пути
    if (typeof window !== 'undefined') {
      const newUrl = `/project/${projectId}/chat/${threadId}`;
      saveLastPath(newUrl);
      saveLastChatId(threadId);
    }
    
    // НЕ делаем роутинг! Просто обновляем состояние чтобы показать чат здесь же
    setCurrentChatId(threadId);
    
    // Обновляем URL без перезагрузки страницы
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/project/${projectId}/chat/${threadId}`);
    }
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
    <div className="min-h-screen bg-background">
      {/* Top-left navigation */}
      <div className="fixed left-4 top-4 z-50">
        <nav className="flex items-center gap-1 text-xl font-bold">
          <a href="/chat" className="text-foreground hover:text-primary transition-colors cursor-pointer hover:underline">
            Pak.Chat
          </a>
          <span className="text-muted-foreground">/</span>
          <span 
            className="text-foreground hover:text-primary transition-colors cursor-pointer hover:underline"
            onClick={handleBackToHome}
          >
            {project.name}
          </span>
        </nav>
      </div>
      
      {/* Top-right control panel */}
      <div className="fixed right-4 top-4 z-50 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20">
        <WithTooltip label="New Chat" side="bottom">
          <Button
            variant="outline"
            size="icon"
            className="bg-background/80 backdrop-blur-sm border-border/50"
            onClick={handleNewChat}
            aria-label="Start new chat"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </WithTooltip>
        <ChatHistoryButton className="backdrop-blur-sm" projectId={projectId} projectName={project.name} />
        <SettingsDrawer isOpen={isSettingsOpen} setIsOpen={handleSettingsOpenChange}>
          <WithTooltip label="Settings" side="bottom">
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm border-border/50"
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
        currentChatId ? (
          // Когда есть активный чат - показываем только чат без атрибутов проекта
          <div className="min-h-screen bg-background">
            <Chat
              key={`project-home-${projectId}`} // ТОТ ЖЕ key что и на главной странице!
              threadId={currentChatId}
              thread={null}
              initialMessages={[]}
              projectId={projectId}
              project={project}
              // НЕ используем customLayout для обычного отображения чата
            />
          </div>
        ) : (
          // Главная страница проекта с атрибутами
          <div className="flex pt-16 min-h-screen">
            {/* Left side - Project info and chat input */}
            <div className="flex-1 p-8 pr-4 flex flex-col">
              <div className="max-w-4xl w-full flex flex-col h-full">
                {/* Project header - в верхней части */}
                <div className="mb-4 flex-shrink-0">
                  <ProjectHeader
                    project={project}
                    onUpdate={(updates) => updateProject(updates)}
                  />
                </div>
                
                {/* Chat component - full height */}
                <div className="flex-1 flex flex-col">
                  {/* Всегда показываем пустой чат на главной странице проекта */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-4xl">
                      <Chat
                         key={`project-home-${projectId}`}
                         threadId="new"
                         thread={null}
                         initialMessages={[]}
                         projectId={projectId}
                         project={project}
                         customLayout={true}
                         onThreadCreated={handleThreadCreated}
                       />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Project Knowledge panel */}
            <div className="hidden lg:block w-[500px] p-8 pl-4">
              <div className="h-[calc(100vh-8rem)] overflow-y-auto">
                <ProjectKnowledge
                  files={files || []}
                  project={project}
                  onUpload={uploadFile}
                  onDelete={deleteFile}
                  onUpdateProject={updateProject}
                />
              </div>
            </div>
          </div>
        )
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
  );
}