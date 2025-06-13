"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { UIMessage } from 'ai'

interface ChatNavigationBarsProps {
  messages: UIMessage[]
  scrollToMessage: (id: string) => void
}

export default function ChatNavigationBars({ messages, scrollToMessage }: ChatNavigationBarsProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)
  const [hoveredBarPosition, setHoveredBarPosition] = useState({ top: 0, left: 0 })
  const [maxBarLength, setMaxBarLength] = useState(0)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Фильтруем только пользовательские сообщения для навигации
  const userMessages = messages.filter(message => message.role === 'user')

  // Вычисляем максимальную длину полоски при монтировании компонента
  useEffect(() => {
    if (userMessages.length > 0) {
      const maxLength = Math.max(...userMessages.map((message) => getBarLength(message.content.length)))
      setMaxBarLength(maxLength)
    }
  }, [userMessages])

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

  const handleMouseEnter = (messageId: string, event: React.MouseEvent<HTMLDivElement>) => {
    setHoveredBar(messageId)

    const barElement = event.currentTarget
    const rect = barElement.getBoundingClientRect()

    setHoveredBarPosition({
      top: rect.top + rect.height / 2,
      left: sidebarRef.current ? sidebarRef.current.getBoundingClientRect().left + maxBarLength : rect.right,
    })
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
    <>
      {/* Навигационные полоски */}
      <div ref={sidebarRef} className="fixed left-0 top-0 w-16 h-full flex flex-col items-start justify-center py-4 space-y-3 pl-2 z-30">
        {userMessages.map((message) => {
          const barLength = getBarLength(message.content.length)

          return (
            <div
              key={message.id}
              className={cn(
                "bg-blue-500/60 hover:bg-blue-500 dark:bg-blue-400/60 dark:hover:bg-blue-400 transition-all duration-200 cursor-pointer rounded-r-full",
                "hover:shadow-md",
                "will-change-transform-shadow transition-property-all"
              )}
              style={{
                width: `${barLength}px`,
                height: "4px",
              }}
              onMouseEnter={(e) => handleMouseEnter(message.id, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleBarClick(message.id)}
            />
          )
        })}

        {/* Всплывающая плитка с превью */}
        {hoveredBar &&
          (() => {
            const messageData = userMessages.find((m) => m.id === hoveredBar)
            if (!messageData) return null
            
            const { preview, isShort } = getMessagePreview(messageData.content)

            return (
              <div
                className="fixed z-50 overflow-hidden pointer-events-none"
                style={{
                  left: hoveredBarPosition.left + 16,
                  top: hoveredBarPosition.top,
                  transform: "translateY(-50%)",
                  width: isShort ? "160px" : "240px",
                  height: isShort ? "48px" : "72px",
                }}
              >
                {/* Основной контейнер с стекломорфизмом */}
                <div className="relative w-full h-full bg-gradient-to-br from-white/90 via-white/80 to-white/70 dark:from-gray-900/80 dark:via-gray-800/70 dark:to-gray-700/60 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-white/20 shadow-2xl shadow-black/10 dark:shadow-black/40">
                  {/* Внутренний градиент для глубины */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 dark:from-white/10 to-transparent rounded-xl"></div>

                  {/* Верхний туман */}
                  <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/95 via-white/60 dark:from-gray-900/90 dark:via-gray-900/40 to-transparent z-10 rounded-t-xl"></div>

                  {/* Контейнер с текстом */}
                  <div className="relative flex items-center justify-center h-full px-4">
                    <div
                      className={cn(
                        "text-gray-800 dark:text-white text-center font-medium",
                        isShort ? "text-sm" : "text-sm leading-tight",
                      )}
                    >
                      {preview}
                    </div>
                  </div>

                  {/* Нижний туман */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/95 via-white/60 dark:from-gray-900/90 dark:via-gray-900/40 to-transparent z-10 rounded-b-xl"></div>

                  {/* Дополнительная подсветка краев */}
                  <div className="absolute inset-0 rounded-xl ring-1 ring-gray-300/50 dark:ring-white/30 ring-inset"></div>
                </div>
              </div>
            )
          })()}
      </div>
    </>
  )
} 