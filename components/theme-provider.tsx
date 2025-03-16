"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: string;
  setTheme: (theme: string) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    // Check localStorage on mount
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (storedTheme) {
      setTheme(storedTheme);
    } else if (prefersDark) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    // Update the document class whenever theme changes
    const root = document.documentElement;
    const isDark = theme === "dark";

    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
