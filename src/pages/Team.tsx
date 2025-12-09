import { useState } from "react";
import { useTeam, TeamRole } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Users, UserPlus, Crown, Shield, User, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido").max(255, "Email muito longo");
const teamNameSchema = z.string().min(2, "Nome muito curto").max(100, "Nome muito longo");

const roleLabels: Record<TeamRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

const roleIcons: Record<TeamRole, React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  member: <User className="h-4 w-4 text-muted-foreground" />,
};

const roleBadgeVariants: Record<TeamRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
};

export default function Team() {
  const {
    team,
    members,
    userRole,
    isAdmin,
    isOwner,
    isLoading,
    createTeam,
    updateTeam,
    addMember,
    updateMemberRole,
    removeMember,
  } = useTeam();

  const [newTeamName, setNewTeamName] = useState("");
  const [editTeamName, setEditTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const handleCreateTeam = async () => {
    try {
      teamNameSchema.parse(newTeamName);
      setIsCreating(true);
      await createTeam.mutateAsync(newTeamName);
      setNewTeamName("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTeam = async () => {
    try {
      if (!team) return;
      teamNameSchema.parse(editTeamName);
      await updateTeam.mutateAsync({ id: team.id, name: editTeamName });
      setIsEditDialogOpen(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  const handleInvite = async () => {
    try {
      emailSchema.parse(inviteEmail);
      setIsInviting(true);
      await addMember.mutateAsync({ email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      setInviteRole("member");
      setIsInviteDialogOpen(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    await updateMemberRole.mutateAsync({ memberId, role: newRole });
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeMember.mutateAsync(memberId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não tem time, mostrar opção de criar
  if (!team) {
    return (
      <div className="container max-w-2xl py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Criar sua Equipe</CardTitle>
            <CardDescription>
              Crie uma equipe para gerenciar membros e compartilhar acesso aos dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Nome da Equipe</Label>
              <Input
                id="teamName"
                placeholder="Ex: Fazenda São João"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleCreateTeam}
              disabled={isCreating || !newTeamName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Criar Equipe
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4 space-y-6">
      {/* Header do Time */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>
                  {members.length} {members.length === 1 ? "membro" : "membros"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditTeamName(team.name)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Equipe</DialogTitle>
                      <DialogDescription>
                        Altere o nome da sua equipe.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="editName">Nome da Equipe</Label>
                        <Input
                          id="editName"
                          value={editTeamName}
                          onChange={(e) => setEditTeamName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdateTeam} disabled={updateTeam.isPending}>
                        {updateTeam.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {isAdmin && (
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convidar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convidar Membro</DialogTitle>
                      <DialogDescription>
                        Adicione um novo membro à sua equipe. O usuário precisa já ter uma conta no sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email do Usuário</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@exemplo.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Função</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Membro
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Administrador
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Administradores podem ver dados de todos e gerenciar membros.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                        {isInviting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Convidando...
                          </>
                        ) : (
                          "Convidar"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sua função */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sua Função</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {userRole && roleIcons[userRole]}
            <div>
              <p className="font-medium">{userRole && roleLabels[userRole]}</p>
              <p className="text-sm text-muted-foreground">
                {userRole === "owner" && "Você tem controle total sobre a equipe."}
                {userRole === "admin" && "Você pode ver todos os dados e gerenciar membros."}
                {userRole === "member" && "Você pode ver apenas seus próprios dados."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Membros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros da Equipe</CardTitle>
          <CardDescription>
            Gerencie os membros e suas permissões.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {roleIcons[member.role]}
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.profile?.full_name || "Usuário"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.profile?.email || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && member.role !== "owner" ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.id, v as TeamRole)}
                        disabled={updateMemberRole.isPending}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover {member.profile?.full_name || "este usuário"} da equipe?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <Badge variant={roleBadgeVariants[member.role]}>
                      {roleLabels[member.role]}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
