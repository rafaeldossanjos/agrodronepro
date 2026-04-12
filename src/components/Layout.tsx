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
        <header className="sticky top-0 z-[200] flex h-14 lg:h-16 items-center justify-between gap-4 border-b border-border bg-card px-3 sm:px-4 lg:px-6 pt-[env(safe-area-inset-top)]">
          <SidebarTrigger className="h-10 w-10 lg:h-12 lg:w-12 [&>svg]:h-6 [&>svg]:w-6 lg:[&>svg]:h-7 lg:[&>svg]:w-7" />
          <div className="flex items-center gap-1">
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
