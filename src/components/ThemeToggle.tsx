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
      <Button variant="ghost" size="icon" className="h-10 w-10 lg:h-12 lg:w-12">
        <Sun className="h-5 w-5 lg:h-6 lg:w-6" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 lg:h-12 lg:w-12"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 lg:h-6 lg:w-6" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
