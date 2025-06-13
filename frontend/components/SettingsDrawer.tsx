"use client"

import { useState, useEffect, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/frontend/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  Palette, 
  Key, 
  Type, 
  Monitor, 
  Sun, 
  Moon,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore, GENERAL_FONTS, CODE_FONTS, THEMES, GeneralFont, CodeFont, Theme } from '@/frontend/stores/SettingsStore';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useTheme } from 'next-themes';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldError, useForm, UseFormRegister } from 'react-hook-form';
import { toast } from 'sonner';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

interface SettingsDrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const formSchema = z.object({
  google: z.string().trim().min(1, {
    message: 'Google API key is required for Title Generation',
  }),
  openrouter: z.string().trim().optional(),
  openai: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SettingsDrawer({ children, isOpen, setIsOpen }: SettingsDrawerProps) {
  const { isMobile, mounted } = useIsMobile(600);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, [setIsOpen]);

  const ContentComponent = ({ className }: { className?: string }) => (
    <div className={cn("flex flex-col gap-4 flex-1 min-h-0", className)}>
      <Tabs defaultValue="customization" className="flex-1 flex flex-col min-h-0">
        <TabsList className={cn("grid w-full flex-shrink-0", isMobile ? "grid-cols-3" : "grid-cols-3")}>
          <TabsTrigger value="customization" className="flex items-center gap-1 text-xs sm:text-sm">
            <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Customization</span>
            <span className="sm:hidden">Style</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Profile</span>
            <span className="xs:hidden">User</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-1 text-xs sm:text-sm">
            <Key className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">API Keys</span>
            <span className="sm:hidden">Keys</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 mt-4 min-h-0 overflow-y-auto scrollbar-none enhanced-scroll">
          <TabsContent value="customization" className={cn("mt-0", isMobile ? "mobile-settings-content" : "")}>
            <CustomizationTab />
          </TabsContent>
          
          <TabsContent value="profile" className={cn("mt-0", isMobile ? "mobile-settings-content" : "")}>
            <ProfileTab />
          </TabsContent>
          
          <TabsContent value="api-keys" className={cn("mt-0", isMobile ? "mobile-settings-content" : "")}>
            <APIKeysTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );

  if (!mounted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
          </DialogHeader>
          <ContentComponent />
        </DialogContent>
      </Dialog>
    );
  }

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
        <DrawerContent className="max-h-[95vh] flex flex-col w-full p-0">
          {/* Pull handle */}
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          
          {/* Header with backdrop blur */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 flex-shrink-0">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Settings
              </DrawerTitle>
            </DrawerHeader>
          </div>
          
          {/* Content area with proper scrolling */}
          <div className="flex-1 min-h-0 px-4 pb-safe overflow-y-auto scrollbar-none enhanced-scroll">
            <ContentComponent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        <ContentComponent />
      </DialogContent>
    </Dialog>
  );
}

