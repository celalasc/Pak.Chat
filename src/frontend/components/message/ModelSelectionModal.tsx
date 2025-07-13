import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Check } from 'lucide-react';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';
import { AI_MODELS, getModelConfig } from '@/lib/models';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (modelId: string) => void;
  currentModel?: string;
}

export default function ModelSelectionModal({
  isOpen,
  onClose,
  onSelectModel,
  currentModel
}: ModelSelectionModalProps) {
  const { getVisibleFavoriteModels } = useModelVisibilityStore();
  const [selectedModel, setSelectedModel] = useState<string>(currentModel || '');

  // Получаем избранные модели из ModelVisibilityStore
  const favoriteModels = (getVisibleFavoriteModels() || []).map(model => ({
    id: model,
    name: model,
    provider: getModelConfig(model).company
  }));

  const handleConfirm = useCallback(() => {
    if (selectedModel) {
      onSelectModel(selectedModel);
      onClose();
    }
  }, [selectedModel, onSelectModel, onClose]);

  const handleCancel = useCallback(() => {
    setSelectedModel(currentModel || '');
    onClose();
  }, [currentModel, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Model for Regeneration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {favoriteModels.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No favorite models found. Please add models to favorites in settings.
            </p>
          ) : (
            favoriteModels.map((model) => (
              <div
                key={model.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedModel === model.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:bg-accent'
                }`}
                onClick={() => setSelectedModel(model.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {model.provider}
                    </div>
                  </div>
                  {selectedModel === model.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedModel || favoriteModels.length === 0}
          >
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
