"use client"

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
// use-debounce provides a debounced callback hook to prevent rapid state changes
import { useDebouncedCallback } from 'use-debounce';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/frontend/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatedTabs } from '@/frontend/components/ui/animated-tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from './ui/textarea';
import {
  Settings,
  Palette,
  Key,
  Type,
  Monitor,
  Sun,
  Moon,
  User,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Bot,
  MessageSquare,
  Brain,
  Languages,
  Code,
  FileText,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore, useSettingsSync, GENERAL_FONTS, CODE_FONTS, THEMES, GeneralFont, CodeFont, Theme, CustomInstructions } from '@/frontend/stores/SettingsStore';
import { useAPIKeyStore, Provider } from '@/frontend/stores/APIKeyStore';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';
import { useModelVisibilitySync } from '@/frontend/hooks/useModelVisibilitySync';
import { ProviderIcon } from '@/frontend/components/ui/provider-icons';
import { getModelsByProvider, getModelConfig, AIModel } from '@/lib/models';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldError, useForm, UseFormRegister } from 'react-hook-form';
import { toast } from 'sonner';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { Switch } from '@/frontend/components/ui/switch';
import { CustomSwitch } from '@/frontend/components/ui/custom-switch';
import { copyText } from '@/lib/copyText';

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
  groq: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContentComponentProps {
  className?: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobile: boolean;
  tabs: { value: string; label: string; icon: string }[];
  getTabIcon: (iconName: string) => React.ReactNode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

const ContentComponent = memo(function ContentComponent({
  className,
  activeTab,
  setActiveTab,
  isMobile,
  tabs,
  getTabIcon,
  scrollRef,
}: ContentComponentProps) {
  return (
    <div className={cn('flex gap-4 flex-1 min-h-0', className)}>
      {isMobile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full flex-shrink-0 grid-cols-4">
            <TabsTrigger value="customization" className="flex items-center gap-1 text-xs">
              <Palette className="h-3 w-3" />
              <span className="hidden xs:inline">Style</span>
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-1 text-xs">
              <Bot className="h-3 w-3" />
              <span className="hidden xs:inline">Models</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-1 text-xs">
              <User className="h-3 w-3" />
              <span className="hidden xs:inline">User</span>
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-1 text-xs">
              <Key className="h-3 w-3" />
              <span className="hidden xs:inline">Keys</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 min-h-0 overflow-y-auto scrollbar-none enhanced-scroll mobile-keyboard-fix">
            <div className="p-4">
              {activeTab === 'customization' && <CustomizationTab />}
              {activeTab === 'models' && <ModelsTab />}
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'api-keys' && <APIKeysTab />}
            </div>
          </div>
        </Tabs>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex flex-col w-48 flex-shrink-0">
            <AnimatedTabs
              tabs={tabs.map((tab) => ({ ...tab, icon: getTabIcon(tab.icon) }))}
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            />
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-none enhanced-scroll pl-4">
            <div className="scroll-auto" style={{ scrollBehavior: 'auto', overscrollBehavior: 'contain' }}>
              {activeTab === 'customization' && <CustomizationTab />}
              {activeTab === 'models' && <ModelsTab />}
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'api-keys' && <APIKeysTab />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ContentComponent.displayName = 'ContentComponent';

const SettingsDrawerComponent = ({ children, isOpen, setIsOpen }: SettingsDrawerProps) => {
  const { isMobile, mounted } = useIsMobile(900);
  const [activeTab, setActiveTab] = useState("customization");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setActiveTab('customization');
    }
  }, [setIsOpen, setActiveTab]);

  // Отдельный обработчик для управления мобильным эффектом
  const handleMobileEffect = useCallback((shouldApply: boolean) => {
    if (!isMobile) return;
    
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent) return;

    if (shouldApply) {
      mainContent.classList.add('mobile-settings-active');
    } else {
      mainContent.classList.remove('mobile-settings-active');
      // Сбрасываем inline стили
      if (mainContent.style) {
        (mainContent as any).style.transform = '';
        (mainContent as any).style.borderRadius = '';
      }
    }
  }, [isMobile]);

  // Prevent body scroll when drawer is open and apply mobile effect
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      handleMobileEffect(true);
    } else {
      // Re-enable scrolling when drawer closes
      document.body.style.overflow = 'auto';
      handleMobileEffect(false);
    }
    
    return () => {
      document.body.style.overflow = 'auto';
      handleMobileEffect(false);
    };
  }, [isOpen, handleMobileEffect]);

  // Мемоизируем tabs чтобы они не пересоздавались при каждом рендере
  const tabs = useMemo(() => [
    {
      value: "customization",
      label: "Customization",
      icon: "palette"
    },
    {
      value: "models",
      label: "Models",
      icon: "bot"
    },
    {
      value: "profile", 
      label: "Profile",
      icon: "user"
    },
    {
      value: "api-keys",
      label: "API Keys", 
      icon: "key"
    }
  ], []);

  // Функция для получения иконки по строковому идентификатору
  const getTabIcon = useCallback((iconName: string) => {
    switch (iconName) {
      case 'palette':
        return <Palette className="h-4 w-4" />;
      case 'bot':
        return <Bot className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'key':
        return <Key className="h-4 w-4" />;
      default:
        return null;
    }
  }, []);


  if (!mounted) {
    return null; // Don't render anything until mounted
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile overlay */}
        <div className={cn(
          "mobile-settings-overlay",
          isOpen && "active"
        )} onClick={() => handleOpenChange(false)} />
        
              <Drawer 
          open={isOpen} 
          onOpenChange={handleOpenChange}
          shouldScaleBackground={false}
          dismissible={true}
          modal={true}
          onDrag={(event, percentageDragged) => {
            // Синхронизируем анимацию заднего фона с процентом перетаскивания
            if (isMobile && percentageDragged > 0) {
              const mainContent = document.querySelector('.main-content') as HTMLElement;
              if (mainContent && mainContent.style) {
                const progress = Math.max(0, 1 - percentageDragged);
                const translateY = 30 * progress;
                const scale = 0.95 + (0.05 * (1 - progress));
                const borderRadius = 15 * progress;
                
                (mainContent as any).style.transform = `translateY(${translateY}px) scale(${scale})`;
                (mainContent as any).style.borderRadius = `${borderRadius}px`;
              }
            }
          }}
          onClose={() => {
            // Убираем эффект при закрытии
            handleMobileEffect(false);
          }}
        >
          <DrawerTrigger asChild>
            {children}
          </DrawerTrigger>
          <DrawerContent className="max-h-[calc(50dvh-15px)] flex flex-col w-full p-0">
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
            <ContentComponent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isMobile={isMobile}
              tabs={tabs}
              getTabIcon={getTabIcon}
              scrollRef={scrollRef}
            />
          </div>
        </DrawerContent>
      </Drawer>
      </>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[55vw] sm:max-w-none max-w-[585px] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure your application settings, profile, and API keys
          </DialogDescription>
        </DialogHeader>
        <ContentComponent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobile={isMobile}
          tabs={tabs}
          getTabIcon={getTabIcon}
          scrollRef={scrollRef}
        />
      </DialogContent>
    </Dialog>
  );
};

