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
      <div className="container max-w-2xl py-6 px-4">
        <Card className="rounded-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Criar sua Equipe</CardTitle>
            <CardDescription className="text-base">
              Crie uma equipe para gerenciar membros e compartilhar acesso aos dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="teamName" className="text-base font-medium">Nome da Equipe</Label>
              <Input
                id="teamName"
                placeholder="Ex: Fazenda São João"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="h-14 text-base rounded-xl"
              />
              <p className="text-sm text-muted-foreground">
                Este será o nome visível para todos os membros
              </p>
            </div>
            <Button 
              className="w-full h-14 text-lg rounded-xl" 
              onClick={handleCreateTeam}
              disabled={isCreating || !newTeamName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-5 w-5" />
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
    <div className="container max-w-4xl py-6 px-4 space-y-5">
      {/* Header do Time */}
      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">{team.name}</CardTitle>
                <CardDescription className="text-base">
                  {members.length} {members.length === 1 ? "membro" : "membros"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-12 px-4 text-base rounded-xl" onClick={() => setEditTeamName(team.name)}>
                      <Pencil className="h-5 w-5 mr-2" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Editar Equipe</DialogTitle>
                      <DialogDescription className="text-base">
                        Altere o nome da sua equipe.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="editName" className="text-base font-medium">Nome da Equipe</Label>
                        <Input
                          id="editName"
                          value={editTeamName}
                          onChange={(e) => setEditTeamName(e.target.value)}
                          className="h-14 text-base rounded-xl"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-12 text-base rounded-xl">
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdateTeam} disabled={updateTeam.isPending} className="h-12 text-base rounded-xl">
                        {updateTeam.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
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
                    <Button className="h-12 px-4 text-base rounded-xl">
                      <UserPlus className="h-5 w-5 mr-2" />
                      Convidar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Convidar Membro</DialogTitle>
                      <DialogDescription className="text-base">
                        Adicione um novo membro à sua equipe. O usuário precisa já ter uma conta no sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-base font-medium">Email do Usuário</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@exemplo.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="h-14 text-base rounded-xl"
                        />
                        <p className="text-sm text-muted-foreground">
                          O usuário receberá acesso imediato após ser adicionado
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-base font-medium">Função</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
                          <SelectTrigger className="h-14 text-base rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="member" className="text-base py-3">
                              <div className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Membro
                              </div>
                            </SelectItem>
                            <SelectItem value="admin" className="text-base py-3">
                              <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Administrador
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Administradores podem ver dados de todos e gerenciar membros.
                        </p>
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} className="h-12 text-base rounded-xl">
                        Cancelar
                      </Button>
                      <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()} className="h-12 text-base rounded-xl">
                        {isInviting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sua Função</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              {userRole && roleIcons[userRole]}
            </div>
            <div>
              <p className="font-semibold text-lg">{userRole && roleLabels[userRole]}</p>
              <p className="text-base text-muted-foreground">
                {userRole === "owner" && "Você tem controle total sobre a equipe."}
                {userRole === "admin" && "Você pode ver todos os dados e gerenciar membros."}
                {userRole === "member" && "Você pode ver apenas seus próprios dados."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Membros */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Membros da Equipe</CardTitle>
          <CardDescription className="text-base">
            Gerencie os membros e suas permissões.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                    {roleIcons[member.role]}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {member.profile?.full_name || "Usuário"}
                    </p>
                    <p className="text-base text-muted-foreground">
                      {member.profile?.email || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin && member.role !== "owner" ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.id, v as TeamRole)}
                        disabled={updateMemberRole.isPending}
                      >
                        <SelectTrigger className="w-[160px] h-12 text-base rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="member" className="text-base py-3">Membro</SelectItem>
                          <SelectItem value="admin" className="text-base py-3">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-12 w-12 text-destructive hover:text-destructive rounded-xl">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">Remover Membro</AlertDialogTitle>
                            <AlertDialogDescription className="text-base">
                              Tem certeza que deseja remover {member.profile?.full_name || "este usuário"} da equipe?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-3">
                            <AlertDialogCancel className="h-12 text-base rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 text-base rounded-xl"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <Badge variant={roleBadgeVariants[member.role]} className="text-base px-4 py-2">
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
