"use client";

import NewChatButton from './NewChatButton';
import ChatHistoryButton from './ChatHistoryButton';
import SettingsButton from './SettingsButton';

export default function BottomBar() {
  return (
    <div className="sticky bottom-0 inset-x-0 flex justify-center pb-safe mobile-keyboard-fix z-40">
      <div className="backdrop-blur-md bg-background/90 border-t border-border/50 max-w-3xl w-full flex items-center gap-1 px-2">
        <NewChatButton className="flex-shrink-0" />
        <ChatHistoryButton className="flex-shrink-0" />
        <SettingsButton className="flex-shrink-0 ml-auto" />
      </div>
    </div>
  );
}
