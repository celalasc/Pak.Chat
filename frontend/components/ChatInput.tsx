"use client";

import { ChevronDown, Check, ArrowUpIcon, Star, ChevronUp, ChevronLeft, Globe, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/frontend/components/ui/textarea';

import { cn } from '@/lib/utils';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import useAutoResizeTextarea from '@/hooks/useAutoResizeTextArea';
import { UseChatHelpers, useCompletion } from '@ai-sdk/react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { useAPIKeyStore, APIKeys } from '@/frontend/stores/APIKeyStore';
import { useModelStore, ReasoningEffort } from '@/frontend/stores/ModelStore';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';
import { useModelVisibilitySync } from '@/frontend/hooks/useModelVisibilitySync';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { AI_MODELS, AIModel, getModelConfig } from '@/lib/models';
import { UIMessage } from 'ai';
import AttachmentsBar from './AttachmentsBar';
import { useAttachmentsStore } from '../stores/AttachmentsStore';
import { useChatStore } from '../stores/ChatStore';
import type { LocalAttachment } from '../stores/AttachmentsStore';
import { isConvexId } from '@/lib/ids';
import { StopIcon } from './ui/icons';
import { toast } from 'sonner';
import { useMessageSummary } from '../hooks/useMessageSummary';
import QuoteDisplay from './QuoteDisplay';
import { Input } from '@/frontend/components/ui/input';
import { useRouter } from 'next/navigation';
import { useRecentFilesIntegration, addFileToRecent, addUploadedFileMetaToRecent } from './RecentFilesDropdown';
import { getCompanyIcon } from '@/frontend/components/ui/provider-icons';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useDebouncedCallback } from 'use-debounce';
import { createImagePreview } from '@/frontend/lib/image';
import { saveLastChatId, saveLastPath } from '@/frontend/lib/lastChat';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useRippleEffect } from '@/frontend/hooks/useRippleEffect';

// Helper to convert File objects to Base64 data URLs
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Helper to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    
    img.src = url;
  });
};

interface ChatInputProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  input: UseChatHelpers['input'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  setInput: UseChatHelpers['setInput'];
  /** Reload chat with current messages without appending */
  reload: UseChatHelpers['reload'];
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  stop: UseChatHelpers['stop'];
  messageCount: number;
  onThreadCreated?: (id: Id<'threads'>) => void;
}

interface StopButtonProps {
  stop: UseChatHelpers['stop'];
}

interface SendButtonProps {
  onSubmit: () => void;
  disabled: boolean;
}

interface ChatModelDropdownProps {
  messageCount?: number;
}

const createUserMessage = (id: string, text: string, attachments?: any[]): UIMessage & { attachments?: any[] } => {
  return {
    id,
    parts: [{ type: 'text', text }],
    role: 'user',
    content: text,
    createdAt: new Date(),
    attachments,
  };
};

