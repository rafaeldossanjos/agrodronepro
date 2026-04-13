import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncIndicator } from "@/components/SyncIndicator";

// Inner component that has access to sidebar context
const LayoutContent = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  // Close sidebar when route changes
  useEffect(() => {
    setOpenMobile(false);
  }, [location.pathname, setOpenMobile]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col w-full">
        <header className="sticky top-0 z-[200] flex min-h-[calc(3.5rem+env(safe-area-inset-top)+0.625rem)] items-center justify-between gap-3 border-b border-border bg-card/95 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.625rem)] backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:px-4 lg:min-h-16 lg:px-6 lg:py-0">
          <SidebarTrigger className="h-9 w-9 rounded-lg lg:h-12 lg:w-12 [&>svg]:h-[18px] [&>svg]:w-[18px] lg:[&>svg]:h-7 lg:[&>svg]:w-7" />
          <div className="flex items-center gap-0.5 sm:gap-1">
            <SyncIndicator />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 p-3 sm:p-4 lg:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};
