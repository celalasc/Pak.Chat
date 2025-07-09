"use client";

import { useState } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { cn } from '@/lib/utils';

const ImageGenerationMobileDrawer = () => {
  const { imageGenerationParams, setImageGenerationParams } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  
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
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-foreground hover:bg-accent/50"
          aria-label="Image generation settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[70vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle className="text-center">Image Generation Settings</DrawerTitle>
        </DrawerHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {/* Quality Setting */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Quality</label>
            <div className="grid grid-cols-2 gap-2">
              {qualityOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={imageGenerationParams.quality === option.value ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setImageGenerationParams({ quality: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Size Setting */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Size</label>
            <div className="grid grid-cols-2 gap-2">
              {sizeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={imageGenerationParams.size === option.value ? "default" : "outline"}
                  className="h-10 text-xs"
                  onClick={() => setImageGenerationParams({ size: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Count Setting */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Number of Images</label>
            <div className="grid grid-cols-4 gap-2">
              {countOptions.map((count) => (
                <Button
                  key={count}
                  variant={imageGenerationParams.count === count ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setImageGenerationParams({ count })}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          {/* Format Setting */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {formatOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={imageGenerationParams.format === option.value ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setImageGenerationParams({ format: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export const ImageGenerationControls = () => {
  const { imageGenerationParams, setImageGenerationParams } = useChatStore();
  const { isMobile } = useIsMobile();
  
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

  // Mobile version with drawer
  if (isMobile) {
    return <ImageGenerationMobileDrawer />;
  }
  
  // Desktop version (original)
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