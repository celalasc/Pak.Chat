"use client"

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
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
// @ts-ignore - Convex module issue
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
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

          <div className="flex-1 mt-4 min-h-0 overflow-y-auto scrollbar-none relative">
            <div className="p-4 pb-20">
              {activeTab === 'customization' && <CustomizationTab />}
              {activeTab === 'models' && <ModelsTab />}
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'api-keys' && <APIKeysTab />}
            </div>
          </div>
        </Tabs>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col w-48 flex-shrink-0">
            <AnimatedTabs
              tabs={tabs.map((tab) => ({ ...tab, icon: getTabIcon(tab.icon) }))}
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            />
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-none pl-4 pr-4 relative">
            <div className="pb-20">
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
  const { isMobile, mounted } = useIsMobile(768);
  const [activeTab, setActiveTab] = useState("customization");
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetDrawerState = useCallback(() => {
    setActiveTab('customization');
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);

      if (!open) {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }

        // Delay reset to avoid flicker before close animation completes
        closeTimeoutRef.current = setTimeout(() => {
          resetDrawerState();
          closeTimeoutRef.current = null;
        }, 200);
      } else if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    },
    [setIsOpen, resetDrawerState]
  );

  // Clear pending timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Mobile background effect handler
  const handleMobileEffect = useCallback((shouldApply: boolean) => {
    if (!isMobile) return;
    
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent) return;

    if (shouldApply) {
      mainContent.style.transform = 'translateY(20px) scale(0.95)';
      mainContent.style.borderRadius = '20px';
      mainContent.style.overflow = 'hidden';
    } else {
      mainContent.style.transform = '';
      mainContent.style.borderRadius = '';
      mainContent.style.overflow = '';
    }
  }, [isMobile]);

  // Apply mobile effect when drawer state changes
  useEffect(() => {
    if (isMobile) {
      handleMobileEffect(isOpen);
    }
    
    return () => {
      if (isMobile) {
        handleMobileEffect(false);
      }
    };
  }, [isOpen, isMobile, handleMobileEffect]);

  // Tabs configuration
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

  // Icon mapping function
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
    return null;
  }

  if (isMobile) {
    return (
      <Drawer 
        open={isOpen} 
        onOpenChange={handleOpenChange}
        shouldScaleBackground={false}
      >
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
        <DrawerContent className="h-[85vh] max-h-[600px] flex flex-col">
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Settings
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="flex-1 min-h-0 px-4 pb-6 overflow-y-auto -webkit-overflow-scrolling-touch">
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
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[50vw] sm:max-w-none max-w-[520px] h-[65vh] flex flex-col rounded-3xl overflow-hidden">
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
          className="overflow-hidden"
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

  // Font Preview Component
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
    <div className="space-y-6">
      {/* General Font */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4" />
            General Font
          </CardTitle>
          <CardDescription className="text-sm">
            Choose the font family for text throughout the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {GENERAL_FONTS.map((font) => (
              <Button
                key={font}
                size="sm"
                variant={settings.generalFont === font ? "default" : "outline"}
                onClick={() => handleFontChange('generalFont', font)}
                className="flex items-center gap-2"
              >
                {font === 'System Font' ? (
                  <>
                    <Monitor className="h-4 w-4" />
                    System font
                  </>
                ) : (
                  <>
                    <Type className="h-4 w-4" />
                    Proxima Vara
                  </>
                )}
              </Button>
            ))}
          </div>
          <FontPreview fontType="general" font={settings.generalFont} />
        </CardContent>
      </Card>

      {/* Code Font */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-4 w-4" />
            Code Font
          </CardTitle>
          <CardDescription className="text-sm">
            Choose the font family for code blocks and monospace text
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {CODE_FONTS.map((font) => (
              <Button
                key={font}
                size="sm"
                variant={settings.codeFont === font ? "default" : "outline"}
                onClick={() => handleFontChange('codeFont', font)}
                className="flex items-center gap-2"
              >
                {font === 'System Monospace Font' ? (
                  <>
                    <Monitor className="h-4 w-4" />
                    System monospace
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4" />
                    Berkeley Mono
                  </>
                )}
              </Button>
            ))}
          </div>
          <FontPreview fontType="code" font={settings.codeFont} />
        </CardContent>
      </Card>

      {/* Theme */}
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

      {/* Features */}
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
  const { user, loading, blurPersonalData, toggleBlur } = useAuthStore();

  const handleLogin = useCallback(async () => {
    const auth = useAuthStore.getState();
    await auth.login();
  }, []);

  const handleLogout = useCallback(async () => {
    const auth = useAuthStore.getState();
    await auth.logout();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription className="text-sm">
            Your account information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Image
                    src={user.photoURL || '/placeholder-avatar.png'}
                    alt="Profile"
                    width={48}
                    height={48}
                    className={cn(
                      "rounded-full border-2 border-border transition-all", 
                      blurPersonalData && "blur-sm"
                    )}
                  />
                </div>
                <div className="flex-1">
                  <h3 className={cn("font-medium transition-all", blurPersonalData && "blur-sm")}>
                    {user.displayName || 'No Name'}
                  </h3>
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
        style={{ fontSize: '16px' }}
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
  const { isAuthenticated } = useConvexAuth();
  const settingsDoc = useQuery(api.userSettings.get, isAuthenticated ? {} : 'skip');
  const saveImageGenerationSettingsMutation = useMutation(api.userSettings.saveImageGenerationSettings);
  const [customInstructionsExpanded, setCustomInstructionsExpanded] = useState(false);
  const [modelVisibilityExpanded, setModelVisibilityExpanded] = useState(false);
  const [imageGenerationExpanded, setImageGenerationExpanded] = useState(false);
  const [currentTraitInput, setCurrentTraitInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImageGenerationSaving, setIsImageGenerationSaving] = useState(false);
  const [originalCustomInstructions, setOriginalCustomInstructions] = useState<CustomInstructions | null>(null);
  const [imageGenerationSettings, setImageGenerationSettings] = useState({
    model: 'gpt-image-1',
    size: 'auto',
    quality: 'auto',
    count: 1,
    format: 'jpeg',
    compression: 80,
  });
  
  const customInstructions = {
    name: settings.customInstructions?.name || '',
    occupation: settings.customInstructions?.occupation || '',
    traits: settings.customInstructions?.traits || [],
    traitsText: settings.customInstructions?.traitsText || '',
    additionalInfo: settings.customInstructions?.additionalInfo || '',
  };

  useEffect(() => {
    if (customInstructionsExpanded && !originalCustomInstructions) {
      setOriginalCustomInstructions({ ...customInstructions });
      setCurrentTraitInput(customInstructions.traitsText);
    }
  }, [customInstructionsExpanded, originalCustomInstructions, customInstructions]);

  useEffect(() => {
    if (!customInstructionsExpanded) {
      setOriginalCustomInstructions(null);
    }
  }, [customInstructionsExpanded]);

  useEffect(() => {
    if (settingsDoc) {
      setImageGenerationSettings({
        model: settingsDoc.imageGenerationModel || 'gpt-image-1',
        size: settingsDoc.imageGenerationSize || 'auto',
        quality: settingsDoc.imageGenerationQuality || 'auto',
        count: settingsDoc.imageGenerationCount || 1,
        format: settingsDoc.imageGenerationFormat || 'jpeg',
        compression: settingsDoc.imageGenerationCompression || 80,
      });
    }
  }, [settingsDoc]);

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
    const hasTraitInput = currentTraitInput.trim().length > 0;
    
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

  const handleToggleProvider = useCallback((provider: Provider) => {
    try {
      toggleProvider(provider);
      saveToConvex();
    } catch (error) {
      console.error('Failed to toggle provider:', error);
    }
  }, [toggleProvider, saveToConvex]);

  const handleToggleFavoriteModel = useCallback((model: AIModel) => {
    try {
      toggleFavoriteModel(model);
      saveToConvex();
    } catch (error) {
      console.error('Failed to toggle favorite model:', error);
    }
  }, [toggleFavoriteModel, saveToConvex]);

  const toggleCustomInstructionsExpanded = useCallback(() => {
    setCustomInstructionsExpanded(prev => !prev);
  }, []);

  const toggleModelVisibilityExpanded = useCallback(() => {
    setModelVisibilityExpanded(prev => !prev);
  }, []);

  const toggleImageGenerationExpanded = useCallback(() => {
    setImageGenerationExpanded(prev => !prev);
  }, []);

  const handleImageGenerationSettingChange = useCallback((setting: string, value: any) => {
    setImageGenerationSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  }, []);

  const saveImageGenerationSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsImageGenerationSaving(true);
    try {
      await saveImageGenerationSettingsMutation({
        imageGenerationModel: imageGenerationSettings.model,
        imageGenerationSize: imageGenerationSettings.size,
        imageGenerationQuality: imageGenerationSettings.quality,
        imageGenerationCount: imageGenerationSettings.count,
        imageGenerationFormat: imageGenerationSettings.format,
        imageGenerationCompression: imageGenerationSettings.compression,
      });
    } catch (error) {
      console.error('Failed to save image generation settings:', error);
    } finally {
      setIsImageGenerationSaving(false);
    }
  }, [isAuthenticated, saveImageGenerationSettingsMutation, imageGenerationSettings]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (settingsDoc && imageGenerationSettings) {
        const hasChanges = 
          imageGenerationSettings.model !== (settingsDoc.imageGenerationModel || 'gpt-image-1') ||
          imageGenerationSettings.size !== (settingsDoc.imageGenerationSize || 'auto') ||
          imageGenerationSettings.quality !== (settingsDoc.imageGenerationQuality || 'auto') ||
          imageGenerationSettings.count !== (settingsDoc.imageGenerationCount || 1) ||
          imageGenerationSettings.format !== (settingsDoc.imageGenerationFormat || 'jpeg') ||
          imageGenerationSettings.compression !== (settingsDoc.imageGenerationCompression || 80);
        
        if (hasChanges) {
          saveImageGenerationSettings();
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [imageGenerationSettings, settingsDoc, saveImageGenerationSettings]);

  const handleSaveCustomInstructions = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      const success = await saveCustomInstructionsManually();
      if (success) {
        setOriginalCustomInstructions({ ...customInstructions });
        toast.success('Custom instructions saved successfully!');
      } else {
        toast.error('Failed to save custom instructions. User not authenticated.');
      }
    } catch (error) {
      console.error('Error saving custom instructions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }, [saveCustomInstructionsManually, customInstructions, hasUnsavedChanges, isSaving]);

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
                        handleCustomInstructionsChange('traitsText', newValue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !currentTraitInput && (customInstructions.traits || []).length > 0) {
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

      {/* Image Generation Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer" 
          onClick={toggleImageGenerationExpanded}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Image Generation
              {isImageGenerationSaving && (
                <Badge variant="secondary" className="text-xs">
                  Saving...
                </Badge>
              )}
            </div>
            {imageGenerationExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            Configure default settings for AI image generation
          </CardDescription>
        </CardHeader>
        {imageGenerationExpanded && (
          <CardContent className="space-y-6">
            {/* Simple config for now */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Model</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-sm">GPT Image 1</div>
                      <div className="text-xs text-muted-foreground">Latest AI image generation model</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
              💡 Image generation settings are automatically optimized for best results.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Model Visibility Section */}
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
      <div className="bg-background/95 backdrop-blur-sm z-10 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProviderIcon provider={provider} className="h-4 w-4" />
            <span className="font-medium text-sm">{providerNames[provider]}</span>
            <Badge variant="secondary" className="text-xs">
              {models.length} models
            </Badge>
            {!providerHasKey && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                No API key
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CustomSwitch
              checked={isEnabled}
              onCheckedChange={onToggleProvider}
              id={`provider-${provider}`}
              disabled={false}
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
              isProviderEnabled={isEnabled}
              providerHasKey={providerHasKey}
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
  providerHasKey: boolean;
  isFavoriteModel: boolean;
  onToggleFavoriteModel: () => void;
}

const ModelRow = memo(({
  model,
  isProviderEnabled,
  providerHasKey,
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
        (!isProviderEnabled || !providerHasKey) && "opacity-60"
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
        {!providerHasKey && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            No API key
          </span>
        )}
        {!isProviderEnabled && providerHasKey && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Provider disabled
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

