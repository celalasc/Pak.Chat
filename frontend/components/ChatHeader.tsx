"use client";

import { Link } from 'react-router';
import { motion, useScroll, useTransform, type Transition, easeInOut } from 'framer-motion';
import NewChatButton from './NewChatButton';
import ChatHistoryButton from './ChatHistoryButton';
import SettingsButton from './SettingsButton';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useUIStore } from '@/frontend/stores/uiStore';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';

const animationVariants = {
  visible: { opacity: 1, x: 0, y: 0 },
  hiddenRight: { opacity: 0, x: "110%" },
} as const;

const transition: Transition = { duration: 0.3, ease: easeInOut };

export default function ChatHeader() {
  const { isMobile } = useIsMobile();
  const isEditing = useUIStore((state) => !!state.editingMessageId);
  const hasKeys = useAPIKeyStore((state) => state.hasRequiredKeys());

  const { scrollY } = useScroll();
  const progress = useTransform(scrollY, [0, 80], [0, 1]);
  const leftX = useTransform(progress, (v) => -v * 100);
  const rightX = useTransform(progress, (v) => v * 80);

  return (
    <header className="relative z-20 shrink-0">
      <div className="fixed left-4 right-4 top-4 flex items-center gap-x-1">
        <motion.div style={{ x: leftX }}>
          <Link to="/chat" className="text-xl font-bold">
            Pak.Chat
          </Link>
        </motion.div>
        <motion.div
          style={{ x: rightX }}
          className="ml-auto flex items-center gap-x-1"
        >
          <motion.div initial="visible" animate="visible" transition={transition}>
            {hasKeys && <NewChatButton />}
          </motion.div>
          <motion.div initial="visible" animate="visible" transition={transition}>
            <ChatHistoryButton />
          </motion.div>
          <motion.div
            initial="visible"
            animate={isMobile && isEditing ? "hiddenRight" : "visible"}
            variants={animationVariants}
            transition={transition}
          >
            <SettingsButton />
          </motion.div>
        </motion.div>
      </div>
    </header>
  );
}
