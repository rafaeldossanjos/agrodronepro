import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

// Inner component that has access to sidebar context
const LayoutContent = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  // Close mobile sidebar when route changes
  useEffect(() => {
    setOpenMobile(false);
  }, [location.pathname, setOpenMobile]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col w-full">
        <header className="sticky top-0 z-[200] flex h-14 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};
