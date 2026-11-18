import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calculator, 
  MapPin, 
  ClipboardList, 
  Cylinder, 
  Plane, 
  BarChart3, 
  Settings,
  LogOut,
  User,
  FileText,
  Users,
  Landmark,
  PackageSearch
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calculadora", href: "/calculator", icon: Calculator },
  { name: "Propriedades", href: "/properties", icon: Landmark },
  { name: "Aplicações", href: "/applications", icon: ClipboardList },
  { name: "Produtos", href: "/products", icon: Cylinder },
  { name: "Planejamento", href: "/planning", icon: Plane },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { setOpenMobile } = useSidebar();

  const handleNavigation = (href: string) => {
    navigate(href);
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-4 py-4 lg:px-5 lg:py-6">
          <div className="flex h-10 w-10 lg:h-16 lg:w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Plane className="h-5 w-5 lg:h-10 lg:w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg lg:text-2xl font-bold text-sidebar-foreground">AgroDrone</h1>
            <p className="text-xs lg:text-lg text-sidebar-foreground/70">Sistema PRO</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-sm font-semibold lg:px-5 lg:py-3 lg:text-xl">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={isActive}
                      size="lg"
                      onClick={() => handleNavigation(item.href)}
                      className="min-h-[48px] gap-2.5 px-3 text-sm lg:min-h-[68px] lg:gap-4 lg:px-5 lg:text-xl"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 lg:h-9 lg:w-9" />
                      <span className="font-medium text-sm lg:text-xl">{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 lg:p-6">
        <div className="space-y-3 lg:space-y-5">
          <div className="flex items-center gap-2.5 text-xs lg:text-lg">
            <User className="h-5 w-5 flex-shrink-0 text-sidebar-foreground/70 lg:h-8 lg:w-8" />
            <span className="truncate text-sidebar-foreground/70">{user?.email}</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="lg"
                className="h-11 w-full rounded-lg text-sm lg:h-14 lg:rounded-xl lg:text-lg" 
              >
                <LogOut className="mr-2 h-4 w-4 lg:h-7 lg:w-7" />
                Sair
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl">Sair do sistema</AlertDialogTitle>
                <AlertDialogDescription className="text-lg">
                  Tem certeza que deseja sair? Dados não sincronizados podem ser perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-12 text-lg">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={signOut}
                  className="h-12 text-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sair
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-center text-xs text-sidebar-foreground/50 lg:text-lg">
            © 2026 AgroDrone PRO
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
