"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { ArrowLeft, Plus, Upload, FileText, Edit3, X, File, Eye, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/frontend/components/ui/dialog';
import { Textarea } from '@/frontend/components/ui/textarea';
import { WithTooltip } from '@/frontend/components/WithTooltip';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import Chat from '@/frontend/components/Chat';

import { Id } from '@/convex/_generated/dataModel';

import { useState, useCallback, useRef } from 'react';
import NewChatButton from '@/frontend/components/NewChatButton';
import ChatHistoryButton from '@/frontend/components/chat-history/components/ChatHistoryButton';
import SettingsDrawer from '@/frontend/components/SettingsDrawer';
import { Settings } from 'lucide-react';

interface AttachedFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
}

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMobile } = useIsMobile();
  const [isPageLoading, setIsPageLoading] = useState(true);
  
  const projectId = params.projectId as string;
  const projectName = searchParams.get('name') || 'Untitled Project';
  
  // Chat state
  const [sessionThreadId, setSessionThreadId] = useState<string | null>(null);

  
  
  // Handle thread creation for project
  const handleThreadCreated = useCallback(async (newThreadId: Id<'threads'>) => {
    setSessionThreadId(newThreadId);
    // Optionally update URL or perform other actions
  }, []);

  // Settings drawer state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Add knowledge popup state
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Project instructions state
  const [projectInstructions, setProjectInstructions] = useState<string>('');
  const [isInstructionsDialogOpen, setIsInstructionsDialogOpen] = useState(false);
  
  // Attached files state
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [viewingFile, setViewingFile] = useState<AttachedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsAddKnowledgeOpen(false);
      }
    };

    if (isAddKnowledgeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddKnowledgeOpen]);
  
  // Remove loading state after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setIsSettingsOpen(open);
  }, []);
  
  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleGoBack = () => {
    const targetPath = isMobile ? '/home' : '/chat';
    // Use replace for faster navigation without adding to history
    router.replace(targetPath);
  };

  const handleTitleClick = () => {
    const targetPath = isMobile ? '/home' : '/chat';
    // Use replace for faster navigation without adding to history
    router.replace(targetPath);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // Only allow text files
      if (!file.type.startsWith('text/') && !file.name.endsWith('.txt') && !file.name.endsWith('.md') && !file.name.endsWith('.json')) {
        alert('Only text files are allowed');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newFile: AttachedFile = {
          id: Date.now().toString() + Math.random().toString(),
          name: file.name,
          content: content,
          size: file.size,
          type: file.type || 'text/plain'
        };
        setAttachedFiles(prev => [...prev, newFile]);
      };
      reader.readAsText(file);
    });

    // Reset input value
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
    if (viewingFile && viewingFile.id === fileId) {
      setViewingFile(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show skeleton loader while page is loading
  if (isPageLoading) {
    return (
      <div className="relative min-h-screen bg-background animate-pulse">
        <div className="fixed left-4 top-4 z-50">
          <div className="h-9 w-9 bg-muted rounded-full" />
        </div>
        <div className="fixed right-4 top-4 z-50 flex gap-2">
          <div className="h-10 w-10 bg-muted rounded" />
          <div className="h-10 w-10 bg-muted rounded" />
          <div className="h-10 w-10 bg-muted rounded" />
        </div>
        <div className="min-h-screen flex flex-col justify-center items-start p-8">
          <div className="w-full max-w-2xl space-y-6" style={{marginLeft: '50px'}}>
            <div className="h-9 w-64 bg-muted rounded" />
            <div className="h-14 w-full bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      {isMobile ? (
        <div className="fixed left-4 top-4 z-50">
          <WithTooltip label="Back to Home" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/60 backdrop-blur-xl border border-border/20 rounded-full h-9 w-9 shadow-lg touch-target"
              onClick={handleGoBack}
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </WithTooltip>
        </div>
      ) : (
        <div className="fixed left-4 top-4 z-50">
          <div
            className="text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
            onClick={handleTitleClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTitleClick();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <span className="hover:underline">Pak.Chat</span>
            <span className="text-muted-foreground">/</span>
            <span className="truncate max-w-xs">{projectName}</span>
          </div>
        </div>
      )}

      {/* Top-right control panel */}
      <div className="fixed right-4 top-4 z-50 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20">
        <NewChatButton className="backdrop-blur-sm" />
        <ChatHistoryButton className="backdrop-blur-sm" projectId={projectId} projectName={projectName} />
        <SettingsDrawer isOpen={isSettingsOpen} setIsOpen={handleSettingsOpenChange}>
          <WithTooltip label="Settings" side="bottom">
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm border-border/50"
              aria-label="Open settings"
              onClick={handleOpenSettings}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </WithTooltip>
        </SettingsDrawer>
      </div>

      {/* Project knowledge panel */}
      <div
        className="fixed z-40" 
        style={{
          right: '32px',
          bottom: '120px'
        }}
      >
        <div className="bg-background/60 backdrop-blur-md border border-input rounded-xl shadow-xs p-6 hover:bg-background/70 transition-all duration-200 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none">
          <div 
            style={{
              width: '400px',
              height: '464px'
            }}
            className="bg-transparent rounded-md p-2 flex flex-col space-y-4 relative">
            {/* Header with title and plus button */}
            <div className="flex items-center justify-between px-0">
              <h3 className="text-lg font-semibold text-foreground">Project knowledge</h3>
              <WithTooltip label="Add knowledge" side="bottom">
                <Button
                  ref={buttonRef}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border border-input hover:border-ring hover:bg-accent transition-all duration-200"
                  aria-label="Add knowledge"
                  onClick={() => setIsAddKnowledgeOpen(!isAddKnowledgeOpen)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </WithTooltip>
            </div>
            
            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              {attachedFiles.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-24 h-24 bg-primary/10 border-2 border-primary/20 rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary/20 rounded-full"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Knowledge base for your project
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Instructions Tile */}
      <div 
        className="fixed z-40" 
        style={{
          right: '32px',
          top: '80px'
        }}
      >
        <div 
          className="bg-background/60 backdrop-blur-md border border-input rounded-xl shadow-xs hover:bg-background/70 transition-all duration-200 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none cursor-pointer"
          style={{
            width: '400px',
            height: '50px'
          }}
          onClick={() => setIsInstructionsDialogOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsInstructionsDialogOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="h-full flex items-center justify-between px-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {!projectInstructions && (
                <span className="text-sm font-medium text-foreground">
                  Set project instructions
                </span>
              )}
              {projectInstructions && (
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {projectInstructions.slice(0, 60)}...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {projectInstructions ? 'Edit' : 'Optional'}
              </span>
              <Edit3 className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>


      {/* Attached Files Area - show all files the same way */}
      {attachedFiles.length > 0 && (
        <div 
          className="fixed z-40" 
          style={{
            right: '32px',
            top: '150px',
            width: '400px',
            maxHeight: '340px'
          }}
        >
          <div 
            className="overflow-y-auto scrollbar-hide pr-2" 
            style={{
              maxHeight: '340px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              {attachedFiles.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="bg-accent/50 border border-border rounded-lg p-3 hover:bg-accent/70 transition-colors cursor-pointer h-[110px] flex flex-col">
                  {/* File header with icon and name */}
                  <div className="flex items-start gap-2 mb-3">
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Content preview - always visible */}
                  <div className="text-xs text-muted-foreground flex-1 mb-3 leading-relaxed overflow-hidden">
                    <div className="line-clamp-3">
                      {file.content.slice(0, 120)}{file.content.length > 120 ? '...' : ''}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-1 justify-end mt-auto">
                    <WithTooltip label="View full content" side="bottom">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-background/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingFile(file);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </WithTooltip>
                    <WithTooltip label="Delete file" side="bottom">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </WithTooltip>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="min-h-screen flex flex-col justify-center items-start p-8">
        <div className="w-full max-w-2xl space-y-6" style={{marginLeft: '50px'}}>
          <div className="text-left">
            <h1 className="text-3xl font-bold mb-2">
              {projectName}
            </h1>
          </div>
          
          <div className="w-full">
            <Chat
              threadId={sessionThreadId || 'new'}
              thread={null}
              initialMessages={[]}
              projectId={projectId as Id<'projects'>}
              customLayout={true}
              onThreadCreated={handleThreadCreated}
            />
          </div>
          
          
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,text/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Add Knowledge Dropdown */}
      {isAddKnowledgeOpen && (
        <div 
          className="fixed z-50"
          style={{
            right: '32px',
            bottom: '520px'
          }}
        >
          <div ref={dropdownRef} className="bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-xl rounded-2xl p-3 w-48">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 hover:bg-accent transition-all duration-200"
                onClick={() => {
                  fileInputRef.current?.click();
                  setIsAddKnowledgeOpen(false);
                }}
              >
                <Upload className="h-4 w-4" />
                Add from device
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 hover:bg-accent transition-all duration-200"
                onClick={() => {
                  // Handle add text content
                  setIsAddKnowledgeOpen(false);
                }}
              >
                <FileText className="h-4 w-4" />
                Add text content
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project Instructions Dialog */}
      <Dialog open={isInstructionsDialogOpen} onOpenChange={setIsInstructionsDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[95vw] sm:w-[50vw] sm:max-w-none max-w-[520px] h-[80vh] sm:h-[65vh] flex flex-col p-0 bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-xl rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6">
            <DialogTitle className="font-semibold text-white/90 text-xl sm:text-2xl">Project Instructions</DialogTitle>
            <Button
              onClick={() => setIsInstructionsDialogOpen(false)}
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8 p-0 shrink-0 text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 h-full flex flex-col">
            <div className="w-full h-full flex flex-col">
              <Textarea
                value={projectInstructions}
                onChange={(e) => setProjectInstructions(e.target.value)}
                maxLength={4000}
                className="w-full h-full resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base sm:text-base text-white/90 placeholder:text-white/50 whitespace-pre-wrap break-words overflow-y-auto p-0 min-h-[200px] focus:bg-transparent hover:bg-transparent"
                placeholder="Enter custom instructions for this project..."
                style={{ wordWrap: 'break-word', overflowWrap: 'break-word', backgroundColor: 'transparent' }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Content Viewer Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
        <DialogContent
          showCloseButton={false}
          className="w-[95vw] sm:w-[80vw] sm:max-w-none max-w-[800px] h-[80vh] sm:h-[70vh] flex flex-col p-0 bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-xl rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <File className="h-5 w-5 text-white/70 shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="font-semibold text-white/90 text-lg sm:text-xl truncate">
                  {viewingFile?.name}
                </DialogTitle>
                <p className="text-sm text-white/60">
                  {viewingFile && formatFileSize(viewingFile.size)}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setViewingFile(null)}
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8 p-0 shrink-0 text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-4 h-full flex flex-col overflow-hidden">
            <div className="w-full h-full bg-background/20 backdrop-blur-sm rounded-lg border border-white/10 p-4 overflow-hidden">
              <div className="w-full h-full overflow-y-auto">
                <pre className="text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed font-mono">
                  {viewingFile?.content}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
