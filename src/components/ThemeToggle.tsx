import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-12 w-12 lg:h-14 lg:w-14">
        <Sun className="h-7 w-7 lg:h-8 lg:w-8" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12 lg:h-14 lg:w-14"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-7 w-7 lg:h-8 lg:w-8 text-yellow-500" />
      ) : (
        <Moon className="h-7 w-7 lg:h-8 lg:w-8" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
