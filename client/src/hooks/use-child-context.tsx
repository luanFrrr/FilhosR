import React, { createContext, useContext, useState, useEffect } from "react";
import { type Child } from "@shared/schema";
import { useChildren } from "./use-children";

interface ChildContextType {
  activeChildId: number | null;
  setActiveChildId: (id: number) => void;
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
      if (!activeChildId || !childList.find(c => c.id === activeChildId)) {
        setActiveChildIdState(childList[0].id);
      }
    }
  }, [childList, isLoading, activeChildId]);

  useEffect(() => {
    if (activeChildId) {
      localStorage.setItem("activeChildId", activeChildId.toString());
      
      // Update theme based on child
      const child = childList?.find(c => c.id === activeChildId);
      if (child?.theme) {
        document.documentElement.setAttribute('data-theme', child.theme);
      }
    }
  }, [activeChildId, childList]);

  const activeChild = childList?.find((c) => c.id === activeChildId);

  const setActiveChildId = (id: number) => {
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
