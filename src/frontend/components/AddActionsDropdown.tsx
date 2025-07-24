"use client";

import { useState, useRef, useCallback } from 'react';
import { Plus, FileIcon, Clock, Brush, Sparkles, FolderOpen, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAttachmentsStore } from '../stores/AttachmentsStore';
import { useChatStore } from '../stores/ChatStore';
import DrawingCanvas from './DrawingCanvas';
import RecentFilesDropdown from './RecentFilesDropdown';
import ProjectsDropdown from './ProjectsDropdown';
import MobileAddActionsDrawer from './mobile/MobileAddActionsDrawer';
import { toast } from 'sonner';
import { convertToSupportedImage } from '../lib/fileHelpers';
import { useIsMobile } from '../hooks/useIsMobile';

interface AddActionsDropdownProps {
  className?: string;
  messageCount?: number;
}

export default function AddActionsDropdown({ className, messageCount = 0 }: AddActionsDropdownProps) {
  const { add } = useAttachmentsStore();
  const { isImageGenerationMode, setImageGenerationMode } = useChatStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useIsMobile();

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const processed = await convertToSupportedImage(file);
      add(processed);
    }
    e.target.value = '';
  };

  const handleDrawingSave = (imageData: string) => {
    try {
      // Конвертируем data URL в File объект более надежным способом
      const byteString = atob(imageData.split(',')[1]);
      const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
      add(file);
      toast.success('Drawing saved and attached!');
    } catch (error) {
      console.error('Failed to save drawing:', error);
      // Fallback to fetch method
      fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
          add(file);
          toast.success('Drawing saved and attached!');
        })
        .catch(err => {
          console.error('Fallback method also failed:', err);
          toast.error('Failed to save drawing');
        });
    }
  };

  const handleImageGenerationToggle = useCallback(() => {
    setImageGenerationMode(!isImageGenerationMode);
  }, [isImageGenerationMode, setImageGenerationMode]);

  const handleDrawingOpen = useCallback(() => {
    setIsDrawingOpen(true);
  }, []);


  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className={`flex items-center justify-center w-8 h-8 rounded-lg border border-border/30 hover:border-border/60 bg-transparent hover:bg-accent/50 flex-shrink-0 transition-colors ${className || ''}`}
      aria-label="Add content"
    >
      <Plus className="w-4 h-4" />
    </Button>
  );

  return (
    <>
      {isMobile ? (
        // Мобильная версия с отдельным компонентом
        <MobileAddActionsDrawer
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          onFileClick={handleFileClick}
          onDrawingClick={handleDrawingOpen}
          onImageGenerationToggle={handleImageGenerationToggle}
          isImageGenerationMode={isImageGenerationMode}
          messageCount={messageCount}
        >
          {triggerButton}
        </MobileAddActionsDrawer>
      ) : (
        // Десктопная версия с DropdownMenu
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            {triggerButton}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 p-1">
            <DropdownMenuItem onClick={handleFileClick} className="flex items-center gap-2">
              <FileIcon className="w-4 h-4" />
              Add file
            </DropdownMenuItem>
            
            <div className="relative">
              <RecentFilesDropdown messageCount={messageCount}>
                <DropdownMenuItem
                  onSelect={e => e.preventDefault()}
                  className="flex items-center gap-2 justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent
                  </div>
                </DropdownMenuItem>
              </RecentFilesDropdown>
            </div>
            
            <div className="relative">
              <ProjectsDropdown>
                <DropdownMenuItem
                  onSelect={e => e.preventDefault()}
                  className="flex items-center gap-2 justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Projects
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </DropdownMenuItem>
              </ProjectsDropdown>
            </div>
            
            <DropdownMenuItem onClick={handleDrawingOpen} className="flex items-center gap-2">
              <Brush className="w-4 h-4" />
              Draw
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={handleImageGenerationToggle}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isImageGenerationMode ? 'Exit Image Mode' : 'Generate Image'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept="image/*,application/pdf,text/*"
        onChange={handleFileChange}
      />

      <DrawingCanvas
        isOpen={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
        onSave={handleDrawingSave}
      />
    </>
  );
} 