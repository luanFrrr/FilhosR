import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import React, { useEffect } from "react";

function syncThemeColor() {
  document.documentElement.style.removeProperty("background-color");

  requestAnimationFrame(() => {
    const rgb = getComputedStyle(document.documentElement).backgroundColor;
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return;
    const hex =
      "#" +
      match
        .slice(0, 3)
        .map((n) => parseInt(n).toString(16).padStart(2, "0"))
        .join("");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", hex);
    document.documentElement.style.backgroundColor = hex;
  });
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
