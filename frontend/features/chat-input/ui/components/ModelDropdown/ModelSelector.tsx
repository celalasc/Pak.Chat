"use client";

import { memo, useCallback, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/frontend/shared/ui';
import { cn } from '@/lib/utils';
import { AIModel, getModelConfig, getModelsByProvider } from '@/lib/models';
import { getCompanyIcon } from '@/frontend/shared/ui';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: AIModel;
  onModelSelect: (model: AIModel) => void;
  onToggleFavorite: (model: AIModel, e: React.MouseEvent) => void;
  isModelEnabled: (model: AIModel) => boolean;
  isFavoriteModel: (model: AIModel) => boolean;
  showFavoriteButton?: boolean;
  layout?: 'list' | 'grid';
}

export const ModelSelector = memo<ModelSelectorProps>(({
  models,
  selectedModel,
  onModelSelect,
  onToggleFavorite,
  isModelEnabled,
  isFavoriteModel,
  showFavoriteButton = true,
  layout = 'list'
}) => {
  const { isMobile } = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');

  // Get ALL models for search when needed
  const allModels = Object.values(getModelsByProvider()).flat();

  // Filter models based on search
  const filteredModels = searchQuery 
    ? allModels.filter(model =>
        model.toLowerCase().includes(searchQuery.toLowerCase()) &&
        isModelEnabled(model) // Only show enabled models in search
      )
    : models; // Use provided models when no search

  const getProviderIcon = useCallback((model: AIModel) => {
    const config = getModelConfig(model);
    return getCompanyIcon(config.company, 'h-3 w-3');
  }, []);

  // Function to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span 
          key={index} 
          style={{ color: 'rgba(136, 192, 208, 1)' }}
        >
          {part}
        </span>
      ) : part
    );
  };

  const handleModelSelect = useCallback(
    (model: AIModel) => {
      if (isModelEnabled(model)) {
        onModelSelect(model);
      }
    },
    [isModelEnabled, onModelSelect]
  );

  if (filteredModels.length === 0 && !searchQuery) {
    return (
      <div className={cn(
        "text-center py-8 text-sm text-muted-foreground",
        isMobile && "py-12 text-base"
      )}>
        No models available
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", isMobile && "space-y-4")}>
      {/* Search input - show always for better UX */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9 border-none bg-muted/20 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Models list */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {filteredModels.length > 0 ? (
          filteredModels.map((model) => {
            const enabled = isModelEnabled(model);
            const isSelected = selectedModel === model;
            
            return (
              <div
                key={model}
                onClick={() => handleModelSelect(model)}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-200/10',
                  isSelected && 'bg-primary/10 border border-primary/20',
                  !enabled && 'opacity-50 cursor-not-allowed text-muted-foreground',
                  isMobile && "py-3 mobile-touch-item"
                )}
              >
                <div className="flex items-center gap-2">
                  {getProviderIcon(model)}
                  <span className={cn(
                    'font-medium',
                    isMobile ? 'text-base' : 'text-sm'
                  )}>
                    {highlightMatch(model, searchQuery)}
                  </span>
                  {!enabled && (
                    <div className={cn(
                      "text-muted-foreground bg-muted px-1.5 py-0.5 rounded",
                      isMobile ? "text-sm" : "text-xs"
                    )}>
                      No API key
                    </div>
                  )}
                </div>
                
                {isSelected && (
                  <Check className={cn(
                    'text-primary',
                    isMobile ? 'w-5 h-5' : 'w-4 h-4'
                  )} />
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {searchQuery ? 'No models found' : 'No models available'}
          </div>
        )}
      </div>
    </div>
  );
});

ModelSelector.displayName = 'ModelSelector'; 
