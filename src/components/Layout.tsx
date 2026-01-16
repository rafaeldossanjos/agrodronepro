import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

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
        <header className="sticky top-0 z-[200] flex h-16 lg:h-18 items-center gap-4 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
          <SidebarTrigger className="h-10 w-10 lg:h-12 lg:w-12 [&>svg]:h-7 [&>svg]:w-7 lg:[&>svg]:h-8 lg:[&>svg]:w-8" />
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
