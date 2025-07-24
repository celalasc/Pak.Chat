"use client";

import React, { memo } from "react";
import { useIsMobile } from "@/frontend/hooks/useIsMobile";
import ChatHistoryMobile from "./ChatHistoryMobile";
import ChatHistoryDesktop from "./ChatHistoryDesktop";

interface ChatHistoryDrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  projectId?: string;
  projectName?: string;
}

const ChatHistoryDrawerComponent: React.FC<ChatHistoryDrawerProps> = ({
  children,
  isOpen,
  setIsOpen,
  projectId,
  projectName,
}) => {
  const { isMobile, mounted } = useIsMobile(600);

  if (!mounted) return null;

  if (isMobile) {
    return (
      <ChatHistoryMobile isOpen={isOpen} setIsOpen={setIsOpen} projectId={projectId} projectName={projectName}>
        {children}
      </ChatHistoryMobile>
    );
  }

  return (
    <ChatHistoryDesktop isOpen={isOpen} setIsOpen={setIsOpen} projectId={projectId} projectName={projectName}>
      {children}
    </ChatHistoryDesktop>
  );
};

export default memo(ChatHistoryDrawerComponent);
