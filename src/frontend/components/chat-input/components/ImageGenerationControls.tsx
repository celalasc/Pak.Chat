"use client";

import { ChevronDown } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useChatStore } from '@/frontend/stores/ChatStore';

export const ImageGenerationControls = () => {
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