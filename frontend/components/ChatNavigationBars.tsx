"use client"

import type React from "react"
import { useState, memo } from "react"
import { cn } from "@/lib/utils"
import { UIMessage } from 'ai'

interface ChatNavigationBarsProps {
  messages: UIMessage[]
  scrollToMessage: (id: string) => void
}

function ChatNavigationBarsComponent({ messages, scrollToMessage }: ChatNavigationBarsProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)

  // Фильтруем только пользовательские сообщения для навигации
  const userMessages = messages.filter(message => message.role === 'user')


  // Функция для вычисления длины полоски на основе длины сообщения
  const getBarLength = (messageLength: number) => {
    const minLength = 20
    const maxLength = 120
    const maxMessageLength = 200

    const normalizedLength = Math.min(messageLength, maxMessageLength)
    const length = minLength + (normalizedLength / maxMessageLength) * (maxLength - minLength)

    return Math.round(length)
  }

  // Функция для получения превью сообщения и определения размера окна
  const getMessagePreview = (content: string) => {
    const preview = content.length > 80 ? content.substring(0, 80) + "..." : content
    const isShort = preview.length < 30
    return { preview, isShort }
  }

  const handleMouseEnter = (messageId: string) => {
    setHoveredBar(messageId)
  }

  const handleMouseLeave = () => {
    setHoveredBar(null)
  }

  const handleBarClick = (messageId: string) => {
    scrollToMessage(messageId)
  }

  // Если нет пользовательских сообщений, не отображаем навигацию
  if (userMessages.length === 0) {
    return null
  }

  return (
    <div className="fixed left-0 top-0 z-30 flex h-full w-16 flex-col items-start justify-center space-y-3 py-4 pl-2">
      {userMessages.map((message) => {
        const barLength = getBarLength(message.content.length)
        const { preview, isShort } = getMessagePreview(message.content)
        const isHovered = hoveredBar === message.id

        return (
          <div
            key={message.id}
            className={cn(
              'bg-blue-500/60 hover:bg-blue-500 dark:bg-blue-400/60 dark:hover:bg-blue-400 transition-all duration-200 cursor-pointer',
              isHovered
                ? 'rounded-xl flex items-center justify-center shadow-md'
                : 'rounded-r-full hover:shadow-md will-change-transform-shadow transition-property-all'
            )}
            style={{
              width: isHovered ? (isShort ? '160px' : '240px') : `${barLength}px`,
              height: isHovered ? (isShort ? '48px' : '72px') : '4px'
            }}
            onMouseEnter={() => handleMouseEnter(message.id)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleBarClick(message.id)}
          >
            {isHovered && (
              <span
                className={cn(
                  'text-gray-800 dark:text-white font-medium',
                  isShort ? 'text-sm' : 'text-sm leading-tight'
                )}
              >
                {preview}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default memo(ChatNavigationBarsComponent)
