"use client";

import { memo, useCallback, useState } from 'react';
import { ChevronDown, Globe, X } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { AIModel, getModelConfig } from '@/lib/models';
import { ModelSelector } from '@/frontend/features/chat-input/ui/components/ModelDropdown/ModelSelector';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';

interface ChatModelDropdownProps {
  messageCount?: number;
}

export const ChatModelDropdown = memo<ChatModelDropdownProps>(({ messageCount = 0 }) => {
  const { getKey } = useAPIKeyStore();
  const {
    selectedModel,
    setModel,
    getModelConfig: getModelConfigFromStore,
    setReasoningEffort,
    webSearchEnabled,
    setWebSearchEnabled,
    supportsWebSearch,
  } = useModelStore();
  const { isImageGenerationMode, setImageGenerationMode } = useChatStore();
  const {
    getVisibleFavoriteModels,
    getVisibleGeneralModels,
    isProviderEnabled,
  } = useModelVisibilityStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isReasoningEffortOpen, setIsReasoningEffortOpen] = useState(false);
  const { isMobile } = useIsMobile();

  const currentModelConfig = getModelConfigFromStore();
  const showReasoningEffortButton = ['o4-mini', 'o3'].includes(selectedModel);
  const showWebSearchButton = supportsWebSearch();

  const isModelEnabled = useCallback(
    (model: AIModel) => {
      const config = getModelConfig(model);
      const apiKey = getKey(config.provider);
      return Boolean(apiKey) && isProviderEnabled(config.provider as any);
    },
    [getKey, isProviderEnabled]
  );

  const handleModelSelect = useCallback(
    (model: AIModel) => {
      if (isModelEnabled(model)) {
        setModel(model);
        // Закрываем с небольшой задержкой чтобы избежать смещения
        setTimeout(() => setIsOpen(false), 50);
      }
    },
    [isModelEnabled, setModel]
  );

  const handleReasoningEffortChange = useCallback(
    (effort: any) => {
      setReasoningEffort(selectedModel, effort);
      setIsReasoningEffortOpen(false);
    },
    [setReasoningEffort, selectedModel]
  );

  const renderModelsContent = () => {
    // Show only favorite models (those with checkmark in settings)
    const favoriteModels = getVisibleFavoriteModels();
    
    // If no favorites selected, show NO models - force user to configure favorites
    const modelsToShow = favoriteModels;
    
    return (
      <div className={cn("p-3", isMobile && "p-4")}>
        {favoriteModels.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground mb-4">
              No favorite models selected
            </div>
            <div className="text-xs text-muted-foreground px-4 py-3 bg-muted/20 rounded-lg">
              💡 Go to <strong>Settings → Models</strong> to select your favorite models.<br/>
              Click the checkmark next to models you want to see here.
            </div>
          </div>
        ) : (
          <ModelSelector
            models={modelsToShow}
            selectedModel={selectedModel}
            onModelSelect={handleModelSelect}
            isModelEnabled={isModelEnabled}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {isImageGenerationMode ? (
        // Image generation mode - show settings button first, then close button
        <>
          <div className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg bg-accent/20 border border-border/30">
            <span 
              className="font-medium cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={() => setImageGenerationMode(false)}
            >
              GPT Image 1
            </span>
            <button
              onClick={() => setImageGenerationMode(false)}
              className="ml-1 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="Exit image generation mode"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </>
      ) : isMobile ? (
        // Mobile version with Drawer
        <Drawer 
          open={isOpen} 
          onOpenChange={(open: boolean) => {
            setIsOpen(open);
          }}
        >
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
              aria-label={`Selected model: ${selectedModel}`}
            >
              <div className="flex items-center gap-1">
                {selectedModel}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh] flex flex-col">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Select Model</DrawerTitle>
            </DrawerHeader>
            
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
              {renderModelsContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        // Desktop version with DropdownMenu
        <DropdownMenu
          open={isOpen}
          onOpenChange={(open: boolean) => {
            setIsOpen(open);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
              aria-label={`Selected model: ${selectedModel}`}
            >
              <div className="flex items-center gap-1">
                {selectedModel}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              'w-64',
              'border border-border/50 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden max-h-[50vh]'
            )}
            align="center"
            side="top"
            sideOffset={12}
            avoidCollisions
          >
            <div className="overflow-y-auto max-h-[45vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/30">
              {renderModelsContent()}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {/* Reasoning Effort Selector */}
      {showReasoningEffortButton && (
        <ReasoningEffortSelector
          currentEffort={currentModelConfig.reasoningEffort || 'medium'}
          onEffortChange={handleReasoningEffortChange}
          isOpen={isReasoningEffortOpen}
          onOpenChange={setIsReasoningEffortOpen}
        />
      )}
      
      {/* Web Search Button */}
      {showWebSearchButton && !isImageGenerationMode && (
        <Button
          variant={webSearchEnabled ? "default" : "ghost"}
          size="icon"
          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
          className={cn(
            "h-8 w-8 rounded-lg transition-colors",
            webSearchEnabled 
              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
              : "text-foreground hover:bg-accent/50"
          )}
          aria-label={`Web search: ${webSearchEnabled ? 'enabled' : 'disabled'}`}
        >
          <Globe className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

ChatModelDropdown.displayName = 'ChatModelDropdown'; 