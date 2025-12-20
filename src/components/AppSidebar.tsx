import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calculator, 
  MapPin, 
  ClipboardList, 
  Fuel, 
  Plane, 
  BarChart3, 
  Settings,
  LogOut,
  User,
  FileText,
  Users
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

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calculadora", href: "/calculator", icon: Calculator },
  { name: "Mapa", href: "/map", icon: MapPin },
  { name: "Propriedades", href: "/properties", icon: Plane },
  { name: "Aplicações", href: "/applications", icon: ClipboardList },
  { name: "Produtos", href: "/products", icon: Fuel },
  { name: "Receituários", href: "/recipes", icon: FileText },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
  { name: "Equipe", href: "/team", icon: Users },
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
        <div className="flex items-center gap-2 px-2 py-3 lg:py-4">
          <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Plane className="h-5 w-5 lg:h-6 lg:w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-sidebar-foreground">AgroDrone</h1>
            <p className="text-xs lg:text-sm text-sidebar-foreground/70">Sistema PRO</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm lg:text-base">Menu</SidebarGroupLabel>
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
                      className="min-h-[52px] lg:min-h-[56px] text-base lg:text-lg"
                    >
                      <item.icon className="h-6 w-6 lg:h-7 lg:w-7" />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 lg:p-5">
        <div className="space-y-3 lg:space-y-4">
          <div className="flex items-center gap-2 text-sm lg:text-base">
            <User className="h-5 w-5 lg:h-6 lg:w-6 text-sidebar-foreground/70" />
            <span className="text-sidebar-foreground/70 truncate">{user?.email}</span>
          </div>
          <Button 
            variant="outline" 
            size="lg"
            className="w-full text-base lg:text-lg h-11 lg:h-12" 
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 lg:h-6 lg:w-6 mr-2" />
            Sair
          </Button>
          <p className="text-xs lg:text-sm text-sidebar-foreground/50 text-center">
            © 2025 AgroDrone PRO
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
