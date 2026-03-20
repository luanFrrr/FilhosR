import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import React, { useEffect } from "react";

// Cores fixas do background neutral — nunca mudam por tema de criança
const BG_LIGHT = "#f8fbfa"; // hsl(160, 30%, 98%)
const BG_DARK = "#090e1a"; // hsl(222, 47%, 7%)
const THEME_BAR_FALLBACK = {
  light: {
    pink: "#f3e3e9",
    blue: "#e4edf5",
  },
  dark: {
    pink: "#32202a",
    blue: "#1f2935",
  },
} as const;

function hslTripletToHex(value: string): string | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const hue = Number.parseFloat(parts[0]);
  const saturation = Number.parseFloat(parts[1].replace("%", "")) / 100;
  const lightness = Number.parseFloat(parts[2].replace("%", "")) / 100;

  if ([hue, saturation, lightness].some(Number.isNaN)) {
    return null;
  }

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = lightness - chroma / 2;
  const toHex = (channel: number) =>
    Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function getThemeBarColor(isDark: boolean) {
  const appliedTheme =
    document.documentElement.getAttribute("data-theme") ||
    localStorage.getItem("activeChildTheme");

  if (appliedTheme === "pink" || appliedTheme === "blue") {
    const computedSecondary = hslTripletToHex(
      getComputedStyle(document.documentElement).getPropertyValue("--secondary"),
    );

    return (
      computedSecondary ||
      THEME_BAR_FALLBACK[isDark ? "dark" : "light"][appliedTheme]
    );
  }

  return isDark ? BG_DARK : BG_LIGHT;
}

function syncThemeColor() {
  const apply = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const pageBackground = isDark ? BG_DARK : BG_LIGHT;
    const themeBarColor = getThemeBarColor(isDark);

    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((meta) => meta.setAttribute("content", themeBarColor));
    document.documentElement.style.backgroundColor = pageBackground;
    document.body.style.backgroundColor = pageBackground;
    const root = document.getElementById("root");
    if (root) root.style.backgroundColor = pageBackground;
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
