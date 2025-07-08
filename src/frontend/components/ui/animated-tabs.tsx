"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedTabsProps {
  tabs: Array<{
    value: string
    label: string
    icon?: React.ReactNode
  }>
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function AnimatedTabs({ tabs, value, onValueChange, className }: AnimatedTabsProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [tabHeight, setTabHeight] = React.useState(0)

  React.useEffect(() => {
    const index = tabs.findIndex(tab => tab.value === value)
    if (index !== -1) {
      setActiveIndex(index)
    }
  }, [value, tabs])

  React.useEffect(() => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.offsetHeight - 8 // minus padding
      setTabHeight(containerHeight / tabs.length)
    }
  }, [tabs.length])

  return (
    <div className={cn("relative", className)}>
      <div ref={containerRef} className="relative flex flex-col bg-muted/50 p-1 rounded-lg">
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "relative flex items-center justify-start gap-3 text-sm h-11 px-4 rounded-md transition-colors duration-200 z-10",
              "hover:text-foreground",
              value === tab.value 
                ? "text-foreground" 
                : "text-muted-foreground"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
        
        <motion.div
          className="absolute bg-background shadow-sm rounded-md border border-border/50"
          layoutId="activeTab"
          initial={false}
          animate={{
            y: activeIndex * 44 + 4, // 44px высота каждого таба + отступ
            height: 44 - 8, // высота таба минус отступы
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          style={{
            width: "calc(100% - 8px)",
            left: "4px",
          }}
        />
      </div>
    </div>
  )
} 