import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoleInvites, ASSIGNABLE_ROLES } from "@/hooks/useRoleInvites";
import { useCells } from "@/hooks/useCells";
import { useProfile } from "@/hooks/useProfile";
import { 
  Plus, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  Trash2,
  Mail,
  User,
  MapPin
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isWithinInterval, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdminConvitesTab() {
  const { profile } = useProfile();
  const { cells } = useCells();
  const {
    allInvites,
    isAllInvitesLoading,
    refetchInvites,
    inviteStats,
    createInvite,
    isCreating,
    revokeInvite,
    isRevoking,
    resendInvite,
    isResending,
  } = useRoleInvites();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formScopeTipo, setFormScopeTipo] = useState<string>("");
  const [formScopeId, setFormScopeId] = useState<string>("");
  const [formRoleKey, setFormRoleKey] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");

  const handleCreate = async () => {
    if (!formScopeTipo || !formScopeId || !formRoleKey || !formEmail) return;
    
    try {
      await createInvite({
        scopeTipo: formScopeTipo,
        scopeId: formScopeId,
        roleKey: formRoleKey,
        invitedEmail: formEmail,
      });
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setFormScopeTipo("");
    setFormScopeId("");
    setFormRoleKey("");
    setFormEmail("");
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm("Tem certeza que deseja revogar este convite?")) return;
    await revokeInvite(inviteId);
  };

  const handleResend = async (inviteId: string) => {
    await resendInvite(inviteId);
  };

  const getStatusBadge = (invite: typeof allInvites[0]) => {
    const expiresAt = new Date(invite.expires_at);
    
    if (invite.status === "aceito") {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
        <CheckCircle className="h-3 w-3 mr-1" /> Aceito
      </Badge>;
    }
    if (invite.status === "revogado") {
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
        <XCircle className="h-3 w-3 mr-1" /> Revogado
      </Badge>;
    }
    if (invite.status === "expirado" || isPast(expiresAt)) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">
        <Clock className="h-3 w-3 mr-1" /> Expirado
      </Badge>;
    }
    
    // Check if expiring soon (within 48h)
    const isExpiringSoon = isWithinInterval(expiresAt, {
      start: new Date(),
      end: addHours(new Date(), 48),
    });
    
    if (isExpiringSoon) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
        <Clock className="h-3 w-3 mr-1" /> Expirando
      </Badge>;
    }
    
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
      <Clock className="h-3 w-3 mr-1" /> Pendente
    </Badge>;
  };

  const filteredInvites = allInvites.filter(invite => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pendente") return invite.status === "pendente" && !isPast(new Date(invite.expires_at));
    return invite.status === statusFilter;
  });

  const getScopeOptions = () => {
    if (formScopeTipo === "celula") {
      return cells.map(c => ({ value: c.id, label: c.name }));
    }
    if (formScopeTipo === "cidade") {
      return [{ value: profile?.city || "", label: profile?.city || "Cidade" }];
    }
    if (formScopeTipo === "estado") {
      return [{ value: profile?.state || "", label: profile?.state || "Estado" }];
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{inviteStats?.total_pendentes || 0}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{inviteStats?.expirando_48h || 0}</div>
            <p className="text-xs text-muted-foreground">Expirando 48h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{inviteStats?.aceitos_7d || 0}</div>
            <p className="text-xs text-muted-foreground">Aceitos (7d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{inviteStats?.revogados_7d || 0}</div>
            <p className="text-xs text-muted-foreground">Revogados (7d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Convite
          </Button>
          <Button variant="outline" onClick={() => refetchInvites()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aceito">Aceitos</SelectItem>
            <SelectItem value="expirado">Expirados</SelectItem>
            <SelectItem value="revogado">Revogados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invites Table */}
      <Card>
        <CardContent className="p-0">
          {isAllInvitesLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando convites...
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum convite encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {invite.invited_user_name ? (
                          <>
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{invite.invited_user_name}</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{invite.invited_email}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ASSIGNABLE_ROLES.find(r => r.value === invite.role_key)?.label || invite.role_key}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {invite.scope_tipo}: {invite.scope_id}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invite)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {invite.status === "pendente" && !isPast(new Date(invite.expires_at)) && (
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleResend(invite.id)}
                            disabled={isResending}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRevoke(invite.id)}
                            disabled={isRevoking}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                      {(invite.status === "expirado" || isPast(new Date(invite.expires_at))) && invite.status !== "aceito" && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleResend(invite.id)}
                          disabled={isResending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Convite de Papel</DialogTitle>
            <DialogDescription>
              Convide alguém para assumir um papel no movimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email do Convidado</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={formRoleKey} onValueChange={setFormRoleKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Escopo</Label>
              <Select value={formScopeTipo} onValueChange={(v) => { setFormScopeTipo(v); setFormScopeId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celula">Célula</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="estado">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formScopeTipo && (
              <div className="space-y-2">
                <Label>Escopo</Label>
                <Select value={formScopeId} onValueChange={setFormScopeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    {getScopeOptions().map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isCreating || !formEmail || !formRoleKey || !formScopeTipo || !formScopeId}
            >
              {isCreating ? "Criando..." : "Criar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
