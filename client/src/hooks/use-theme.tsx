import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import React, { useEffect } from "react";

function syncThemeColor() {
  requestAnimationFrame(() => {
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--background")
      .trim();
    if (!bg) return;
    const parts = bg.split(/\s+/).map(Number);
    if (parts.length < 3) return;
    const [h, s, l] = [parts[0], parts[1] / 100, parts[2] / 100];
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    const hex = `#${f(0)}${f(8)}${f(4)}`;
    const meta = document.querySelector(
      'meta[name="theme-color"]',
    ) as HTMLMetaElement | null;
    if (meta) meta.setAttribute("content", hex);
  });
}

function ThemeColorSync() {
  const { resolvedTheme } = useNextTheme();
  useEffect(() => {
    syncThemeColor();
  }, [resolvedTheme]);
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
