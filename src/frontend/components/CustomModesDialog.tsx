"use client";

import { useState, useCallback, memo } from 'react';
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
import { useCustomModesStore, CustomMode } from '@/frontend/stores/CustomModesStore';
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
  const { modes, addMode, updateMode, deleteMode } = useCustomModesStore();
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

  const handleDeleteMode = useCallback((modeId: string) => {
    deleteMode(modeId);
    toast.success('Custom mode deleted');
  }, [deleteMode]);

  const handleSaveMode = useCallback(() => {
    if (!formData.name.trim()) {
      toast.error('Mode name is required');
      return;
    }

    if (!formData.systemPrompt.trim()) {
      toast.error('System prompt is required');
      return;
    }

    if (view === 'create') {
      addMode({
        name: formData.name.trim(),
        systemPrompt: formData.systemPrompt.trim(),
        icon: formData.icon
      });
      toast.success('Custom mode created');
    } else if (view === 'edit' && editingMode) {
      updateMode(editingMode.id, {
        name: formData.name.trim(),
        systemPrompt: formData.systemPrompt.trim(),
        icon: formData.icon
      });
      toast.success('Custom mode updated');
    }

    setView('list');
    resetForm();
    setEditingMode(null);
  }, [formData, view, editingMode, addMode, updateMode, resetForm]);

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
      <DialogContent className="w-[90vw] sm:max-w-[600px] h-[80vh] max-h-[700px] flex flex-col rounded-3xl overflow-hidden">
        <DialogHeader className="flex-shrink-0">
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
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {view === 'list' ? 'Custom Modes' : view === 'create' ? 'Create Mode' : 'Edit Mode'}
              </DialogTitle>
              <DialogDescription>
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
      <Card className="border-2 border-primary/20 bg-primary/5">
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
                key={mode.id}
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
  return (
    <Card className="transition-all hover:shadow-md">
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
          <div className="flex items-center gap-1 ml-2">
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
              onClick={() => onDelete(mode.id)}
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
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
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
        {/* Mode Name */}
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
            className="bg-muted/30 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="text-xs text-muted-foreground text-right">
            {formData.name.length}/50
          </div>
        </div>

        {/* Icon Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Icon</Label>
          <div className="grid grid-cols-6 gap-2">
            {DEFAULT_ICONS.map(({ icon, label }) => (
              <Button
                key={icon}
                variant={formData.icon === icon ? "default" : "outline"}
                size="sm"
                onClick={() => onChange('icon', icon)}
                className="h-12 w-12 text-xl p-0"
                title={label}
              >
                {icon}
              </Button>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="system-prompt" className="text-sm font-medium">
            System Prompt
          </Label>
          <Textarea
            id="system-prompt"
            placeholder="You are a helpful AI assistant specialized in..."
            value={formData.systemPrompt}
            onChange={(e) => onChange('systemPrompt', e.target.value)}
            maxLength={2000}
            className="h-32 resize-none bg-muted/30 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="text-xs text-muted-foreground text-right">
            {formData.systemPrompt.length}/2000
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-4 border-t flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={onSave}
          disabled={!formData.name.trim() || !formData.systemPrompt.trim()}
        >
          {isEditing ? 'Update Mode' : 'Create Mode'}
        </Button>
      </div>
    </div>
  );
});

ModesListView.displayName = 'ModesListView';
ModeCard.displayName = 'ModeCard';
ModeFormView.displayName = 'ModeFormView';
CustomModesDialog.displayName = 'CustomModesDialog';

export default CustomModesDialog;
