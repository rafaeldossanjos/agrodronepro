import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, User, Bell, Shield } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie preferências e configurações do sistema
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Perfil do Usuário
              </h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" defaultValue="João Silva" />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" defaultValue="joao@email.com" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" defaultValue="(16) 98765-4321" />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input id="company" defaultValue="AgroTech Solutions" />
                </div>
              </div>
              <Button>Salvar Alterações</Button>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Notificações
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Aplicações concluídas
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações quando aplicações forem finalizadas
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-border"
                  defaultChecked
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Alertas de estoque
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Avisos quando produtos estiverem com estoque baixo
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-border"
                  defaultChecked
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Manutenção de equipamentos
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Lembretes para manutenção preventiva
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-border"
                  defaultChecked
                />
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Segurança
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="current-password">Senha Atual</Label>
                <Input id="current-password" type="password" />
              </div>
              <div>
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input id="new-password" type="password" />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <Button>Alterar Senha</Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Sistema</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versão</span>
                <span className="font-medium text-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Última Atualização</span>
                <span className="font-medium text-foreground">14/11/2024</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-medium text-success">PRO</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Suporte
            </h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                📚 Central de Ajuda
              </Button>
              <Button variant="outline" className="w-full justify-start">
                💬 Falar com Suporte
              </Button>
              <Button variant="outline" className="w-full justify-start">
                🎓 Tutoriais em Vídeo
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
