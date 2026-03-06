import React, { createContext, useContext, useState, useEffect } from "react";
import { type Child } from "@shared/schema";
import { useChildren } from "./use-children";

function hslToHex(hslStr: string): string {
  const parts = hslStr.split(/\s+/).map(Number);
  if (parts.length < 3) return "#000000";
  const [h, s, l] = [parts[0], parts[1] / 100, parts[2] / 100];
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface ChildContextType {
  activeChildId: number | null;
  setActiveChildId: (id: number | null) => void;
  activeChild: Child | undefined;
  isLoading: boolean;
}

const ChildContext = createContext<ChildContextType | undefined>(undefined);

export function ChildProvider({ children }: { children: React.ReactNode }) {
  const { data: childList, isLoading } = useChildren();
  const [activeChildId, setActiveChildIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem("activeChildId");
    return saved ? parseInt(saved, 10) : null;
  });

  // Auto-select first child if none selected or invalid
  useEffect(() => {
    if (!isLoading && childList && childList.length > 0) {
      if (!activeChildId || !childList.find((c) => c.id === activeChildId)) {
        setActiveChildIdState(childList[0].id);
      }
    }
  }, [childList, isLoading, activeChildId]);

  useEffect(() => {
    if (activeChildId) {
      localStorage.setItem("activeChildId", activeChildId.toString());

      // Update theme based on child
      const child = childList?.find((c) => c.id === activeChildId);
      if (child?.theme && child.theme !== "default") {
        document.documentElement.setAttribute("data-theme", child.theme);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }

      // Sync theme-color meta tag with actual background to avoid colored bars
      requestAnimationFrame(() => {
        const bg = getComputedStyle(document.documentElement)
          .getPropertyValue("--background")
          .trim();
        if (bg) {
          const meta = document.querySelector(
            'meta[name="theme-color"]',
          ) as HTMLMetaElement | null;
          if (meta) {
            meta.setAttribute("content", hslToHex(bg));
          }
        }
      });
    }
  }, [activeChildId, childList]);

  const activeChild = childList?.find((c) => c.id === activeChildId);

  const setActiveChildId = (id: number | null) => {
    setActiveChildIdState(id);
  };

  return (
    <ChildContext.Provider
      value={{
        activeChildId,
        setActiveChildId,
        activeChild,
        isLoading,
      }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChildContext() {
  const context = useContext(ChildContext);
  if (context === undefined) {
    throw new Error("useChildContext must be used within a ChildProvider");
  }
  return context;
}
