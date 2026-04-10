import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApplications } from "@/hooks/useApplications";
import { useStockMovements } from "@/hooks/useStockMovements";
import { useProducts } from "@/hooks/useProducts";

export function SmartNotifications() {
  const navigate = useNavigate();
  const { applications } = useApplications();
  const { balances } = useStockMovements();
  const { products } = useProducts();

  const notifications = useMemo(() => {
    const items: Array<{
      id: string;
      icon: typeof AlertTriangle;
      title: string;
      description: string;
      color: string;
      action: () => void;
    }> = [];

    // Aplicações pendentes esta semana
    const pendingApps = applications.filter(
      (app) => app.status === "planejada" || app.status === "em_andamento"
    );
    if (pendingApps.length > 0) {
      items.push({
        id: "pending-apps",
        icon: Clock,
        title: `${pendingApps.length} aplicação(ões) pendente(s)`,
        description: "Você tem aplicações planejadas ou em andamento",
        color: "text-warning",
        action: () => navigate("/applications"),
      });
    }

    // Estoque baixo
    const lowStock = balances.filter((b) => {
      const min = Number(b.min_quantity ?? 0);
      const cur = Number(b.current_quantity ?? 0);
      return min > 0 && cur <= min;
    });
    if (lowStock.length > 0) {
      const productNames = lowStock
        .map((b) => {
          const p = b.product?.name || products.find((pr) => pr.id === b.product_id)?.name;
          return p;
        })
        .filter(Boolean)
        .slice(0, 3);
      
      items.push({
        id: "low-stock",
        icon: Package,
        title: `${lowStock.length} produto(s) com estoque baixo`,
        description: productNames.length > 0 
          ? `${productNames.join(", ")}${lowStock.length > 3 ? "..." : ""}`
          : "Verifique os itens com estoque abaixo do mínimo",
        color: "text-destructive",
        action: () => navigate("/stock"),
      });
    }

    // Estoque zerado (sem mínimo definido mas qty = 0)
    const zeroStock = balances.filter((b) => {
      const cur = Number(b.current_quantity ?? 0);
      const min = Number(b.min_quantity ?? 0);
      return cur <= 0 && min === 0;
    });
    if (zeroStock.length > 0) {
      items.push({
        id: "zero-stock",
        icon: AlertTriangle,
        title: `${zeroStock.length} produto(s) sem estoque`,
        description: "Produtos com quantidade zerada ou negativa",
        color: "text-orange-500",
        action: () => navigate("/stock"),
      });
    }

    return items;
  }, [applications, balances, products, navigate]);

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <button
          key={n.id}
          onClick={n.action}
          className="w-full text-left"
        >
          <Card className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className={`p-2 rounded-lg bg-muted ${n.color}`}>
              <n.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-medium text-foreground">{n.title}</p>
              <p className="text-base text-muted-foreground truncate">{n.description}</p>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
