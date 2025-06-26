"use client";

import { memo, useCallback, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/frontend/components/ui/input';
import { cn } from '@/lib/utils';
import { AIModel, getModelConfig, getModelsByProvider } from '@/lib/models';
import { getCompanyIcon } from '@/frontend/components/ui/provider-icons';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: AIModel;
  onModelSelect: (model: AIModel) => void;
  isModelEnabled: (model: AIModel) => boolean;
}

export const ModelSelector = memo<ModelSelectorProps>(({
  models,
  selectedModel,
  onModelSelect,
  isModelEnabled,
}) => {
  const { isMobile } = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const { getVisibleGeneralModels } = useModelVisibilityStore();

  // Function to calculate search relevance score
  const getRelevanceScore = useCallback((model: AIModel, query: string) => {
    const modelLower = model.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match - highest priority
    if (modelLower === queryLower) return 1000;
    
    // Starts with query - high priority  
    if (modelLower.startsWith(queryLower)) return 800 + (queryLower.length / modelLower.length) * 100;
    
    // Contains query at word boundary - medium priority
    const words = modelLower.split(/[\s\-._]/);
    for (const word of words) {
      if (word.startsWith(queryLower)) {
        return 600 + (queryLower.length / word.length) * 100;
      }
    }
    
    // Contains query anywhere - low priority
    if (modelLower.includes(queryLower)) {
      const index = modelLower.indexOf(queryLower);
      return 400 + (queryLower.length / modelLower.length) * 100 - index;
    }
    
    return 0;
  }, []);

  // Filter and sort models based on search
  const filteredModels = searchQuery 
    ? getVisibleGeneralModels() // Search across ALL available models
        .filter(model => {
          const score = getRelevanceScore(model, searchQuery);
          return score > 0 && isModelEnabled(model);
        })
        .sort((a, b) => {
          const scoreA = getRelevanceScore(a, searchQuery);
          const scoreB = getRelevanceScore(b, searchQuery);
          return scoreB - scoreA; // Higher score first
        })
    : models; // Use provided models (favorites) when no search

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
      <div className="space-y-1 max-h-[180px] overflow-y-auto">
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
