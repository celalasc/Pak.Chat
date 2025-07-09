"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
}

export default function Portal({ children }: PortalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Lazily create the container element when running on the client
  if (!containerRef.current && typeof document !== "undefined") {
    containerRef.current = document.createElement("div");
  }

  // Append the container to the DOM on mount and clean up on unmount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Append lazily created container to the body if it's not already
    if (!container.isConnected) {
      document.body.appendChild(container);
    }

    // Cleanup by removing the container if it was inserted
    return () => {
      container.remove();
    };
  }, []);

  return containerRef.current
    ? createPortal(children, containerRef.current)
    : null;
}
