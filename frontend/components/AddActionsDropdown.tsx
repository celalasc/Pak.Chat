"use client";

import { useState, useRef } from 'react';
import { Plus, FileIcon, Clock, Brush } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAttachmentsStore } from '../stores/AttachmentsStore';
import DrawingCanvas from './DrawingCanvas';
import RecentFilesDropdown from './RecentFilesDropdown';

interface AddActionsDropdownProps {
  className?: string;
  messageCount?: number;
}

export default function AddActionsDropdown({ className, messageCount = 0 }: AddActionsDropdownProps) {
  const { add } = useAttachmentsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(add);
    e.target.value = '';
  };

  const handleDrawingSave = (imageData: string) => {
    // Конвертируем data URL в File объект
    fetch(imageData)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
        add(file);
      });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`flex items-center justify-center w-8 h-8 rounded-lg border border-border/30 hover:border-border/60 bg-accent hover:bg-accent/80 flex-shrink-0 transition-colors ${className || ''}`}
            aria-label="Add content"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 p-1">
          <DropdownMenuItem onClick={handleFileClick} className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            Add file
          </DropdownMenuItem>
          
          <div className="relative">
            <RecentFilesDropdown messageCount={messageCount}>
              <DropdownMenuItem className="flex items-center gap-2 justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent
                </div>
              </DropdownMenuItem>
            </RecentFilesDropdown>
          </div>
          
          <DropdownMenuItem 
            onClick={() => setIsDrawingOpen(true)} 
            className="flex items-center gap-2"
          >
            <Brush className="w-4 h-4" />
            Draw
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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