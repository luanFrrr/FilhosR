import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import React, { useEffect } from "react";

// Cores fixas do background neutral — nunca mudam por tema de criança
const BG_LIGHT = "#f8fbfa"; // hsl(160, 30%, 98%)
const BG_DARK = "#090e1a"; // hsl(222, 47%, 7%)

function syncThemeColor() {
  const apply = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const hex = isDark ? BG_DARK : BG_LIGHT;

    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((meta) => meta.setAttribute("content", hex));
    document.documentElement.style.backgroundColor = hex;
    document.body.style.backgroundColor = hex;
    const root = document.getElementById("root");
    if (root) root.style.backgroundColor = hex;
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  };

  apply();
  requestAnimationFrame(apply);
}

function ThemeColorSync() {
  const { resolvedTheme } = useNextTheme();

  useEffect(() => {
    syncThemeColor();
  }, [resolvedTheme]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "data-theme" || m.attributeName === "class") {
          syncThemeColor();
          break;
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handle = () => syncThemeColor();
    window.addEventListener("pageshow", handle);
    document.addEventListener("visibilitychange", handle);
    window.addEventListener("focus", handle);
    return () => {
      window.removeEventListener("pageshow", handle);
      document.removeEventListener("visibilitychange", handle);
      window.removeEventListener("focus", handle);
    };
  }, []);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const ctx = useNextTheme();
  return {
    theme: (ctx.theme ?? "system") as "light" | "dark" | "system",
    setTheme: ctx.setTheme,
    resolvedTheme: (ctx.resolvedTheme ?? "light") as "light" | "dark",
  };
}
