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
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore, GENERAL_FONTS, CODE_FONTS, THEMES, GeneralFont, CodeFont, Theme } from '@/frontend/stores/SettingsStore';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useTheme } from 'next-themes';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldError, useForm, UseFormRegister } from 'react-hook-form';
import { toast } from 'sonner';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { Switch } from '@/frontend/components/ui/switch';

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

const SettingsDrawerComponent = ({ children, isOpen, setIsOpen }: SettingsDrawerProps) => {
  const { isMobile, mounted } = useIsMobile(600);
  const [activeTab, setActiveTab] = useState("customization");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, [setIsOpen]);

  // Стабилизируем состояние диалога
  const dialogKey = useMemo(() => `settings-dialog-${isOpen}`, [isOpen]);

  // Мемоизируем tabs чтобы они не пересоздавались при каждом рендере
  const tabs = useMemo(() => [
    {
      value: "customization",
      label: "Customization",
      icon: "palette"
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
      case 'user':
        return <User className="h-4 w-4" />;
      case 'key':
        return <Key className="h-4 w-4" />;
      default:
        return null;
    }
  }, []);

  // Мемоизируем ContentComponent чтобы предотвратить ненужные перерендеры
  const ContentComponent = useCallback(({ className }: { className?: string }) => {
    return (
      <div className={cn("flex gap-4 flex-1 min-h-0", className)}>
        {isMobile ? (
          // Мобильная версия - горизонтальные табы сверху
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full flex-shrink-0 grid-cols-3">
              <TabsTrigger value="customization" className="flex items-center gap-1 text-xs">
                <Palette className="h-3 w-3" />
                <span className="hidden xs:inline">Style</span>
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
              {activeTab === 'customization' && <CustomizationTab />}
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'api-keys' && <APIKeysTab />}
            </div>
          </Tabs>
        ) : (
          // Десктопная версия - анимированные табы слева
          <div className="flex gap-4 flex-1 min-h-0">
            <div className="flex flex-col w-48 flex-shrink-0">
              <AnimatedTabs
                tabs={tabs.map(tab => ({
                  ...tab,
                  icon: getTabIcon(tab.icon)
                }))}
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              />
            </div>
            
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-none enhanced-scroll pl-4">
              <div className="scroll-auto" style={{ scrollBehavior: 'auto', overscrollBehavior: 'contain' }}>
                {activeTab === 'customization' && <CustomizationTab />}
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'api-keys' && <APIKeysTab />}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [activeTab, isMobile, tabs, getTabIcon]);

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
            <DialogDescription className="sr-only">
              Configure your application settings, profile, and API keys
            </DialogDescription>
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
        <DrawerContent className="max-h-[calc(100dvh-10px)] flex flex-col w-full p-0">
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange} key={dialogKey}>
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
        <ContentComponent />
      </DialogContent>
    </Dialog>
  );
};

const CustomizationTab = memo(() => {
  const { settings, setSettings } = useSettingsStore();
  const { setTheme } = useTheme();
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

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
              <Label htmlFor="chat-preview" className="text-sm">Show chat preview</Label>
              <Switch
                id="chat-preview"
                checked={settings.showChatPreview}
                onCheckedChange={(v) => handleSwitchChange('showChatPreview', v)}
              />
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
                   <img
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: keys,
  });

  const { register, handleSubmit, formState: { errors, isDirty }, reset } = form;

  // Сбрасываем форму ОДИН раз - когда загрузились ключи
  useEffect(() => {
    if (!keysLoading) {
      form.reset(keys);
    }
    // зависим только от keysLoading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysLoading]);

  const onSubmit = useCallback(
    (values: FormValues) => {
      setKeys(values);
      toast.success('API keys saved successfully');
    },
    [setKeys]
  );

  return (
    <div className="space-y-6 pb-4" key={keysLoading ? 'loading' : 'ready'}>
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

            <ApiKeyField
              id="groq"
              label="Groq API Key"
              models={['Llama 3.3 70B', 'Mixtral 8x7B']}
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
    switch (id) {
      case 'google':
        return (
          <svg className="h-4 w-4 text-foreground" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
            <path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"/>
          </svg>
        );
      case 'openrouter':
        return (
          <svg className="h-4 w-4 text-foreground" fill="currentColor" fillRule="evenodd" height="1em" style={{flex:'none',lineHeight:1}} viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
            <title>OpenRouter</title>
            <path d="M16.804 1.957l7.22 4.105v.087L16.73 10.21l.017-2.117-.821-.03c-1.059-.028-1.611.002-2.268.11-1.064.175-2.038.577-3.147 1.352L8.345 11.03c-.284.195-.495.336-.68.455l-.515.322-.397.234.385.23.53.338c.476.314 1.17.796 2.701 1.866 1.11.775 2.083 1.177 3.147 1.352l.3.045c.694.091 1.375.094 2.825.033l.022-2.159 7.22 4.105v.087L16.589 22l.014-1.862-.635.022c-1.386.042-2.137.002-3.138-.162-1.694-.28-3.26-.926-4.881-2.059l-2.158-1.5a21.997 21.997 0 00-.755-.498l-.467-.28a55.927 55.927 0 00-.76-.43C2.908 14.73.563 14.116 0 14.116V9.888l.14.004c.564-.007 2.91-.622 3.809-1.124l1.016-.58.438-.274c.428-.28 1.072-.726 2.686-1.853 1.621-1.133 3.186-1.78 4.881-2.059 1.152-.19 1.974-.213 3.814-.138l.02-1.907z"></path>
          </svg>
        );
      case 'openai':
        return (
          <svg className="h-4 w-4 text-foreground" fill="currentColor" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg">
            <title>OpenAI icon</title>
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"></path>
          </svg>
        );
      case 'groq':
        return (
          <svg className="h-4 w-4 text-foreground" fill="currentColor" fillRule="evenodd" height="1em" style={{flex:'none',lineHeight:1}} viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
            <title>Groq</title>
            <path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z"></path>
          </svg>
        );
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  const handleCopy = useCallback(async () => {
    if (inputValue.trim()) {
      try {
        await navigator.clipboard.writeText(inputValue.trim());
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

const SettingsDrawerMemo = memo(SettingsDrawerComponent);
SettingsDrawerMemo.displayName = 'SettingsDrawer';

export default SettingsDrawerMemo;

