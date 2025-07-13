"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/frontend/components/ui/dialog';

import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft,
  Save,
  X,
  ArrowUpDown,
  Maximize2,
  PenTool,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useCreateCustomMode, 
  useUpdateCustomMode, 
  useDeleteCustomMode, 
  CustomMode 
} from '@/frontend/stores/CustomModesStore';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';

interface CustomModesManagementProps {
  view: 'create' | 'edit';
  editingMode?: any;
  onBack: () => void;
  onModeCreated?: () => void;
  onModeUpdated?: () => void;
}

interface ModeFormData {
  name: string;
  systemPrompt: string;
  icon: string;
}

import { 
  User, 
  Bot, 
  MessageSquare, 
  Code, 
  FileText, 
  Settings, 
  Zap, 
  Brain, 
  Target, 
  Search, 
  Star, 
  Sparkles,
  Palette,
  Camera,
  Music,
  Globe
} from 'lucide-react';

const DEFAULT_ICONS = [
  { icon: 'Bot', label: 'Bot', component: Bot },
  { icon: 'User', label: 'User', component: User },
  { icon: 'MessageSquare', label: 'Chat', component: MessageSquare },
  { icon: 'Code', label: 'Code', component: Code },
  { icon: 'FileText', label: 'Document', component: FileText },
  { icon: 'Settings', label: 'Settings', component: Settings },
  { icon: 'Zap', label: 'Lightning', component: Zap },
  { icon: 'Brain', label: 'Brain', component: Brain },
  { icon: 'Target', label: 'Target', component: Target },
  { icon: 'Search', label: 'Search', component: Search },
  { icon: 'Star', label: 'Star', component: Star },
  { icon: 'Sparkles', label: 'Sparkles', component: Sparkles },
  { icon: 'Palette', label: 'Creative', component: Palette },
  { icon: 'Camera', label: 'Visual', component: Camera },
  { icon: 'Music', label: 'Audio', component: Music },
  { icon: 'Globe', label: 'Global', component: Globe }
];

