import { Link, useLocation, useNavigate } from "react-router-dom";
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

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calculadora", href: "/calculator", icon: Calculator },
  { name: "Mapa", href: "/map", icon: MapPin },
  { name: "Propriedades", href: "/properties", icon: Landmark },
  { name: "Aplicações", href: "/applications", icon: ClipboardList },
  { name: "Produtos", href: "/products", icon: Cylinder },
  { name: "Estoque", href: "/stock", icon: PackageSearch },
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
        <div className="flex items-center gap-3 px-3 py-4 lg:py-5">
          <div className="flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Plane className="h-7 w-7 lg:h-8 lg:w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-sidebar-foreground">AgroDrone</h1>
            <p className="text-sm lg:text-base text-sidebar-foreground/70">Sistema PRO</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base lg:text-lg px-3">Menu</SidebarGroupLabel>
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
                      className="min-h-[56px] lg:min-h-[60px] text-lg lg:text-xl px-3"
                    >
                      <item.icon className="h-7 w-7 lg:h-8 lg:w-8" />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 lg:p-6">
        <div className="space-y-4 lg:space-y-5">
          <div className="flex items-center gap-3 text-base lg:text-lg">
            <User className="h-6 w-6 lg:h-7 lg:w-7 text-sidebar-foreground/70" />
            <span className="text-sidebar-foreground/70 truncate">{user?.email}</span>
          </div>
          <Button 
            variant="outline" 
            size="lg"
            className="w-full text-lg lg:text-xl h-14 lg:h-16" 
            onClick={signOut}
          >
            <LogOut className="h-6 w-6 lg:h-7 lg:w-7 mr-2" />
            Sair
          </Button>
          <p className="text-sm lg:text-base text-sidebar-foreground/50 text-center">
            © 2025 AgroDrone PRO
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
