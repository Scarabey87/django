"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette } from "lucide-react";

type ColorTheme = "zinc" | "blue" | "rose" | "violet" | "green" | "orange";

const THEMES: { name: ColorTheme; color: string; label: string }[] = [
  { name: "zinc", color: "bg-neutral-800 dark:bg-neutral-200", label: "Zinc" },
  { name: "blue", color: "bg-blue-600", label: "Blue" },
  { name: "rose", color: "bg-rose-600", label: "Rose" },
  { name: "violet", color: "bg-violet-600", label: "Violet" },
  { name: "green", color: "bg-green-600", label: "Green" },
  { name: "orange", color: "bg-orange-600", label: "Orange" },
];

export function ColorThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>("zinc");

  useEffect(() => {
    // Load theme from localStorage or default to zinc
    const storedTheme = localStorage.getItem("color-theme") as ColorTheme;
    if (storedTheme) {
      setCurrentTheme(storedTheme);
      document.documentElement.setAttribute("data-color-theme", storedTheme);
    } else {
      document.documentElement.setAttribute("data-color-theme", "zinc");
    }
  }, []);

  const handleThemeChange = (theme: ColorTheme) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute("data-color-theme", theme);
    localStorage.setItem("color-theme", theme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Toggle color theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.name}
            onClick={() => handleThemeChange(theme.name)}
            className="flex items-center gap-2"
          >
            <div className={`h-4 w-4 rounded-full ${theme.color}`} />
            <span>{theme.label}</span>
            {currentTheme === theme.name && (
              <span className="ml-auto text-xs text-muted-foreground">Active</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}