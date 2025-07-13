"use client";

import React, { memo, useCallback, useState } from 'react';
import { 
  ChevronDown, 
  Globe, 
  X, 
  Plus, 
  Settings, 
  Edit3,
  User, 
  Bot, 
  MessageSquare, 
  Code, 
  FileText, 
  Zap, 
  Brain, 
  Target, 
  Search, 
  Star, 
  Sparkles,
  Palette,
  Camera,
  Music
} from 'lucide-react';
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
import { useCustomModesStore, useCustomModesHelpers } from '@/frontend/stores/CustomModesStore';
import CustomModesManagement from './CustomModesManagement';
import { useLongPress } from '@/frontend/hooks/useLongPress';

// Icon component mapping
const ICON_COMPONENTS = {
  'Bot': Bot,
  'User': User,
  'MessageSquare': MessageSquare,
  'Code': Code,
  'FileText': FileText,
  'Settings': Settings,
  'Zap': Zap,
  'Brain': Brain,
  'Target': Target,
  'Search': Search,
  'Star': Star,
  'Sparkles': Sparkles,
  'Palette': Palette,
  'Camera': Camera,
  'Music': Music,
  'Globe': Globe
};

const renderModeIcon = (iconName: string) => {
  const IconComponent = ICON_COMPONENTS[iconName as keyof typeof ICON_COMPONENTS] || Star;
  return React.createElement(IconComponent, { className: "h-4 w-4" });
};

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
  const {
    selectedMode,
    setSelectedMode,
    isCustomModesEnabled,
  } = useCustomModesStore();
  const { getAllAvailableModes } = useCustomModesHelpers();
  const [isOpen, setIsOpen] = useState(false);
  const [isReasoningEffortOpen, setIsReasoningEffortOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [modesView, setModesView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingMode, setEditingMode] = useState<any>(null);
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

  const handleModeSelect = useCallback(
    (modeId: string) => {
      setSelectedMode(modeId);
      setIsModeOpen(false);
      setModesView('list');
      setEditingMode(null);
    },
    [setSelectedMode]
  );

  // Компонент для отдельного режима с долгим нажатием
  const ModeItem = memo(({ mode }: { mode: any }) => {
    const longPressHandlers = useLongPress({
      onLongPress: () => {
        if (mode.id !== 'default' && isCustomModesEnabled) {
          setEditingMode(mode);
          setModesView('edit');
        }
      },
      threshold: 500,
      isMobile: isMobile && mode.id !== 'default' && isCustomModesEnabled,
    });
    
    return (
      <div
        key={mode.id}
        role="button"
        tabIndex={0}
        onClick={() => handleModeSelect(mode.id)}
        onKeyPress={(e) => e.key === 'Enter' && handleModeSelect(mode.id)}
        {...(isMobile && mode.id !== 'default' && isCustomModesEnabled ? longPressHandlers.bind : {})}
        className={cn(
          "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors group cursor-pointer",
          "hover:bg-accent/50",
          selectedMode === mode.id
            ? "bg-accent text-accent-foreground"
            : "text-foreground",
          longPressHandlers.isPressed && "bg-accent/30"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-sm flex-shrink-0">{renderModeIcon(mode.icon)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{mode.name}</div>
            {mode.id === 'default' && mode.systemPrompt && (
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {mode.systemPrompt}
              </div>
            )}
          </div>
          {mode.id !== 'default' && isCustomModesEnabled && (
            <div className={cn(
              "flex items-center gap-1 flex-shrink-0",
              isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMode(mode);
                  setModesView('edit');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    setEditingMode(mode);
                    setModesView('edit');
                  }
                }}
                className="h-6 w-6 cursor-pointer inline-flex items-center justify-center rounded-md hover:bg-accent/50 transition-colors"
              >
                <Edit3 className="h-3 w-3" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });
  
  ModeItem.displayName = 'ModeItem';

  const renderModesContent = () => {
    const availableModes = getAllAvailableModes();
    
    if (modesView === 'list') {
      return (
        <div className={cn("p-3", isMobile && "p-4")}>
          <div className="space-y-1">
            {availableModes.map((mode) => (
              <ModeItem key={mode.id} mode={mode} />
            ))}
          </div>
          {/* Custom Modes Management */}
          {isCustomModesEnabled && (
            <div className="pt-4 border-t">
              <Button 
                onClick={() => setModesView('create')} 
                variant="outline" 
                className="w-full flex items-center gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Add Custom Mode
              </Button>
            </div>
          )}
        </div>
      );
    }
    
    // Render the inline management component
    return (
      <CustomModesManagement 
        view={modesView}
        editingMode={editingMode}
        onBack={() => {
          setModesView('list');
          setEditingMode(null);
        }}
        onModeCreated={() => {
          setModesView('list');
        }}
        onModeUpdated={() => {
          setModesView('list');
          setEditingMode(null);
        }}
      />
    );
  };

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
    <> 
<div className="flex items-center gap-2 overflow-x-auto max-w-full">
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
                <span className="max-w-20 truncate">{selectedModel}</span>
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
                <span className="max-w-32 truncate">{selectedModel}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              'w-64',
              'border border-border/50 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl overflow-x-hidden max-h-[50vh]'
            )}
            align="center"
            side="top"
            sideOffset={12}
            avoidCollisions
          >
            <div className="overflow-y-auto overflow-x-hidden max-h-[45vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/30">
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
      
      {/* Custom Mode Selector */}
      {!isImageGenerationMode && isCustomModesEnabled && (
        isMobile ? (
          // Mobile version with Drawer
          <Drawer 
            open={isModeOpen} 
            onOpenChange={(open: boolean) => {
              setIsModeOpen(open);
            }}
          >
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                aria-label={`Selected mode: ${selectedMode}`}
              >
                <div className="flex items-center gap-1">
                  <div className="flex items-center">{renderModeIcon(getAllAvailableModes().find(m => m.id === selectedMode)?.icon || 'Star')}</div>
                  <span className="max-w-16 truncate">
                    {getAllAvailableModes().find(m => m.id === selectedMode)?.name || 'Default'}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </div>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh] flex flex-col">
              <DrawerHeader className="sr-only">
                <DrawerTitle>Select Mode</DrawerTitle>
              </DrawerHeader>
              
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                {renderModesContent()}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          // Desktop version with DropdownMenu
          <DropdownMenu
            open={isModeOpen}
            onOpenChange={(open: boolean) => {
              setIsModeOpen(open);
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                aria-label={`Selected mode: ${selectedMode}`}
              >
                <div className="flex items-center gap-1">
                  <div className="flex items-center">{renderModeIcon(getAllAvailableModes().find(m => m.id === selectedMode)?.icon || 'Star')}</div>
                  <span className="max-w-20 truncate">
                    {getAllAvailableModes().find(m => m.id === selectedMode)?.name || 'Default'}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn(
                'w-64',
                'border border-border/50 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl overflow-x-hidden max-h-[50vh]'
              )}
              align="center"
              side="top"
              sideOffset={12}
              avoidCollisions
            >
              <div className="overflow-y-auto overflow-x-hidden max-h-[45vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/30">
                {renderModesContent()}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
      </div>

    </>
  );
});

ChatModelDropdown.displayName = 'ChatModelDropdown'; 