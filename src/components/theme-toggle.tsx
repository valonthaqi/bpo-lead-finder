"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const THEME_CHANGE_EVENT = "themechange";

function subscribeToThemeChanges(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function isDarkThemeActive() {
  return document.documentElement.classList.contains("dark");
}

function saveThemeChoice(theme: "light" | "dark") {
  try {
    localStorage.setItem("theme", theme);
  } catch {}
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeToThemeChanges,
    isDarkThemeActive,
    () => false,
  );

  function toggleTheme() {
    const nextIsDark = !isDark;
    document.documentElement.classList.toggle("dark", nextIsDark);
    saveThemeChoice(nextIsDark ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <SunIcon aria-hidden="true" />
      ) : (
        <MoonIcon aria-hidden="true" />
      )}
    </Button>
  );
}