const CustomModesManagement = memo(({ view, editingMode, onBack, onModeCreated, onModeUpdated }: CustomModesManagementProps) => {
  const createMode = useCreateCustomMode();
  const updateMode = useUpdateCustomMode();
  const deleteMode = useDeleteCustomMode();
  
  const [formData, setFormData] = useState<ModeFormData>({
    name: '',
    systemPrompt: '',
    icon: 'Bot'
  });
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);

  // Initialize form data when editing mode changes
  useEffect(() => {
    if (view === 'edit' && editingMode) {
      setFormData({
        name: editingMode.name,
        systemPrompt: editingMode.systemPrompt,
        icon: editingMode.icon
      });
    } else if (view === 'create') {
      setFormData({
        name: '',
        systemPrompt: '',
        icon: 'Bot'
      });
    }
  }, [view, editingMode]);

  const handleDeleteMode = useCallback(async (modeId: string) => {
    try {
      await deleteMode({ id: modeId as any });
      toast.success('Custom mode deleted');
      onBack();
    } catch (error) {
      toast.error('Failed to delete custom mode');
    }
  }, [deleteMode, onBack]);

  const handleSaveMode = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('Mode name is required');
      return;
    }

    if (!formData.systemPrompt.trim()) {
      toast.error('Custom instructions are required');
      return;
    }

    try {
      if (view === 'create') {
        await createMode({
          name: formData.name.trim(),
          systemPrompt: formData.systemPrompt.trim(),
          icon: formData.icon
        });
        toast.success('Custom mode created');
        onModeCreated?.();
      } else if (view === 'edit' && editingMode) {
        await updateMode({
          id: editingMode._id,
          name: formData.name.trim(),
          systemPrompt: formData.systemPrompt.trim(),
          icon: formData.icon
        });
        toast.success('Custom mode updated');
        onModeUpdated?.();
      }
    } catch (error) {
      toast.error(view === 'create' ? 'Failed to create custom mode' : 'Failed to update custom mode');
    }
  }, [formData, view, editingMode, createMode, updateMode, onModeCreated, onModeUpdated]);

  const handleFormChange = useCallback((field: keyof ModeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const selectedIconComponent = DEFAULT_ICONS.find(i => i.icon === formData.icon)?.component || Bot;

  const handleIconSelect = useCallback((iconName: string) => {
    handleFormChange('icon', iconName);
    setIsIconDropdownOpen(false);
  }, [handleFormChange]);

  // Handle keyboard shortcuts for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPromptModalOpen) {
        if (event.key === 'Escape') {
          setIsPromptModalOpen(false);
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          setIsPromptModalOpen(false);
        }
      }
    };

    if (isPromptModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isPromptModalOpen]);

  return (
    <>
      <div className="pt-4 sm:pt-6 pb-4 pl-2 pr-4 w-full sm:w-64 relative flex flex-col h-full overflow-hidden">
        {/* Header with back button and actions */}
        <div className="flex items-center justify-center mb-4 sm:mb-6 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-8 w-8 hover:bg-accent absolute left-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 absolute right-0">
            {/* Done Button */}
            <Button 
              onClick={handleSaveMode}
              disabled={!formData.name.trim() || !formData.systemPrompt.trim()}
              size="sm"
              variant="outline"
              className="text-teal-500 border-teal-500 hover:text-teal-500 hover:border-teal-500 h-8 px-3 text-sm"
            >
              Done
            </Button>
            
            {/* Delete Button (only for edit) */}
            {view === 'edit' && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => editingMode && handleDeleteMode(editingMode._id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Icon and Name Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 sm:mb-6 justify-center">
          {/* Icon Selector with Dropdown */}
          <div className="relative">
            <DropdownMenu open={isIconDropdownOpen} onOpenChange={setIsIconDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 sm:h-7 sm:w-7 flex-shrink-0 hover:bg-accent"
                >
                  {React.createElement(selectedIconComponent, { className: "h-5 w-5 sm:h-3.5 sm:w-3.5" })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="center" 
                side="bottom"
                className="w-64 sm:w-40 bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-xl rounded-2xl"
                sideOffset={8}
              >
                <div className="grid grid-cols-4 gap-1 p-3">
                  {DEFAULT_ICONS.map(({ icon, label, component: IconComponent }) => (
                    <DropdownMenuItem
                      key={icon}
                      onClick={() => handleIconSelect(icon)}
                      className={cn(
                        "flex items-center justify-center p-2 h-10 w-10 sm:h-7 sm:w-7 cursor-pointer hover:bg-white/15 dark:hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105 border-0",
                        formData.icon === icon && "bg-white/25 dark:bg-white/15 shadow-md ring-1 ring-white/30"
                      )}
                    >
                      <IconComponent className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Name Input */}
          <Input
            placeholder="Enter a name"
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            maxLength={50}
            className="w-full sm:flex-1 bg-muted/30 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base sm:text-sm h-10"
          />
        </div>

        {/* System Prompt */}
        <div className="flex-1 flex flex-col relative min-h-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Instructions</span>
            <Button
              onClick={() => setIsPromptModalOpen(true)}
              className="p-1 text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all duration-200 rounded-md"
              variant="ghost"
              size="sm"
              aria-label="Открыть расширенный редактор подсказки"
            >
              <Maximize2 className="w-4 h-4 sm:w-3 sm:h-3" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Textarea
              placeholder="Add custom instructions"
              value={formData.systemPrompt}
              onChange={(e) => handleFormChange('systemPrompt', e.target.value)}
              maxLength={2000}
              className="w-full h-full resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base sm:text-sm whitespace-pre-wrap break-words overflow-y-auto rounded-lg"
              style={{ 
                wordWrap: 'break-word', 
                overflowWrap: 'break-word', 
                minHeight: '120px', 
                maxHeight: window.innerWidth < 640 ? '200px' : '180px'
              }}
            />
          </div>
        </div>
      </div>
      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[95vw] sm:w-[50vw] sm:max-w-none max-w-[520px] h-[80vh] sm:h-[65vh] flex flex-col p-0 bg-[rgba(217,217,217,0.03)] backdrop-blur-[70px] border-[0.3px] border-[rgba(103,103,103,1)] shadow-[0_0_4px_0_rgba(255,255,255,0.15)] rounded-[20px] sm:rounded-[35px] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6">
            <DialogTitle className="font-semibold text-white/90 text-xl sm:text-2xl">Custom Instructions</DialogTitle>
            <Button
              onClick={() => setIsPromptModalOpen(false)}
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8 p-0 shrink-0 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 h-full flex flex-col">
            <div className="w-full h-full flex flex-col">
              <Textarea
                value={formData.systemPrompt}
                onChange={(e) => handleFormChange('systemPrompt', e.target.value)}
                maxLength={4000}
                className="w-full h-full resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base sm:text-base text-white/90 placeholder:text-white/50 whitespace-pre-wrap break-words overflow-y-auto p-0 min-h-[200px] focus:bg-transparent hover:bg-transparent"
                placeholder="Imagine you are a UX designer. Suggest a simple and intuitive mobile app interface for food delivery."
                style={{ wordWrap: 'break-word', overflowWrap: 'break-word', backgroundColor: 'transparent', fontSize: window.innerWidth < 640 ? '16px' : '14px' }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

CustomModesManagement.displayName = 'CustomModesManagement';

export default CustomModesManagement;
