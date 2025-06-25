"use client";

import { memo, useCallback } from 'react';
import { Check, Star } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { cn } from '@/lib/utils';
import { AIModel, getModelConfig } from '@/lib/models';
import { getCompanyIcon } from '@/frontend/components/ui/provider-icons';
import { useRippleEffect } from '@/frontend/hooks/useRippleEffect';
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
  const { createRipple } = useRippleEffect({ 
    color: 'rgba(0, 0, 0, 0.1)', 
    duration: 300 
  });

  const getProviderIcon = useCallback((model: AIModel) => {
    const config = getModelConfig(model);
    return getCompanyIcon(config.company, 'h-3 w-3');
  }, []);

  const handleModelSelectWithRipple = useCallback(
    (model: AIModel) => (event: React.TouchEvent | React.MouseEvent) => {
      createRipple(event);
      onModelSelect(model);
    },
    [createRipple, onModelSelect]
  );

  const handleToggleFavoriteWithRipple = useCallback(
    (model: AIModel) => (event: React.TouchEvent | React.MouseEvent) => {
      event.stopPropagation();
      createRipple(event);
      onToggleFavorite(model, event as React.MouseEvent);
    },
    [createRipple, onToggleFavorite]
  );

  if (models.length === 0) {
    return (
      <div className={cn(
        "text-center py-8 text-sm text-muted-foreground",
        isMobile && "py-12 text-base"
      )}>
        No models available
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-1 gap-4" : "grid-cols-2"
      )}>
        {models.map((model) => {
          const enabled = isModelEnabled(model);
          const isFav = isFavoriteModel(model);
          
          return (
            <div
              key={model}
              onClick={() => onModelSelect(model)}
              onTouchStart={handleModelSelectWithRipple(model)}
              onMouseDown={handleModelSelectWithRipple(model)}
              className={cn(
                'relative flex items-center justify-center rounded-xl border-2 cursor-pointer group transition-colors overflow-hidden',
                selectedModel === model
                  ? 'border-primary bg-primary/10 shadow-md'
                  : 'border-border/60 hover:border-primary/40 hover:bg-accent',
                !enabled && 'opacity-50 bg-muted/20 border-border/30',
                isMobile ? "p-4 min-h-[60px] flex-row gap-3 mobile-touch-item" : "p-3 min-h-[80px] flex-col"
              )}
            >
              {isMobile ? (
                <>
                  <div className="opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {getProviderIcon(model)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{model}</div>
                    {!enabled && (
                      <div className="text-xs text-muted-foreground/70 mt-1">
                        No API key
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {getProviderIcon(model)}
                  </div>
                  <div className="text-xs font-medium text-center leading-tight w-full px-1 break-words">{model}</div>
                  {!enabled && (
                    <div className="text-xs text-muted-foreground/70 text-center mt-1 w-full">
                      No API key
                    </div>
                  )}
                </>
              )}
              
              {showFavoriteButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'absolute transition-opacity',
                    isFav && 'hidden',
                    isMobile 
                      ? "top-2 right-2 w-6 h-6 opacity-100 mobile-touch-item" 
                      : "top-1 right-1 w-4 h-4 opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => onToggleFavorite(model, e)}
                  onTouchStart={handleToggleFavoriteWithRipple(model)}
                  onMouseDown={handleToggleFavoriteWithRipple(model)}
                >
                  <Star className={cn(
                    isFav ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground hover:text-yellow-500",
                    isMobile ? "w-3 h-3" : "w-2 h-2"
                  )} />
                </Button>
              )}
              
              {selectedModel === model && (
                <div className={cn(
                  "absolute",
                  isMobile ? "top-2 left-2" : "top-1 left-1"
                )}>
                  <Check className={cn(
                    "text-primary",
                    isMobile ? "w-4 h-4" : "w-3 h-3"
                  )} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // List layout
  return (
    <div className={cn("space-y-2 mb-4", isMobile && "space-y-3")}>
      {models.map((model) => {
        const enabled = isModelEnabled(model);
        const isFav = isFavoriteModel(model);
        
        return (
          <div
            key={model}
            onClick={() => onModelSelect(model)}
            onTouchStart={handleModelSelectWithRipple(model)}
            onMouseDown={handleModelSelectWithRipple(model)}
            className={cn(
              'relative flex items-center justify-between rounded-xl border-2 cursor-pointer group transition-all overflow-hidden',
              selectedModel === model
                ? 'border-primary bg-primary/10 shadow-md'
                : 'border-border/60 hover:border-primary/40 hover:bg-accent',
              !enabled && 'opacity-50 bg-muted/20 border-border/30',
              isMobile ? "p-4 mobile-touch-item" : "p-3"
            )}
          >
            <div className="flex items-center gap-2">
              {getProviderIcon(model)}
              <div className={cn("font-medium", isMobile ? "text-base" : "text-sm")}>{model}</div>
              {!enabled && (
                <div className={cn(
                  "text-muted-foreground bg-muted px-1.5 py-0.5 rounded",
                  isMobile ? "text-sm" : "text-xs"
                )}>
                  No API key
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {showFavoriteButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "transition-opacity",
                    isMobile ? "w-8 h-8 opacity-100 mobile-touch-item" : "w-6 h-6 opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => onToggleFavorite(model, e)}
                  onTouchStart={handleToggleFavoriteWithRipple(model)}
                  onMouseDown={handleToggleFavoriteWithRipple(model)}
                >
                  <Star className={cn(
                    isFav ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground hover:text-yellow-500",
                    isMobile ? "w-4 h-4" : "w-3 h-3"
                  )} />
                </Button>
              )}
              
              {selectedModel === model && (
                <Check className={cn(
                  "text-primary",
                  isMobile ? "w-5 h-5" : "w-4 h-4"
                )} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

ModelSelector.displayName = 'ModelSelector'; 