const CustomizationTab = memo(() => {
  const { settings, setSettings } = useSettingsStore();
  const { setTheme } = useTheme();
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const { isMobile } = useIsMobile();

  // Мемоизируем обработчики чтобы предотвратить ненужные перерендеры
  const handleFontChange = useCallback((type: 'generalFont' | 'codeFont', value: GeneralFont | CodeFont) => {
    setSettings({ [type]: value });
  }, [setSettings]);

  const handleThemeChange = useCallback((theme: Theme) => {
    setSettings({ theme });
    setTheme(theme);
  }, [setSettings, setTheme]);

  const handleSwitchChange = useCallback((setting: string, value: boolean) => {
    setSettings({ [setting]: value });
  }, [setSettings]);

  const toggleFeaturesExpanded = useCallback(() => {
    setFeaturesExpanded(prev => !prev);
  }, []);

  // Мемоизируем FontPreview чтобы он не пересоздавался
  const FontPreview = useCallback(({ fontType, font }: { fontType: 'general' | 'code', font: string }) => {
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
  }, []);

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

      {/* Additional Features */}
      <Card>
        <CardHeader 
          className="cursor-pointer" 
          onClick={toggleFeaturesExpanded}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Features
            </div>
            {featuresExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            Enable or disable experimental options
          </CardDescription>
        </CardHeader>
        {featuresExpanded && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="navbars" className="text-sm">Show navigation bars</Label>
              <Switch
                id="navbars"
                checked={settings.showNavBars}
                onCheckedChange={(v) => handleSwitchChange('showNavBars', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="chat-preview" className={cn('text-sm', isMobile && 'text-muted-foreground')}>
                Show chat preview
              </Label>
              {isMobile ? (
                <span className="text-muted-foreground text-xs select-none">Only For PC</span>
              ) : (
                <Switch
                  id="chat-preview"
                  checked={settings.showChatPreview}
                  onCheckedChange={(v) => handleSwitchChange('showChatPreview', v)}
                />
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
});

CustomizationTab.displayName = 'CustomizationTab';

const ProfileTab = memo(() => {
  const { user, login, logout, blurPersonalData, toggleBlur, loading } = useAuthStore();

  const handleLogout = useCallback(async () => {
    await logout();
    toast.success("You have been signed out.");
  }, [logout]);

  const handleLogin = useCallback(async () => {
    await login();
  }, [login]);

  return (
    <div className="space-y-6 pb-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription className="text-sm">
            Manage your profile and account settings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
             <p className="text-sm text-muted-foreground text-center">Loading profile...</p>
          ) : user ? (
            <>
              <div className="flex items-center gap-4">
                {user.photoURL && (
                   <Image
                      src={user.photoURL}
                      alt="User Avatar"
                      width={64}
                      height={64}
                      className={cn(
                        "size-16 rounded-full object-cover transition-all",
                        blurPersonalData && "blur-md"
                      )}
                   />
                )}
                <div className="flex-1 space-y-1">
                  <p className={cn("text-sm font-medium transition-all", blurPersonalData && "blur-sm")}>
                    {user.displayName || 'No Name'}
                  </p>
                  <p className={cn("text-xs text-muted-foreground transition-all", blurPersonalData && "blur-sm")}>
                    {user.email || 'No Email'}
                  </p>
                </div>
              </div>

              <Button size="sm" variant="outline" className="w-full" onClick={toggleBlur}>
                {blurPersonalData ? 'Show Personal Data' : 'Hide Personal Data'}
              </Button>
              <Button size="sm" variant="destructive" className="w-full" onClick={handleLogout}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleLogin}
              disabled={loading}
            >
              Sign In with Google
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

ProfileTab.displayName = 'ProfileTab';

const APIKeysTab = memo(() => {
  const { keys, setKeys, keysLoading } = useAPIKeyStore();
  const [apiKeysExpanded, setApiKeysExpanded] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: keys,
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = form;

  // Сбрасываем форму только при первой загрузке ключей, предотвращаем циклические обновления
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!keysLoading && !isInitializedRef.current) {
      form.reset(keys);
      isInitializedRef.current = true;
    }
  }, [keysLoading, keys, form]);

  const onSubmit = useCallback(
    (values: FormValues) => {
      setKeys(values);
      toast.success('API keys saved successfully');
    },
    [setKeys]
  );

  const toggleApiKeysExpanded = useCallback(() => {
    setApiKeysExpanded(prev => !prev);
  }, []);

  return (
    <div className="space-y-6 pb-4">
      <Card>
        <CardHeader 
          className="cursor-pointer" 
          onClick={toggleApiKeysExpanded}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
            </div>
            {apiKeysExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            API keys are securely stored and encrypted in the cloud
          </CardDescription>
        </CardHeader>
        {apiKeysExpanded && (
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
              models={['GPT-4o', 'GPT-4.1-mini', 'GPT-4.1', 'GPT-4.1-nano', 'o4-mini', 'o3']}
              linkUrl="https://platform.openai.com/settings/organization/api-keys"
              placeholder="sk-..."
              register={register}
              error={errors.openai}
            />

            <ApiKeyField
              id="groq"
              label="Groq API Key"
              models={['Meta Llama 4 Scout 17B', 'Meta Llama 4 Maverick 17B', 'DeepSeek R1 Distill Llama 70B', 'Qwen QwQ 32B', 'Qwen 3 32B']}
              linkUrl="https://console.groq.com/keys"
              placeholder="gsk_..."
              register={register}
              error={errors.groq}
            />

            <Button type="submit" className="w-full" disabled={!isDirty || keysLoading} size="sm">
              Save API Keys
            </Button>
          </form>
        </CardContent>
        )}
      </Card>
    </div>
  );
});

APIKeysTab.displayName = 'APIKeysTab';

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
}: ApiKeyFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Получаем значение из формы при инициализации
  const { keys } = useAPIKeyStore();
  
  useEffect(() => {
    const currentValue = keys[id as keyof typeof keys] || '';
    setInputValue(currentValue);
  }, [keys, id]);

  const getProviderIcon = () => {
    return <ProviderIcon provider={id as any} className="h-4 w-4" />;
  };

  const handleCopy = useCallback(async () => {
    if (inputValue.trim()) {
      try {
        await copyText(inputValue.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  }, [inputValue]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm">
        {getProviderIcon()}
        <span>{label}</span>
        {required && <span className="text-muted-foreground"> (Required)</span>}
      </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => window.open(linkUrl, '_blank')}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Get Key
        </Button>
      </div>
      
      <div className="flex gap-1 flex-wrap">
        {models.map((model) => (
          <Badge key={model} variant="secondary" className="text-xs">{model}</Badge>
        ))}
      </div>

      <div className="relative">
      <Input
        id={id}
          type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        {...register(id as keyof FormValues)}
          className={cn("text-sm w-full min-w-0 pr-20", error ? 'border-red-500' : '')}
        style={{ fontSize: '16px' }} // Prevents zoom on mobile
          onChange={(e) => {
            const value = e.target.value;
            setInputValue(value);
            register(id as keyof FormValues).onChange(e);
          }}
        />
        
        {inputValue.trim() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-medium text-red-500">{error.message}</p>
      )}
    </div>
  );
}; 

const ModelsTab = memo(() => {
  const { settings, setSettings } = useSettingsStore();
  const { saveCustomInstructionsManually } = useSettingsSync();
  const [customInstructionsExpanded, setCustomInstructionsExpanded] = useState(false);
  const [modelVisibilityExpanded, setModelVisibilityExpanded] = useState(false);
  const [currentTraitInput, setCurrentTraitInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [originalCustomInstructions, setOriginalCustomInstructions] = useState<CustomInstructions | null>(null);
  
  // Ensure customInstructions exists with default values
  const customInstructions = {
    name: settings.customInstructions?.name || '',
    occupation: settings.customInstructions?.occupation || '',
    traits: settings.customInstructions?.traits || [],
    traitsText: settings.customInstructions?.traitsText || '',
    additionalInfo: settings.customInstructions?.additionalInfo || '',
  };

  // Инициализируем originalCustomInstructions только при первом открытии секции
  useEffect(() => {
    if (customInstructionsExpanded && !originalCustomInstructions) {
      setOriginalCustomInstructions({ ...customInstructions });
      setCurrentTraitInput(customInstructions.traitsText); // Инициализируем поле ввода из traitsText
    }
  }, [customInstructionsExpanded, originalCustomInstructions, customInstructions]);

  // Сброс originalCustomInstructions при закрытии секции
  useEffect(() => {
    if (!customInstructionsExpanded) {
      setOriginalCustomInstructions(null);
    }
  }, [customInstructionsExpanded]);

  // Проверяем, есть ли несохраненные изменения
  const hasUnsavedChanges = useMemo(() => {
    if (!originalCustomInstructions) {
      return false;
    }
    
    const current = customInstructions;
    const original = originalCustomInstructions;
    
    const nameChanged = current.name !== original.name;
    const occupationChanged = current.occupation !== original.occupation;
    const additionalInfoChanged = current.additionalInfo !== original.additionalInfo;
    const traitsChanged = JSON.stringify(current.traits.sort()) !== JSON.stringify(original.traits.sort());
    const traitsTextChanged = current.traitsText !== original.traitsText;
    const hasTraitInput = currentTraitInput.trim().length > 0; // Учитываем текст в поле ввода
    
    return nameChanged || occupationChanged || additionalInfoChanged || traitsChanged || traitsTextChanged || hasTraitInput;
  }, [customInstructions, originalCustomInstructions, currentTraitInput]);
  
  const modelsByProvider = getModelsByProvider();
  const {
    toggleProvider,
    toggleFavoriteModel,
    isProviderEnabled,
    isFavoriteModel,
  } = useModelVisibilityStore();
  
  const { saveToConvex } = useModelVisibilitySync();

  // Обработчики для кастомных инструкций
  const handleCustomInstructionsChange = useCallback((field: keyof CustomInstructions, value: string | string[]) => {
    setSettings({
      customInstructions: {
        ...customInstructions,
        [field]: value
      }
    });
  }, [customInstructions, setSettings]);

  const handleTraitToggle = useCallback((trait: string) => {
    const currentTraits = customInstructions.traits || [];
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait];
    
    handleCustomInstructionsChange('traits', newTraits);
  }, [customInstructions.traits, handleCustomInstructionsChange]);

  const handleCustomTraitAdd = useCallback((traitsInput: string) => {
    const currentTraits = customInstructions.traits || [];
    // Split by comma and process each trait
    const newTraits = traitsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t && t.length <= 50 && !currentTraits.includes(t))
      .slice(0, 50 - currentTraits.length); // Ensure we don't exceed 50 traits total
    
    if (newTraits.length > 0) {
      handleCustomInstructionsChange('traits', [...currentTraits, ...newTraits]);
    }
  }, [customInstructions.traits, handleCustomInstructionsChange]);

  // Обработчики с автосохранением и предотвращением дублирования вызовов
  const handleToggleProvider = useCallback((provider: Provider) => {
    try {
      toggleProvider(provider);
    } catch (error) {
      console.error('Failed to toggle provider:', error);
    }
  }, [toggleProvider]);

  const handleToggleFavoriteModel = useCallback((model: AIModel) => {
    try {
      toggleFavoriteModel(model);
    } catch (error) {
      console.error('Failed to toggle favorite model:', error);
    }
  }, [toggleFavoriteModel]);

  const toggleCustomInstructionsExpanded = useCallback(() => {
    setCustomInstructionsExpanded(prev => !prev);
  }, []);

  const toggleModelVisibilityExpanded = useCallback(() => {
    setModelVisibilityExpanded(prev => !prev);
  }, []);

  // Функция для сохранения кастомных инструкций
  const handleSaveCustomInstructions = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      const success = await saveCustomInstructionsManually();
      if (success) {
        // Обновляем originalCustomInstructions после успешного сохранения
        setOriginalCustomInstructions({ ...customInstructions });
        toast.success('Custom instructions saved successfully!');
      } else {
        toast.error('Failed to save custom instructions. User not authenticated.');
      }
    } catch (error) {
      console.error('Error saving custom instructions:', error);
      // Более детальное сообщение об ошибке
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }, [saveCustomInstructionsManually, customInstructions, hasUnsavedChanges, isSaving, currentTraitInput, setSettings]);

  return (
    <div className="space-y-6 pb-4">
      {/* Custom Instructions Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer" 
          onClick={toggleCustomInstructionsExpanded}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Custom Instructions
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved
                </Badge>
              )}
            </div>
            {customInstructionsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            Customize how AI interacts with you and what it remembers about your preferences
          </CardDescription>
        </CardHeader>
        {customInstructionsExpanded && (
          <CardContent className="space-y-6">
          {/* What should Pak.Chat call you? */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-medium">
              What should Pak.Chat call you?
            </Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="Enter your name"
                value={customInstructions.name}
                onChange={(e) => {
                  if (e.target.value.length <= 50) {
                    handleCustomInstructionsChange('name', e.target.value);
                  }
                }}
                className="pr-16 border-none bg-muted/30 focus-visible:ring-0 focus-visible:ring-offset-0"
                maxLength={50}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {customInstructions.name.length}/50
              </span>
            </div>
          </div>

          {/* What do you do? */}
          <div className="space-y-3">
            <Label htmlFor="occupation" className="text-sm font-medium">
              What do you do?
            </Label>
            <div className="relative">
              <Input
                id="occupation"
                placeholder="Engineer, student, etc."
                value={customInstructions.occupation}
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    handleCustomInstructionsChange('occupation', e.target.value);
                  }
                }}
                className="pr-20 border-none bg-muted/30 focus-visible:ring-0 focus-visible:ring-offset-0"
                maxLength={100}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {customInstructions.occupation.length}/100
              </span>
            </div>
          </div>

          {/* What traits should Pak.Chat have? */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              What traits should Pak.Chat have? <span className="text-xs text-muted-foreground">(up to 50, max 100 chars each)</span>
            </Label>
            
            <div className="space-y-3">
              {/* Custom trait input with embedded badges */}
              <div className="relative">
                <div className="w-full bg-muted/30 rounded-md">
                  {/* Display existing traits as badges */}
                  {(customInstructions.traits || []).length > 0 && (
                    <div className="px-3 pt-2 pb-1">
                      <div className="flex flex-wrap gap-1">
                        {(customInstructions.traits || []).map((trait, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="cursor-pointer hover:bg-muted hover:text-muted-foreground h-6 text-xs"
                            onClick={() => handleTraitToggle(trait)}
                          >
                            <span>{trait}</span>
                            <span className="ml-1 text-xs">×</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Input field - always at the bottom */}
                  <div className={cn(
                    "px-3 pb-3",
                    (customInstructions.traits || []).length > 0 ? "pt-1" : "pt-3"
                  )}>
                    <input
                      type="text"
                      placeholder={
                        (customInstructions.traits || []).length === 0 
                          ? "Type a trait and press Enter or Tab..." 
                          : "Add another trait..."
                      }
                      value={currentTraitInput}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setCurrentTraitInput(newValue);
                        // Сразу обновляем traitsText в настройках
                        handleCustomInstructionsChange('traitsText', newValue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !currentTraitInput && (customInstructions.traits || []).length > 0) {
                          // Remove last trait when backspace is pressed and input is empty
                          const currentTraits = customInstructions.traits || [];
                          const newTraits = currentTraits.slice(0, -1);
                          handleCustomInstructionsChange('traits', newTraits);
                        }
                      }}
                      className="w-full h-8 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground pr-12"
                      style={{ boxShadow: 'none' }}
                    />
                  </div>
                </div>
                <span className="absolute right-3 bottom-3 text-xs text-muted-foreground pointer-events-none">
                  {currentTraitInput.length}/100
                </span>
              </div>

              {/* Predefined traits */}
              <div className="flex gap-2 flex-wrap">
                {['friendly', 'witty', 'concise', 'curious', 'empathetic', 'creative', 'patient'].map((trait) => (
                  <Button
                    key={trait}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentTraits = customInstructions.traits || [];
                      if (!currentTraits.includes(trait)) {
                        handleCustomInstructionsChange('traits', [...currentTraits, trait]);
                      }
                    }}
                    className="text-xs h-7 px-3 hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                    disabled={(customInstructions.traits || []).includes(trait)}
                  >
                    <span>{trait}</span>
                    <span className="ml-1">+</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Anything else Pak.Chat should know about you? */}
          <div className="space-y-3">
            <Label htmlFor="additional-info" className="text-sm font-medium">
              Anything else Pak.Chat should know about you?
            </Label>
            <div className="relative">
              <Textarea
                id="additional-info"
                placeholder="Interests, values, or preferences to keep in mind"
                value={customInstructions.additionalInfo}
                onChange={(e) => {
                  if (e.target.value.length <= 3000) {
                    handleCustomInstructionsChange('additionalInfo', e.target.value);
                  }
                }}
                className="h-[120px] resize-none pr-20 break-words whitespace-pre-wrap overflow-y-auto border-none bg-muted/30 focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                maxLength={3000}
              />
              <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
                {customInstructions.additionalInfo.length}/3000
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="text-xs text-muted-foreground">
              {hasUnsavedChanges ? 'You have unsaved changes' : 'All changes saved'}
            </div>
            <Button
              onClick={handleSaveCustomInstructions}
              disabled={!hasUnsavedChanges || isSaving}
              size="sm"
              className="min-w-[80px]"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
        )}
      </Card>

      {/* Model Visibility Section - Collapsible */}
      <Card>
        <CardHeader 
          className="cursor-pointer" 
          onClick={toggleModelVisibilityExpanded}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Model Visibility
            </div>
            {modelVisibilityExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            Select which models appear in your favorites and which providers are enabled
          </CardDescription>
        </CardHeader>
        {modelVisibilityExpanded && (
        <CardContent className="space-y-6">
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <ProviderSection
              key={provider}
              provider={provider as any}
              models={models}
              isEnabled={isProviderEnabled(provider as any)}
              onToggleProvider={() => handleToggleProvider(provider as any)}
              onToggleFavoriteModel={handleToggleFavoriteModel}
              isFavoriteModel={isFavoriteModel}
            />
          ))}
        </CardContent>
        )}
      </Card>
    </div>
  );
});

