import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import React from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
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
