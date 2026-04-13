import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApplications } from "@/hooks/useApplications";

export function SmartNotifications() {
  const navigate = useNavigate();
  const { applications } = useApplications();

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

    return items;
  }, [applications, navigate]);

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