const CustomizationTab = () => {
  const { settings, setSettings } = useSettingsStore();
  const { setTheme } = useTheme();

  const handleFontChange = (type: 'generalFont' | 'codeFont', value: GeneralFont | CodeFont) => {
    setSettings({ [type]: value });
  };

  const handleThemeChange = (theme: Theme) => {
    setSettings({ theme });
    setTheme(theme);
  };

  const FontPreview = ({ fontType, font }: { fontType: 'general' | 'code', font: string }) => {
    const getFontFamily = () => {
      if (fontType === 'general') {
        return font === 'Proxima Vara' ? 'Proxima Vara, sans-serif' : 'system-ui, sans-serif';
      } else {
        return font === 'Berkeley Mono' ? 'Berkeley Mono, monospace' : 'ui-monospace, monospace';
      }
    };

    const sampleText = fontType === 'general' 
      ? 'The quick brown fox jumps over the lazy dog'
      : 'function hello() {\n  console.log("Hello, World!");\n}';

    // Применяем шрифт к корневому элементу для немедленного эффекта
    useEffect(() => {
      const root = document.documentElement;
      if (fontType === 'general') {
        if (font === 'Proxima Vara') {
          root.style.setProperty('--font-sans', 'Proxima Vara, sans-serif');
        } else {
          root.style.setProperty('--font-sans', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
        }
      } else {
        if (font === 'Berkeley Mono') {
          root.style.setProperty('--font-mono', 'Berkeley Mono, "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace');
        } else {
          root.style.setProperty('--font-mono', 'ui-monospace, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace');
        }
      }
    }, [font, fontType]);

    return (
      <div 
        className="p-3 bg-muted rounded-md border text-sm"
        style={{ fontFamily: getFontFamily() }}
      >
        {fontType === 'code' ? (
          <pre className="whitespace-pre-wrap">
            <code className="text-blue-600 dark:text-blue-400">function</code>{' '}
            <code className="text-purple-600 dark:text-purple-400">hello</code>
            <code className="text-gray-600 dark:text-gray-400">()</code>{' '}
            <code className="text-gray-600 dark:text-gray-400">{'{'}</code>
            {'\n  '}
            <code className="text-blue-600 dark:text-blue-400">console</code>
            <code className="text-gray-600 dark:text-gray-400">.</code>
            <code className="text-purple-600 dark:text-purple-400">log</code>
            <code className="text-gray-600 dark:text-gray-400">(</code>
            <code className="text-green-600 dark:text-green-400">"Hello, World!"</code>
            <code className="text-gray-600 dark:text-gray-400">);</code>
            {'\n'}
            <code className="text-gray-600 dark:text-gray-400">{'}'}</code>
          </pre>
        ) : (
          sampleText
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-4">
      {/* General Font Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4" />
            General Font
          </CardTitle>
          <CardDescription className="text-sm">
            Choose the font for the general interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {GENERAL_FONTS.map((font) => (
              <Button
                key={font}
                size="sm"
                variant={settings.generalFont === font ? "default" : "outline"}
                onClick={() => handleFontChange('generalFont', font)}
              >
                {font}
              </Button>
            ))}
          </div>
          <FontPreview fontType="general" font={settings.generalFont} />
        </CardContent>
      </Card>

      {/* Code Font Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4" />
            Code Font
          </CardTitle>
          <CardDescription className="text-sm">
            Choose the font for code blocks and programming text
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {CODE_FONTS.map((font) => (
              <Button
                key={font}
                size="sm"
                variant={settings.codeFont === font ? "default" : "outline"}
                onClick={() => handleFontChange('codeFont', font)}
              >
                {font}
              </Button>
            ))}
          </div>
          <FontPreview fontType="code" font={settings.codeFont} />
        </CardContent>
      </Card>

      {/* Theme Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Theme
          </CardTitle>
          <CardDescription className="text-sm">
            Choose between light and dark theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={settings.theme === 'light' ? "default" : "outline"}
              onClick={() => handleThemeChange('light')}
              className="flex items-center gap-2"
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              size="sm"
              variant={settings.theme === 'dark' ? "default" : "outline"}
              onClick={() => handleThemeChange('dark')}
              className="flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ProfileTab = () => {
  return (
    <div className="space-y-6 pb-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription className="text-sm">
            Manage your profile and account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Guest User</p>
              <p className="text-xs text-muted-foreground">Not signed in</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="blur-data" className="text-sm font-medium">
                Privacy Settings
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Control how your personal data is displayed
              </p>
            </div>
            
            <Button variant="outline" size="sm" className="w-full">
              Sign in with Google
            </Button>
            
            <Button variant="outline" size="sm" className="w-full" disabled>
              Blur Personal Data
            </Button>
            
            <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700" disabled>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const APIKeysTab = () => {
  const { keys, setKeys } = useAPIKeyStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: keys,
  });

  useEffect(() => {
    reset(keys);
  }, [keys, reset]);

  const onSubmit = useCallback(
    (values: FormValues) => {
      setKeys(values);
      toast.success('API keys saved successfully');
    },
    [setKeys]
  );

  return (
    <div className="space-y-6 pb-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            API Keys
          </CardTitle>
          <CardDescription className="text-sm">
            Keys are stored locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <ApiKeyField
              id="google"
              label="Google API Key"
              models={['Gemini 2.5 Flash', 'Gemini 2.5 Pro']}
              linkUrl="https://aistudio.google.com/apikey"
              placeholder="AIza..."
              register={register}
              error={errors.google}
              required
            />

            <ApiKeyField
              id="openrouter"
              label="OpenRouter API Key"
              models={['DeepSeek R1 0538', 'DeepSeek-V3']}
              linkUrl="https://openrouter.ai/settings/keys"
              placeholder="sk-or-..."
              register={register}
              error={errors.openrouter}
            />

            <ApiKeyField
              id="openai"
              label="OpenAI API Key"
              models={['GPT-4o', 'GPT-4.1-mini']}
              linkUrl="https://platform.openai.com/settings/organization/api-keys"
              placeholder="sk-..."
              register={register}
              error={errors.openai}
            />

            <Button type="submit" className="w-full" disabled={!isDirty} size="sm">
              Save API Keys
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

interface ApiKeyFieldProps {
  id: string;
  label: string;
  linkUrl: string;
  models: string[];
  placeholder: string;
  error?: FieldError | undefined;
  required?: boolean;
  register: UseFormRegister<FormValues>;
}

const ApiKeyField = ({
  id,
  label,
  linkUrl,
  placeholder,
  models,
  error,
  required,
  register,
}: ApiKeyFieldProps) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={id} className="flex gap-1 text-sm">
      <span>{label}</span>
      {required && <span className="text-muted-foreground"> (Required)</span>}
    </Label>
    <div className="flex gap-1 flex-wrap">
      {models.map((model) => (
        <Badge key={model} variant="secondary" className="text-xs">{model}</Badge>
      ))}
    </div>

    <Input
      id={id}
      placeholder={placeholder}
      {...register(id as keyof FormValues)}
      className={cn("text-sm", error ? 'border-red-500' : '')}
    />

    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-500 hover:underline inline w-fit"
    >
      Create {label.split(' ')[0]} API Key
    </a>

    {error && (
      <p className="text-xs font-medium text-red-500">{error.message}</p>
    )}
  </div>
); 