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
        <div className="flex items-center gap-3 px-4 py-5 lg:px-5 lg:py-6">
          <div className="flex h-12 w-12 lg:h-16 lg:w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <Plane className="h-7 w-7 lg:h-10 lg:w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-sidebar-foreground">AgroDrone</h1>
            <p className="text-sm lg:text-lg text-sidebar-foreground/70">Sistema PRO</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base lg:text-xl px-4 lg:px-5 py-2 lg:py-3 font-semibold">Menu Principal</SidebarGroupLabel>
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
                      className="min-h-[56px] lg:min-h-[68px] text-lg lg:text-xl px-4 lg:px-5 gap-3 lg:gap-4"
                    >
                      <item.icon className="h-7 w-7 lg:h-9 lg:w-9 flex-shrink-0" />
                      <span className="font-medium text-base lg:text-xl">{item.name}</span>
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
          <div className="flex items-center gap-3 text-sm lg:text-lg">
            <User className="h-6 w-6 lg:h-8 lg:w-8 text-sidebar-foreground/70 flex-shrink-0" />
            <span className="text-sidebar-foreground/70 truncate">{user?.email}</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full text-base lg:text-lg h-12 lg:h-14 rounded-xl" 
              >
                <LogOut className="h-6 w-6 lg:h-7 lg:w-7 mr-2" />
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
          <p className="text-sm lg:text-lg text-sidebar-foreground/50 text-center">
            © 2026 AgroDrone PRO
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