const ImageGenerationControls = () => {
  const { imageGenerationParams, setImageGenerationParams } = useChatStore();
  const { keys } = useAPIKeyStore();
  
  const qualityOptions = [
    { value: 'auto' as const, label: 'Auto' },
    { value: 'low' as const, label: 'Low' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'high' as const, label: 'High' },
  ];
  
  const sizeOptions = [
    { value: 'auto' as const, label: 'Auto' },
    { value: '1024x1024' as const, label: '1024×1024' },
    { value: '1024x1536' as const, label: '1024×1536' },
    { value: '1536x1024' as const, label: '1536×1024' },
  ];
  
  const formatOptions = [
    { value: 'jpeg' as const, label: 'JPEG' },
    { value: 'png' as const, label: 'PNG' },
    { value: 'webp' as const, label: 'WebP' },
  ];
  
  const countOptions = [1, 2, 3, 4] as const;
  
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-lg text-xs">
      {/* Quality */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
          >
            Quality: {qualityOptions.find(opt => opt.value === imageGenerationParams.quality)?.label}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {qualityOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setImageGenerationParams({ quality: option.value })}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
          >
            {sizeOptions.find(opt => opt.value === imageGenerationParams.size)?.label}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {sizeOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setImageGenerationParams({ size: option.value })}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Count */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
          >
            {imageGenerationParams.count}x
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {countOptions.map((count) => (
            <DropdownMenuItem
              key={count}
              onSelect={() => setImageGenerationParams({ count })}
            >
              {count} image{count > 1 ? 's' : ''}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Format */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
          >
            {formatOptions.find(opt => opt.value === imageGenerationParams.format)?.label}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {formatOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setImageGenerationParams({ format: option.value })}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const PureChatModelDropdown = ({ messageCount = 0 }: ChatModelDropdownProps) => {
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
    isFavoriteModel,
    toggleFavoriteModel,
    isProviderEnabled,
  } = useModelVisibilityStore();
  const { saveToConvex } = useModelVisibilitySync();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isReasoningEffortOpen, setIsReasoningEffortOpen] = useState(false);
  const { isMobile } = useIsMobile();

  // Ripple эффект для мобильных устройств
  const { createRipple } = useRippleEffect({ 
    color: 'rgba(0, 0, 0, 0.1)', 
    duration: 300 
  });

  const currentModelConfig = getModelConfigFromStore();
  const showReasoningEffortButton = ['o4-mini', 'o3'].includes(selectedModel);
  const showWebSearchButton = supportsWebSearch();

  const reasoningEfforts: ReasoningEffort[] = ['high', 'medium', 'low'];

  // Helper to render provider icon
  const getProviderIcon = useCallback((model: AIModel) => {
    const config = getModelConfig(model);
    return getCompanyIcon(config.company, 'h-3 w-3');
  }, []);

  const isModelEnabled = useCallback(
    (model: AIModel) => {
      const config = getModelConfig(model);
      const apiKey = getKey(config.provider);
      return Boolean(apiKey) && isProviderEnabled(config.provider as any);
    },
    [getKey, isProviderEnabled]
  );

  // We call the selectors on each render so that UI reacts immediately to
  // store updates (e.g. when the user toggles a provider or favourites in
  // the Settings screen). Memoising only on the function reference caused
  // stale values because the function reference is stable between renders.

  const visibleFavoriteModels = getVisibleFavoriteModels();

  const visibleGeneralModels = getVisibleGeneralModels().filter((m) => !isFavoriteModel(m));

  // Показываем все избранные модели, но визуально отключаем те, которые
  // недоступны (например, отсутствует API-ключ). Это позволяет пользователю
  // видеть свои избранные модели на любом устройстве.
  const enabledFavorites = visibleFavoriteModels;

  const disabledModels = visibleGeneralModels.filter((m) => !isModelEnabled(m));

  const enabledNonFavorites = visibleGeneralModels.filter(isModelEnabled);

  // We want a single scroll container for the whole dropdown, so avoid
  // adding inner overflow-y-auto wrappers later.
  const allOtherModelsSorted = [...enabledNonFavorites, ...disabledModels];

  const handleModelSelect = useCallback(
    (model: AIModel) => {
      if (isModelEnabled(model)) {
        setModel(model);
        setIsOpen(false);
        setIsExpanded(false);
      }
    },
    [isModelEnabled, setModel]
  );

  const handleToggleFavorite = useCallback(
    (model: AIModel, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isModelEnabled(model)) {
        toggleFavoriteModel(model);
      }
    },
    [toggleFavoriteModel, isModelEnabled]
  );

  // Обработчики событий с ripple эффектом
  const handleModelSelectWithRipple = useCallback(
    (model: AIModel) => (event: React.TouchEvent | React.MouseEvent) => {
      createRipple(event);
      handleModelSelect(model);
    },
    [createRipple, handleModelSelect]
  );

  const handleToggleFavoriteWithRipple = useCallback(
    (model: AIModel) => (event: React.TouchEvent | React.MouseEvent) => {
      event.stopPropagation();
      createRipple(event);
      if (isModelEnabled(model)) {
        toggleFavoriteModel(model);
      }
    },
    [createRipple, toggleFavoriteModel, isModelEnabled]
  );

  const handleShowAll = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleBackToFavorites = useCallback(() => {
    setIsExpanded(false);
  }, []);

  // Общий контент для мобильной и десктопной версий
  const renderModelsContent = () => {
    if (!isExpanded) {
      // Показываем только избранные модели
      return (
        <div className={cn("p-3", isMobile && "p-4")}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "px-2 py-1 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide flex items-center gap-2",
              isMobile && "text-sm"
            )}>
              <Star className={cn("w-3 h-3", isMobile && "w-4 h-4")} />
              Favorites
            </div>
            <button
              onClick={handleShowAll}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg",
                isMobile && "text-sm px-4 py-2"
              )}
            >
              Show all
              <ChevronUp className={cn("w-3 h-3", isMobile && "w-4 h-4")} />
            </button>
          </div>
          {enabledFavorites.length === 0 ? (
            <div className={cn(
              "text-center py-8 text-sm text-muted-foreground",
              isMobile && "py-12 text-base"
            )}>
              No favorite models
            </div>
          ) : (
            <div className={cn("space-y-2 mb-4", isMobile && "space-y-3")}>
              {enabledFavorites.map((model) => {
                const enabled = isModelEnabled(model);
                return (
                  <div
                    key={model}
                    onClick={() => handleModelSelect(model)}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "transition-opacity",
                          isMobile ? "w-8 h-8 opacity-100 mobile-touch-item" : "w-6 h-6 opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => handleToggleFavorite(model, e)}
                        onTouchStart={handleToggleFavoriteWithRipple(model)}
                        onMouseDown={handleToggleFavoriteWithRipple(model)}
                      >
                        <Star className={cn(
                          "text-yellow-500 fill-yellow-500",
                          isMobile ? "w-4 h-4" : "w-3 h-3"
                        )} />
                      </Button>
                      {selectedModel === model && <Check className={cn(
                        "text-primary",
                        isMobile ? "w-5 h-5" : "w-4 h-4"
                      )} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    } else {
      // Показываем все модели
      return (
        <div className={cn("p-3", isMobile && "p-4")}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "px-2 py-1 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide flex items-center gap-2",
              isMobile && "text-sm"
            )}>
              <Star className={cn("w-3 h-3", isMobile && "w-4 h-4")} />
              Favorites
            </div>
            <button
              onClick={handleBackToFavorites}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg",
                isMobile && "text-sm px-4 py-2"
              )}
            >
              <ChevronLeft className={cn("w-3 h-3", isMobile && "w-4 h-4")} />
              Back to Favorites
            </button>
          </div>
          <div className="mb-6">
            {enabledFavorites.length === 0 ? (
              <div className={cn(
                "text-center py-8 text-sm text-muted-foreground",
                isMobile && "py-12 text-base"
              )}>
                No favorite models
              </div>
            ) : (
              <div className={cn(
                "grid gap-3",
                isMobile ? "grid-cols-1 gap-4" : "grid-cols-2"
              )}>
                {enabledFavorites.map((model) => {
                  const enabled = isModelEnabled(model);
                  return (
                    <div
                      key={model}
                      onClick={() => handleModelSelect(model)}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute transition-opacity",
                          isMobile 
                            ? "top-2 right-2 w-6 h-6 opacity-100 mobile-touch-item" 
                            : "top-1 right-1 w-4 h-4 opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => handleToggleFavorite(model, e)}
                        onTouchStart={handleToggleFavoriteWithRipple(model)}
                        onMouseDown={handleToggleFavoriteWithRipple(model)}
                      >
                        <Star className={cn(
                          "text-yellow-500 fill-yellow-500",
                          isMobile ? "w-3 h-3" : "w-2 h-2"
                        )} />
                      </Button>
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
            )}
          </div>
          {allOtherModelsSorted.length > 0 && (
            <div className="mb-4">
              <div className={cn(
                "px-2 py-1 text-xs font-semibold text-muted-foreground/80 mb-3 uppercase tracking-wide",
                isMobile && "text-sm"
              )}>
                Others
              </div>
              <div className={cn(
                "grid gap-3",
                isMobile ? "grid-cols-1 gap-4" : "grid-cols-2"
              )}>
                {allOtherModelsSorted.map((model) => {
                  const enabled = isModelEnabled(model);
                  const isFav = isFavoriteModel(model);
                  return (
                    <div
                      key={model}
                      onClick={() => handleModelSelect(model)}
                      onTouchStart={handleModelSelectWithRipple(model)}
                      onMouseDown={handleModelSelectWithRipple(model)}
                      className={cn(
                        'relative flex items-center justify-center rounded-xl border-2 cursor-pointer group transition-colors overflow-hidden',
                        selectedModel === model
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border/60 hover:border-primary/40 hover:bg-accent',
                        !enabled && 'bg-muted/50 border-muted-foreground/20 opacity-60',
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
                        onClick={(e) => handleToggleFavorite(model, e)}
                        onTouchStart={handleToggleFavoriteWithRipple(model)}
                        onMouseDown={handleToggleFavoriteWithRipple(model)}
                      >
                        <Star className={cn(
                          "text-muted-foreground hover:text-yellow-500",
                          isMobile ? "w-3 h-3" : "w-2 h-2"
                        )} />
                      </Button>
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
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isImageGenerationMode ? (
        // Image generation mode - no dropdown, just display with close button
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
      ) : isMobile ? (
        // Мобильная версия с Drawer
        <Drawer 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setIsExpanded(false);
            }
          }}
          shouldScaleBackground={false}
          dismissible={true}
          modal={true}
          snapPoints={[1]}
          fadeFromIndex={0}
          closeThreshold={0.5}
        >
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500 transition-colors"
              aria-label={`Selected model: ${selectedModel}`}
            >
              <div className="flex items-center gap-1">
                {selectedModel}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh] flex flex-col">
            {/* Pull handle */}
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Hidden title for accessibility */}
            <DrawerHeader className="sr-only">
              <DrawerTitle>Select Model</DrawerTitle>
            </DrawerHeader>
            
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
              {renderModelsContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        // Десктопная версия с DropdownMenu
        <DropdownMenu
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setIsExpanded(false);
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500 transition-colors"
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
              !isExpanded ? 'w-64' : 'w-80',
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
      {showReasoningEffortButton && (
        <DropdownMenu open={isReasoningEffortOpen} onOpenChange={setIsReasoningEffortOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500 transition-colors"
              aria-label={`Reasoning effort: ${currentModelConfig.reasoningEffort || 'medium'}`}
            >
              <div className="flex items-center gap-1">
                {currentModelConfig.reasoningEffort || 'medium'}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              'w-40',
              'border border-border/50 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden max-h-[50vh]'
            )}
            align="center"
            side="top"
            sideOffset={12}
            avoidCollisions
          >
            <div className="p-1">
              {reasoningEfforts.map((effort) => (
                <DropdownMenuItem
                  key={effort}
                  onSelect={() => setReasoningEffort(selectedModel, effort)}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  {effort}
                  {currentModelConfig.reasoningEffort === effort && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
};

const ChatModelDropdown = memo(PureChatModelDropdown);
ChatModelDropdown.displayName = 'ChatModelDropdown';

const PureStopButton = ({ stop }: StopButtonProps) => (
  <Button
    variant="outline"
    size="icon"
    onClick={stop}
    aria-label="Stop generating response"
    className="rounded-full"
  >
    <StopIcon size={20} />
  </Button>
);

const StopButton = memo(PureStopButton);
StopButton.displayName = 'StopButton';

const PureSendButton = ({ onSubmit, disabled }: SendButtonProps) => (
  <Button
    onClick={onSubmit}
    variant="default"
    size="icon"
    disabled={disabled}
    aria-label="Send message"
    className="rounded-full"
  >
    <ArrowUpIcon size={18} />
  </Button>
);

const SendButton = memo(PureSendButton, (p, n) => p.disabled === n.disabled);
SendButton.displayName = 'SendButton';

function PureChatInput({
  threadId,
  thread,
  input,
  status,
  error,
  setInput,
  reload,
  setMessages,
  append,
  stop,
  messageCount,
  onThreadCreated,
}: ChatInputProps) {
  const { isImageGenerationMode, imageGenerationParams, setImageGenerationMode, initializeImageGenerationParams } = useChatStore();
  // Все хуки должны быть вызваны до любых условных возвратов
  const { hasRequiredKeys, keys, setKeys, keysLoading } = useAPIKeyStore();
  const { user } = useAuthStore();
  const canChat = hasRequiredKeys();
  const { currentQuote, clearQuote } = useQuoteStore();
  
  // Load user settings for image generation
  const userSettings = useQuery(api.userSettings.get, user ? {} : 'skip');
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 200,
  });
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachments = useMutation(api.attachments.save as any);
  const saveDraftMutation = useMutation(api.threads.saveDraft);
  const updateAttachmentMessageId = useMutation(api.attachments.updateMessageId);
  // Remove this line as we'll use a different approach
  const { complete } = useMessageSummary();
  const { attachments, clear, setUploading } = useAttachmentsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { selectedModel, webSearchEnabled } = useModelStore();

  // ИСПРАВЛЕНИЕ: Локальное состояние для отслеживания созданного треда в сессии
  const [sessionThreadId, setSessionThreadId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Initialize input from server-side draft when thread changes
  useEffect(() => {
    const initialText = thread?.draft ?? '';
    setInput(initialText);
    adjustHeight();
  }, [threadId, thread]);

  // Track the created thread only when the incoming threadId changes
  useEffect(() => {
    if (isConvexId(threadId)) {
      setSessionThreadId(threadId);
    } else {
      setSessionThreadId(null);
    }
  }, [threadId]);

  // Debounced draft saver to reduce server load
  const debouncedSaveDraft = useDebouncedCallback((draftText: string) => {
    const currentThreadId = sessionThreadId || threadId;
    if (isConvexId(currentThreadId)) {
      saveDraftMutation({ threadId: currentThreadId as Id<'threads'>, draft: draftText });
    }
  }, 500);
  
  // Initialize image generation parameters from user settings
  useEffect(() => {
    if (userSettings) {
      const defaultParams = {
        quality: (userSettings.imageGenerationQuality as 'auto' | 'low' | 'medium' | 'high') || 'auto',
        size: (userSettings.imageGenerationSize as 'auto' | '1024x1024' | '1024x1536' | '1536x1024') || 'auto',
        count: (userSettings.imageGenerationCount as 1 | 2 | 3 | 4) || 1,
        format: (userSettings.imageGenerationFormat as 'png' | 'jpeg' | 'webp') || 'jpeg',
        compression: userSettings.imageGenerationCompression || 80,
      };
      initializeImageGenerationParams(defaultParams);
    }
  }, [userSettings, initializeImageGenerationParams]);
  

  // Интеграция с недавними файлами
  useRecentFilesIntegration();

  const isDisabled = useMemo(
    () => !input.trim() || status === 'streaming' || status === 'submitted' || isSubmitting || !canChat,
    [input, status, isSubmitting, canChat]
  );
  


  const handleSubmit = useCallback(async () => {
    if (isDisabled) return;
    setIsSubmitting(true);

    const currentInput = textareaRef.current?.value || input;
    let finalMessage = currentInput.trim();
    if (currentQuote) {
      finalMessage = `> ${currentQuote.text.replace(/\n/g, '\n> ')}\n\n${currentInput.trim()}`;
    }

    // Reset UI early but keep attachments until they finish uploading
    setInput('');
    clearQuote();
    adjustHeight(true);

    try {
      // IMAGE GENERATION: Check if image generation mode is enabled
      if (isImageGenerationMode) {
        if (!finalMessage.trim()) {
          toast.error('Please enter a prompt for image generation');
          setIsSubmitting(false);
          return;
        }

        if (!keys.openai) {
          toast.error('OpenAI API key is required for image generation');
          setIsSubmitting(false);
          return;
        }

        // Keep image generation mode active during processing
      }

      // Проверка: PDF вложения разрешены только для Google (Gemini) моделей
      const provider = getModelConfig(selectedModel).provider;
      if (attachments.some((a) => a.type === 'application/pdf') && provider !== 'google') {
        toast.error(
          "PDF files are only supported by the Gemini model. Please select the Gemini model or remove the PDF.",
        );
        setIsSubmitting(false);
        return;
      }

      // ИСПРАВЛЕНИЕ: Используем sessionThreadId если доступен, иначе создаем новый тред
      let ensuredThreadId: Id<'threads'>;
      
      if (sessionThreadId && isConvexId(sessionThreadId)) {
        // Используем уже созданный тред из сессии
        ensuredThreadId = sessionThreadId as Id<'threads'>;
      } else if (isConvexId(threadId)) {
        // Используем существующий тред
        ensuredThreadId = threadId as Id<'threads'>;
      } else {
        // Создаем новый тред только если его еще нет
        ensuredThreadId = await createThread({
          title: finalMessage.slice(0, 30) || 'New Chat',
        });
        
        // Сохраняем созданный тред в сессии
        setSessionThreadId(ensuredThreadId);
        
        // Уведомляем родительский компонент
        onThreadCreated?.(ensuredThreadId);
        
        // Обновляем URL плавно без перезагрузки страницы (только на клиенте)
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/chat/${ensuredThreadId}`);
          // Сохраняем новый путь
          saveLastPath(`/chat/${ensuredThreadId}`);
          // Также обновляем последний выбранный чат
          saveLastChatId(ensuredThreadId);
        }
      }

      // 3. Сохраняем текст сообщения в БД СРАЗУ, чтобы порядок (user → assistant) был корректным
      const dbMsgId = await sendMessage({
        threadId: ensuredThreadId,
        content: finalMessage,
        role: 'user',
      });

      // 4. Оптимистично добавляем сообщение в UI
      const localAttachments = attachments.filter((att): att is LocalAttachment => !att.remote);
      const remoteAttachments = attachments.filter(att => att.remote);
      const clientMsgId = dbMsgId; // используем реальный ID для UI и для связывания вложений

      // 5. Загрузка файлов (оригинал + превью)
      // Устанавливаем состояние загрузки для всех локальных файлов
      localAttachments.forEach(att => setUploading(att.id, true));
      
      const uploadedFiles = await Promise.all(
        localAttachments.map(async (attachment) => {
          try {
            // 1. Upload the original file
            const uploadUrl = await generateUploadUrl();
            const resOrig = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': attachment.file.type },
              body: attachment.file,
            });
            if (!resOrig.ok) throw new Error(`Failed to upload ${attachment.name}`);
            const { storageId } = await resOrig.json();

          // 2. Create preview if needed and upload it
          let previewId: string | undefined = undefined;
          
          // Для рисунков используем оригинальный файл как preview (они обычно маленькие)
          if (attachment.file.name.startsWith('drawing-') && attachment.file.name.endsWith('.png')) {
            const previewUploadUrl = await generateUploadUrl();
            const resPrev = await fetch(previewUploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': attachment.file.type },
              body: attachment.file,
            });
            if (resPrev.ok) {
              const { storageId: pId } = await resPrev.json();
              previewId = pId;
              
            }
          } else {
            // Для обычных изображений используем сжатый preview
            const previewFile = await createImagePreview(attachment.file);
            if (previewFile) {
              const previewUploadUrl = await generateUploadUrl();
              const resPrev = await fetch(previewUploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': previewFile.type },
                body: previewFile,
              });
              if (resPrev.ok) {
                const { storageId: pId } = await resPrev.json();
                previewId = pId;
              }
            }
          }

          // 3. Image dimensions
          const dimensions = await getImageDimensions(attachment.file);

          // Убираем индикатор загрузки для этого конкретного файла после успешной загрузки
          setUploading(attachment.id, false);

          return {
            storageId,
            previewId,
            name: attachment.name,
            type: attachment.type,
            messageId: clientMsgId,
            width: dimensions?.width,
            height: dimensions?.height,
            size: attachment.size,
          };
          } catch (error) {
            console.error('Failed to upload file:', attachment.name, error);
            // Убираем индикатор загрузки для этого конкретного файла при ошибке
            setUploading(attachment.id, false);
            throw error;
          }
        })
      );

      // 4b. Добавляем уже загруженные удаленные файлы
      const reusedFiles = remoteAttachments.map(att => {
        const remoteAtt = att as any; // Cast to access remote properties
        return {
          storageId: remoteAtt.storageId,
          previewId: remoteAtt.previewId,
          name: att.name,
          type: att.type,
          messageId: clientMsgId,
          width: undefined,
          height: undefined,
          size: att.size,
        };
      });
      
      uploadedFiles.push(...reusedFiles);

      // 6. Сохраняем метаданные вложений в БД
      let savedAttachments: any[] = [];
      if (uploadedFiles.length > 0) {
        try {
          savedAttachments = await saveAttachments({
            threadId: ensuredThreadId,
            attachments: uploadedFiles,
          });
        } catch (err) {
          toast.error('Failed to save attachment metadata');
          console.error(err);
          setIsSubmitting(false);
          return;
        }
      }

      // 7. Генерация заголовка в фоне для нового чата (СРАЗУ, параллельно с LLM запросом)
      const isNewChat = !isConvexId(threadId) && !sessionThreadId;
      if (isNewChat) {
        // Запускаем генерацию заголовка в фоне, не ждем результата
        complete(finalMessage, {
          body: { threadId: ensuredThreadId, messageId: dbMsgId, isTitle: true },
        });
      }

      // 8. Теперь, когда файлы загружены и привязаны к сообщению (или их не было), отправляем запрос к LLM
      const attachmentsForUI = savedAttachments.map((a) => ({
        id: a.id,
        url: a.url ?? '',
        name: a.name,
        type: a.type,
        ext: a.name.split('.').pop() ?? '',
        size: a.size,
      }));

      // Обновляем messageId для вложений ПЕРЕД отправкой запроса к LLM
      if (savedAttachments.length > 0) {
        await updateAttachmentMessageId({
          attachmentIds: savedAttachments.map((a) => a.id),
          messageId: dbMsgId,
        });
        
        // Небольшая задержка чтобы убедиться, что БД обновилась
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Подготавливаем данные о вложениях для передачи в LLM API
      const attachmentsForLLM = savedAttachments.map((a) => ({
        id: a.id,
        messageId: dbMsgId,
        name: a.name,
        type: a.type,
        url: a.url ?? '',
      }));

      // Check if image generation mode is enabled and pass parameters
      const imageGenerationData = isImageGenerationMode ? {
        enabled: true,
        params: {
          size: imageGenerationParams.size === 'auto' ? '1024x1024' : imageGenerationParams.size,
          quality: imageGenerationParams.quality === 'auto' ? 'standard' : 
                  imageGenerationParams.quality === 'high' ? 'hd' : 'standard',
          count: imageGenerationParams.count,
        }
      } : undefined;

      append(
        createUserMessage(dbMsgId, finalMessage, attachmentsForUI),
        {
          body: {
            model: selectedModel,
            apiKeys: keys,
            threadId: ensuredThreadId,
            userId: user?.uid,
            search: webSearchEnabled,
            attachments: attachmentsForLLM,
            imageGeneration: imageGenerationData,
          },
        }
      );

      // 9. Добавляем файлы в recent ТОЛЬКО после успешной отправки
      if (localAttachments.length > 0) {
        localAttachments.forEach(attachment => {
          const success = addFileToRecent(attachment.file);
          if (!success) {
            // Failed to add file to recent files
          }
        });
      }

      // 10. Обновляем записи в Recent Files с информацией о загруженных файлах
      if (savedAttachments.length > 0) {
        savedAttachments.forEach((savedAttachment, index) => {
          // Находим соответствующий локальный файл по индексу или имени/типу/размеру
          let localAttachment: LocalAttachment | undefined = localAttachments[index];
          
          // Дополнительная проверка по имени, типу и размеру для безопасности
          if (!localAttachment || 
              localAttachment.name !== savedAttachment.name || 
              localAttachment.type !== savedAttachment.type) {
            localAttachment = localAttachments.find(local => 
              local.name === savedAttachment.name && 
              local.type === savedAttachment.type &&
              local.size === savedAttachment.size
            );
          }
          
          if (localAttachment) {
            addUploadedFileMetaToRecent({
              storageId: savedAttachment.fileId,
              previewId: savedAttachment.previewId,
              name: savedAttachment.name,
              type: savedAttachment.type,
              size: savedAttachment.size,
              previewUrl: savedAttachment.url,
            });
          } else {
            console.warn(`Could not find matching local attachment for ${savedAttachment.name}`);
          }
        });
      }

      // Clear attachments only after successful upload
      clear();
      
      // Clear draft after successful message send
      if (isConvexId(ensuredThreadId)) {
        saveDraftMutation({ threadId: ensuredThreadId, draft: '' });
      }

      // 11. UI обновится автоматически через useConvexMessages после добавления в DB

    } catch (error) {
      toast.error('Failed to send message.');
      setInput(currentInput);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isDisabled,
    input,
    threadId,
    sessionThreadId, // ДОБАВЛЕНО В ЗАВИСИМОСТИ
    attachments,
    currentQuote,
    setInput,
    clearQuote,
    adjustHeight,
    clear,
    createThread,
    sendMessage,
    generateUploadUrl,
    saveAttachments,
    setMessages,
    complete,
    router,
    onThreadCreated,
    append,
    selectedModel,
    webSearchEnabled,
    keys,
    updateAttachmentMessageId,
    isImageGenerationMode,
    imageGenerationParams,
    setImageGenerationMode,
    user,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape' && isImageGenerationMode) {
        e.preventDefault();
        setImageGenerationMode(false);
      }
    },
    [handleSubmit, isImageGenerationMode, setImageGenerationMode]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInput(newValue);
      adjustHeight();
      debouncedSaveDraft(newValue);
    },
    [setInput, adjustHeight, debouncedSaveDraft]
  );

  const handleFocus = useCallback(() => {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }
  }, []);

  // Конвертация изображения в PNG
  const convertImageToPng = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const fileName = `pasted-image-${timestamp}.png`;
              const pngFile = new File([blob], fileName, { type: 'image/png' });
              resolve(pngFile);
            } else {
              reject(new Error('Failed to convert image to PNG'));
            }
          }, 'image/png');
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Обработчик вставки изображений из буфера обмена
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Сначала проверяем, есть ли вообще изображения в буфере
      let hasImages = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          hasImages = true;
          break;
        }
      }

      // Если изображений нет, позволяем стандартной вставке текста продолжиться
      if (!hasImages) {
        return;
      }

      // Если есть изображения, предотвращаем стандартное поведение
      e.preventDefault();

      const imageFiles: File[] = [];
      
      // Обрабатываем каждое изображение
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            try {
              // Конвертируем в PNG
              const pngFile = await convertImageToPng(file);
              imageFiles.push(pngFile);
            } catch (error) {
              console.error('Failed to convert image to PNG:', error);
              toast.error('Failed to process pasted image');
            }
          }
        }
      }

      // Добавляем изображения в store
      if (imageFiles.length > 0) {
        const { add } = useAttachmentsStore.getState();
        imageFiles.forEach(file => {
          add(file);
        });

        // Показываем уведомление
        if (imageFiles.length === 1) {
          toast.success('Image pasted successfully');
        } else {
          toast.success(`${imageFiles.length} images pasted successfully`);
        }
      }
    },
    [convertImageToPng]
  );

  // Обработчики для drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter <= 0) {
        setIsDragOver(false);
        return 0;
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      const imageFiles: File[] = [];

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          try {
            // Конвертируем в PNG
            const pngFile = await convertImageToPng(file);
            imageFiles.push(pngFile);
          } catch (error) {
            console.error('Failed to convert dropped image to PNG:', error);
            toast.error(`Failed to process ${file.name}`);
          }
        } else {
          // Для не-изображений добавляем как есть
          imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        const { add } = useAttachmentsStore.getState();
        imageFiles.forEach(file => {
          add(file);
        });

        // Показываем уведомление
        if (imageFiles.length === 1) {
          toast.success('File added successfully');
        } else {
          toast.success(`${imageFiles.length} files added successfully`);
        }
      }
    },
    [convertImageToPng]
  );

  // Глобальный обработчик для сброса drag состояния и Escape
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDragOver(false);
      setDragCounter(0);
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      // Если курсор покинул окно браузера
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragOver(false);
        setDragCounter(0);
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImageGenerationMode) {
        // Проверяем, что нет открытых модальных окон
        const hasOpenModal = document.querySelector('[role="dialog"]') || 
                            document.querySelector('.modal') ||
                            document.querySelector('[data-state="open"]') ||
                            document.querySelector('.fixed.inset-0');
        
        // Также проверяем, что фокус находится в области чата, а не в модальном окне
        const isInChatArea = containerRef.current?.contains(document.activeElement) ||
                            document.activeElement === textareaRef.current ||
                            document.activeElement === document.body;
        
        if (!hasOpenModal && isInChatArea) {
          e.preventDefault();
          setImageGenerationMode(false);
        }
      }
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isImageGenerationMode, setImageGenerationMode]);



  return (
    <>
      <div className="w-full flex justify-center pb-safe mobile-keyboard-fix">
        <div 
          ref={containerRef} 
          className={cn(
            'backdrop-blur-md bg-white dark:bg-secondary p-2 pb-0 max-w-3xl w-full transition-all duration-200 relative',
            messageCount === 0 
              ? 'rounded-[20px] sm:rounded-[28px]' 
              : 'rounded-t-[20px] sm:rounded-t-[28px] border-t border-border/50',
            messageCount === 0 && !isDragOver && 'border border-border/50',
            'border border-gray-200 dark:border-border/50'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay - теперь покрывает весь контейнер */}
          {isDragOver && (
            <div className={cn(
              "absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary",
              messageCount === 0 
                ? 'rounded-[20px] sm:rounded-[28px]' 
                : 'rounded-t-[20px] sm:rounded-t-[28px]'
            )}>
              <div className="text-center p-4">
                <div className="text-primary font-semibold text-lg mb-2">📁 Drop files here</div>
                <div className="text-primary/70 text-sm">Images will be converted to PNG</div>
              </div>
            </div>
          )}

          <div className="relative rounded-[16px] sm:rounded-[24px] overflow-hidden bg-white dark:bg-transparent">

            {/* (Provider links removed to avoid unnecessary flicker) */}

            <div className="flex flex-col">
              {/* Attachments at the top */}
              {attachments.length > 0 && (
                <div className="bg-white dark:bg-secondary px-4 pt-3">
                  <AttachmentsBar mode="full" />
                </div>
              )}
              
              {/* Quote display */}
              {currentQuote && (
                <div className="bg-white dark:bg-secondary px-4 pt-3">
                  <QuoteDisplay quote={currentQuote} onRemove={clearQuote} />
                </div>
              )}
              
              {/* Text input */}
              <div className="bg-white dark:bg-secondary overflow-y-auto max-h-[300px]">
                <Textarea
                  id="chat-input"
                  value={input}
                  placeholder={
                    isImageGenerationMode 
                      ? "Describe the image you want to generate..." 
                      : "What can I do for you?"
                  }
                  className={cn(
                    'w-full px-4 py-3 border-none shadow-none bg-white dark:bg-transparent',
                    'placeholder:text-muted-foreground resize-none',
                    'focus-visible:ring-0 focus-visible:ring-offset-0',
                    'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30',
                    'scrollbar-thumb-rounded-full',
                    'min-h-[72px]'
                  )}
                  ref={textareaRef}
                  onKeyDown={handleKeyDown}
                  onChange={handleInputChange}
                  onFocus={handleFocus}
                  onPaste={handlePaste}
                  aria-label="Chat message input"
                  aria-describedby="chat-input-description"
                  disabled={!canChat}
                />
                <span id="chat-input-description" className="sr-only">
                  {isImageGenerationMode 
                    ? 'Describe image to generate, Press Enter to create' 
                    : 'Press Enter to send, Shift+Enter for new line'}
                </span>
              </div>
            </div>
            
            {/* Bottom controls */}
            <div className="h-14 flex items-center px-2 bg-white dark:bg-transparent">
              <div className="flex items-center justify-between w-full gap-2 overflow-x-auto">
                {/* Left side: Add file button and model selection */}
                <div className="flex items-center gap-2">
                  <AttachmentsBar mode="compact" messageCount={messageCount} />
                  <ChatModelDropdown messageCount={messageCount} />
                  {isImageGenerationMode && <ImageGenerationControls />}
                </div>
                
                {/* Right side: Send/Stop button */}
                <div className="flex items-center gap-2">
                  {status === 'submitted' || status === 'streaming' ? (
                    <StopButton stop={stop} />
                  ) : (
                    <SendButton onSubmit={handleSubmit} disabled={isDisabled} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const ChatInput = memo(PureChatInput, (prevProps, nextProps) => {
  return (
    prevProps.input === nextProps.input &&
    prevProps.status === nextProps.status &&
    prevProps.messageCount === nextProps.messageCount
  );
});
ChatInput.displayName = 'ChatInput';

function ChatInputWrapper(props: ChatInputProps) {
  // Отображаем ChatInput сразу; сам компонент корректно блокирует ввод, если ключи ещё не загружены.
  return <ChatInput {...props} />;
}

export default ChatInputWrapper;