ModelsTab.displayName = 'ModelsTab';

interface ProviderSectionProps {
  provider: Provider;
  models: AIModel[];
  isEnabled: boolean;
  onToggleProvider: () => void;
  onToggleFavoriteModel: (model: AIModel) => void;
  isFavoriteModel: (model: AIModel) => boolean;
}

const ProviderSection = memo(({
  provider,
  models,
  isEnabled,
  onToggleProvider,
  onToggleFavoriteModel,
  isFavoriteModel,
}: ProviderSectionProps) => {
  // Provider sections start collapsed to avoid a cluttered UI
  const [isExpanded, setIsExpanded] = useState(false);
  const { getKey } = useAPIKeyStore();
  // Provider is considered active only when user has an API key for it
  const providerHasKey = !!getKey(provider);
  
  const providerNames = {
    google: 'Google',
    openai: 'OpenAI',
    openrouter: 'OpenRouter',
    groq: 'Groq',
  };

  return (
    <div className="space-y-3">
      {/* Закрепленный заголовок провайдера */}
      <div
        className={cn(
          "bg-background/95 backdrop-blur-sm z-10 pb-2",
          !providerHasKey && "opacity-60"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProviderIcon provider={provider} className="h-4 w-4" />
            <span className="font-medium text-sm">{providerNames[provider]}</span>
            <Badge variant="secondary" className="text-xs">
              {models.length} models
            </Badge>
          </div>
          <div className={cn('flex items-center gap-2', !providerHasKey && 'pointer-events-none')}>
            <CustomSwitch
              checked={isEnabled}
              onCheckedChange={onToggleProvider}
              id={`provider-${provider}`}
              disabled={!providerHasKey}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Скроллируемый список моделей */}
      {isExpanded && (
        <div className="ml-6 space-y-2">
          {models.map((model) => (
            <ModelRow
              key={model}
              model={model}
              isProviderEnabled={isEnabled && providerHasKey}
              isFavoriteModel={isFavoriteModel(model)}
              onToggleFavoriteModel={() => onToggleFavoriteModel(model)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

ProviderSection.displayName = 'ProviderSection';

interface ModelRowProps {
  model: AIModel;
  isProviderEnabled: boolean;
  isFavoriteModel: boolean;
  onToggleFavoriteModel: () => void;
}

const ModelRow = memo(({
  model,
  isProviderEnabled,
  isFavoriteModel,
  onToggleFavoriteModel,
}: ModelRowProps) => {
  // Убираем дебаунсинг - он вызывает проблемы с отменой выбора
  // const debouncedToggle = useDebouncedCallback(onToggleFavoriteModel, 300);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onToggleFavoriteModel();
  }, [onToggleFavoriteModel]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
        isFavoriteModel && "bg-primary/10 border-primary/20",
        !isProviderEnabled && "opacity-60"
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e as any);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{model}</span>
        {!isProviderEnabled && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            No API key
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Favourite toggle */}
        {isFavoriteModel && (
          <Check className="h-4 w-4 text-primary" />
        )}
      </div>
    </div>
  );
});

ModelRow.displayName = 'ModelRow';

const SettingsDrawerMemo = memo(SettingsDrawerComponent);
SettingsDrawerMemo.displayName = 'SettingsDrawer';

export default SettingsDrawerMemo;

