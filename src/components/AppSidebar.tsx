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
        <div className="flex items-center gap-4 px-5 py-6 lg:py-7">
          <div className="flex h-16 w-16 lg:h-18 lg:w-18 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Plane className="h-10 w-10 lg:h-12 lg:w-12 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-sidebar-foreground">AgroDrone</h1>
            <p className="text-lg lg:text-xl text-sidebar-foreground/70">Sistema PRO</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xl lg:text-2xl px-5 py-3 font-semibold">Menu Principal</SidebarGroupLabel>
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
                      className="min-h-[68px] lg:min-h-[72px] text-xl lg:text-2xl px-5 gap-4"
                    >
                      <item.icon className="h-9 w-9 lg:h-10 lg:w-10 flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-6 lg:p-7">
        <div className="space-y-5 lg:space-y-6">
          <div className="flex items-center gap-4 text-lg lg:text-xl">
            <User className="h-8 w-8 lg:h-9 lg:w-9 text-sidebar-foreground/70 flex-shrink-0" />
            <span className="text-sidebar-foreground/70 truncate">{user?.email}</span>
          </div>
          <Button 
            variant="outline" 
            size="lg"
            className="w-full text-xl lg:text-2xl h-16 lg:h-18 rounded-xl" 
            onClick={signOut}
          >
            <LogOut className="h-8 w-8 lg:h-9 lg:w-9 mr-3" />
            Sair
          </Button>
          <p className="text-lg lg:text-xl text-sidebar-foreground/50 text-center">
            © 2026 AgroDrone PRO
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
