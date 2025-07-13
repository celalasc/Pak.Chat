"use client";

import { useState, useCallback, memo } from 'react';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/frontend/components/ui/dialog';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Badge } from '@/frontend/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Bot, 
  Sparkles,
  MessageSquare,
  ChevronLeft,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useCustomModes, 
  useCreateCustomMode, 
  useUpdateCustomMode, 
  useDeleteCustomMode, 
  CustomMode 
} from '@/frontend/stores/CustomModesStore';
import { toast } from 'sonner';

interface CustomModesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ModeFormData {
  name: string;
  systemPrompt: string;
  icon: string;
}

const DEFAULT_ICONS = [
  { icon: '🤖', label: 'Robot' },
  { icon: '✨', label: 'Sparkles' },
  { icon: '💬', label: 'Chat' },
  { icon: '🎯', label: 'Target' },
  { icon: '⚡', label: 'Lightning' },
  { icon: '🧠', label: 'Brain' },
  { icon: '🎨', label: 'Art' },
  { icon: '📝', label: 'Writing' },
  { icon: '🔍', label: 'Search' },
  { icon: '⭐', label: 'Star' },
  { icon: '🚀', label: 'Rocket' },
  { icon: '💡', label: 'Idea' },
];

const CustomModesDialog = memo(({ isOpen, onOpenChange }: CustomModesDialogProps) => {
  const modes = useCustomModes() || [];
  const createMode = useCreateCustomMode();
  const updateMode = useUpdateCustomMode();
  const deleteMode = useDeleteCustomMode();
  
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingMode, setEditingMode] = useState<CustomMode | null>(null);
  const [formData, setFormData] = useState<ModeFormData>({
    name: '',
    systemPrompt: '',
    icon: '🤖'
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      systemPrompt: '',
      icon: '🤖'
    });
  }, []);

  const handleCreateMode = useCallback(() => {
    setView('create');
    resetForm();
  }, [resetForm]);

  const handleEditMode = useCallback((mode: CustomMode) => {
    setEditingMode(mode);
    setFormData({
      name: mode.name,
      systemPrompt: mode.systemPrompt,
      icon: mode.icon
    });
    setView('edit');
  }, []);

  const handleDeleteMode = useCallback(async (modeId: string) => {
    try {
      await deleteMode({ id: modeId as any });
      toast.success('Custom mode deleted');
    } catch (error) {
      toast.error('Failed to delete custom mode');
    }
  }, [deleteMode]);

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
      } else if (view === 'edit' && editingMode) {
        await updateMode({
          id: editingMode._id,
          name: formData.name.trim(),
          systemPrompt: formData.systemPrompt.trim(),
          icon: formData.icon
        });
        toast.success('Custom mode updated');
      }

      setView('list');
      resetForm();
      setEditingMode(null);
    } catch (error) {
      toast.error(view === 'create' ? 'Failed to create custom mode' : 'Failed to update custom mode');
    }
  }, [formData, view, editingMode, createMode, updateMode, resetForm]);

  const handleCancel = useCallback(() => {
    setView('list');
    resetForm();
    setEditingMode(null);
  }, [resetForm]);

  const handleFormChange = useCallback((field: keyof ModeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] sm:w-[600px] h-[95vh] sm:h-[700px] flex flex-col p-0 no-slider max-w-none">
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-0">
          <div className="flex items-center gap-3">
            {view !== 'list' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Bot className="h-5 w-5" />
                {view === 'list' ? 'Custom Modes' : view === 'create' ? 'Create Mode' : 'Edit Mode'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {view === 'list' 
                  ? 'Manage your custom AI modes with personalized prompts and icons'
                  : 'Configure your custom mode settings'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {view === 'list' ? (
            <ModesListView 
              modes={modes}
              onCreateMode={handleCreateMode}
              onEditMode={handleEditMode}
              onDeleteMode={handleDeleteMode}
            />
          ) : (
            <ModeFormView 
              formData={formData}
              onChange={handleFormChange}
              onSave={handleSaveMode}
              onCancel={handleCancel}
              isEditing={view === 'edit'}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

interface ModesListViewProps {
  modes: CustomMode[];
  onCreateMode: () => void;
  onEditMode: (mode: CustomMode) => void;
  onDeleteMode: (modeId: string) => void;
}

const ModesListView = memo(({ 
  modes, 
  onCreateMode, 
  onEditMode, 
  onDeleteMode 
}: ModesListViewProps) => {
  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Default Mode Card */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Default
            <Badge variant="secondary" className="text-xs">Built-in</Badge>
          </CardTitle>
          <CardDescription className="text-sm">
            Standard AI assistant mode with balanced capabilities
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Custom Modes */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {modes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No custom modes yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Create your first custom mode to personalize AI interactions with specific prompts and behaviors.
            </p>
            <Button onClick={onCreateMode} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Custom Mode
            </Button>
          </div>
        ) : (
          <>
            {modes.map((mode) => (
              <ModeCard 
                key={mode._id}
                mode={mode}
                onEdit={onEditMode}
                onDelete={onDeleteMode}
              />
            ))}
            <div className="pt-4">
              <Button 
                onClick={onCreateMode} 
                variant="outline" 
                className="w-full flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Custom Mode
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

interface ModeCardProps {
  mode: CustomMode;
  onEdit: (mode: CustomMode) => void;
  onDelete: (modeId: string) => void;
}

const ModeCard = memo(({ mode, onEdit, onDelete }: ModeCardProps) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const { isMobile } = useIsMobile();

  const clearLongPress = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setTouchStartPos(null);
    setIsPressed(false);
  }, [longPressTimer]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsPressed(true);

    const timer = setTimeout(() => {
      setShowContextMenu(true);
      navigator.vibrate?.(50); // Haptic feedback if available
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos || !longPressTimer) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);

    if (deltaX > 10 || deltaY > 10) {
      clearLongPress();
    }
  }, [touchStartPos, longPressTimer, clearLongPress]);

  const handleTouchEnd = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleTouchCancel = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.pointerType === 'touch' || !isMobile) return;

    const timer = setTimeout(() => {
      setShowContextMenu(true);
    }, 500);
    setLongPressTimer(timer);
  }, [isMobile]);

  const handleMouseUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleMouseLeave = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  return (
    <>
      <Card 
        className={cn(
          "transition-all hover:shadow-md cursor-pointer select-none relative",
          isMobile && isPressed && "scale-95 opacity-70"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="text-2xl flex-shrink-0">{mode.icon}</div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{mode.name}</CardTitle>
                <CardDescription className="text-sm line-clamp-2 mt-1">
                  {mode.systemPrompt}
                </CardDescription>
              </div>
            </div>
            {/* Desktop buttons - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(mode)}
                className="h-8 w-8 hover:bg-primary/10"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(mode._id)}
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Context Menu for Mobile */}
      {showContextMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" 
          onClick={() => setShowContextMenu(false)}
          style={{ zIndex: 9999 }}
        >
          <div 
            className="bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-xl rounded-2xl p-4 min-w-[250px] max-w-[300px] w-full" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <div className="text-xl">{mode.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{mode.name}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{mode.systemPrompt}</div>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                variant="ghost"
                onClick={() => {
                  onEdit(mode);
                  setShowContextMenu(false);
                }}
                className="w-full justify-start gap-3 h-12 text-base"
              >
                <Edit3 className="h-5 w-5" />
                Редактировать
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onDelete(mode._id);
                  setShowContextMenu(false);
                }}
                className="w-full justify-start gap-3 h-12 text-base text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-5 w-5" />
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

interface ModeFormViewProps {
  formData: ModeFormData;
  onChange: (field: keyof ModeFormData, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}

const ModeFormView = memo(({
  formData,
  onChange,
  onSave,
  onCancel,
  isEditing
}: ModeFormViewProps) => {
  const [showIconSelector, setShowIconSelector] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="mode-name" className="text-sm font-medium">
              Mode Name
            </Label>
            <Input
              id="mode-name"
              placeholder="e.g., Creative Writer, Code Reviewer..."
              value={formData.name}
              onChange={(e) => onChange('name', e.target.value)}
              maxLength={50}
              className="text-base" // Larger text for mobile
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.name.length}/50
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Icon</Label>
            
            {/* Mobile: Show selected icon with tap to change */}
            <div className="sm:hidden">
              <Button
                variant="outline"
                onClick={() => setShowIconSelector(!showIconSelector)}
                className="w-full h-16 text-2xl gap-3"
              >
                {formData.icon}
                <span className="text-sm">Нажмите для смены</span>
              </Button>
              
              {showIconSelector && (
                <div className="mt-3 grid grid-cols-6 gap-2 p-3 bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-xl rounded-2xl">
                  {DEFAULT_ICONS.map(({ icon, label }) => (
                    <Button
                      key={icon}
                      variant={formData.icon === icon ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        onChange('icon', icon);
                        setShowIconSelector(false);
                      }}
                      className="h-12 w-12 text-xl"
                      title={label}
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: Show all icons */}
            <div className="hidden sm:grid grid-cols-6 gap-2">
              {DEFAULT_ICONS.map(({ icon, label }) => (
                <Button
                  key={icon}
                  variant={formData.icon === icon ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange('icon', icon)}
                  className="h-12 w-12 text-xl"
                  title={label}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-sm font-medium">
              Custom Instructions
            </Label>
            <Textarea
              id="system-prompt"
              placeholder="You are a helpful AI assistant specialized in..."
              value={formData.systemPrompt}
              onChange={(e) => onChange('systemPrompt', e.target.value)}
              maxLength={2000}
              className="h-40 sm:h-32 resize-none text-base" // Larger height and text for mobile
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.systemPrompt.length}/2000
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-friendly buttons */}
      <div className="flex-shrink-0 border-t p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="w-full sm:w-auto h-12 sm:h-auto text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!formData.name.trim() || !formData.systemPrompt.trim()}
            className="w-full sm:w-auto h-12 sm:h-auto text-base"
          >
            {isEditing ? 'Update Mode' : 'Create Mode'}
          </Button>
        </div>
      </div>
    </div>
  );
});

ModesListView.displayName = 'ModesListView';
ModeCard.displayName = 'ModeCard';
ModeFormView.displayName = 'ModeFormView';
CustomModesDialog.displayName = 'CustomModesDialog';

export default CustomModesDialog;
