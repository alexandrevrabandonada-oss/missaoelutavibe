/**
 * AdminRoles - Scoped RBAC Management v0
 * 
 * Admin-only page for managing user roles with scope.
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useScopedRoles, ROLE_LABELS, SCOPE_TYPE_LABELS, type ScopeType, type ScopedRole } from "@/hooks/useScopedRoles";
import { useCells } from "@/hooks/useCells";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UserScopeBadge } from "@/components/admin/UserScopeBadge";
import { RoleHistorySheet } from "@/components/admin/RoleHistorySheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Shield,
  Search,
  ArrowLeft,
  RefreshCw,
  Home,
  LogOut,
  Eye,
  UserPlus,
  UserMinus,
  History,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { focusRingClass } from "@/utils/a11y";

interface ProfileWithRoles {
  id: string;
  full_name: string | null;
  city: string | null;
  state: string | null;
}

const ASSIGNABLE_ROLES = [
  "moderador_celula",
  "coordenador_celula",
  "coordenador_municipal",
  "coordenador_regional",
  "coordenador_estadual",
  "admin",
];

export default function AdminRoles() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { scope, isLoadingScope, isAdmin, getUserRoles, grantRole, revokeRole, isGranting, isRevoking } = useScopedRoles();
  const { cells } = useCells();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithRoles | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<ScopedRole[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRoleToRevoke, setSelectedRoleToRevoke] = useState<ScopedRole | null>(null);
  
  // Grant form state
  const [newRole, setNewRole] = useState("");
  const [newScopeType, setNewScopeType] = useState<ScopeType>("global");
  const [newScopeState, setNewScopeState] = useState("");
  const [newScopeCity, setNewScopeCity] = useState("");
  const [newScopeCellId, setNewScopeCellId] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  
  // Revoke form state
  const [revokeReason, setRevokeReason] = useState("");

  // Fetch profiles
  const profilesQuery = useQuery({
    queryKey: ["admin-profiles-for-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, city, state")
        .eq("volunteer_status", "ativo")
        .order("full_name");
      
      if (error) throw error;
      return data as ProfileWithRoles[];
    },
  });

  const filteredProfiles = useMemo(() => {
    if (!searchTerm.trim()) return profilesQuery.data || [];
    
    const term = searchTerm.toLowerCase();
    return (profilesQuery.data || []).filter(profile => 
      profile.full_name?.toLowerCase().includes(term) ||
      profile.city?.toLowerCase().includes(term) ||
      profile.id.toLowerCase().includes(term)
    );
  }, [profilesQuery.data, searchTerm]);

  const uniqueCities = useMemo(() => {
    const cities = (profilesQuery.data || [])
      .map(p => p.city)
      .filter((city): city is string => !!city);
    return [...new Set(cities)].sort();
  }, [profilesQuery.data]);

  const uniqueStates = useMemo(() => {
    const states = (profilesQuery.data || [])
      .map(p => p.state)
      .filter((state): state is string => !!state);
    return [...new Set(states)].sort();
  }, [profilesQuery.data]);

  if (isLoadingScope) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  if (!isAdmin()) {
    navigate("/admin");
    return null;
  }

  const handleViewDetails = async (profile: ProfileWithRoles) => {
    setSelectedProfile(profile);
    try {
      const roles = await getUserRoles(profile.id);
      setSelectedUserRoles(roles);
    } catch (e) {
      console.error(e);
      setSelectedUserRoles([]);
    }
    setDetailsOpen(true);
  };

  const handleGrantClick = (profile: ProfileWithRoles) => {
    setSelectedProfile(profile);
    setNewRole("");
    setNewScopeType("global");
    setNewScopeState("");
    setNewScopeCity("");
    setNewScopeCellId("");
    setNewExpiresAt("");
    setGrantDialogOpen(true);
  };

  const handleRevokeClick = (role: ScopedRole) => {
    setSelectedRoleToRevoke(role);
    setRevokeReason("");
    setRevokeDialogOpen(true);
  };

  const handleGrantConfirm = async () => {
    if (!selectedProfile || !newRole) {
      toast.error("Selecione um papel");
      return;
    }

    try {
      await grantRole({
        targetUserId: selectedProfile.id,
        role: newRole,
        scopeType: newScopeType,
        scopeState: newScopeState || undefined,
        scopeCity: newScopeCity || undefined,
        scopeCellId: newScopeCellId || undefined,
        expiresAt: newExpiresAt || undefined,
      });
      setGrantDialogOpen(false);
      profilesQuery.refetch();
      
      // Refresh user roles if viewing details
      if (detailsOpen && selectedProfile) {
        const roles = await getUserRoles(selectedProfile.id);
        setSelectedUserRoles(roles);
      }
    } catch (e) {
      // Error handled in mutation
    }
  };

  const handleRevokeConfirm = async () => {
    if (!selectedRoleToRevoke || !revokeReason.trim()) {
      toast.error("Informe o motivo da revogação");
      return;
    }

    try {
      await revokeRole({
        roleId: selectedRoleToRevoke.id,
        reason: revokeReason.trim(),
      });
      setRevokeDialogOpen(false);
      setSelectedRoleToRevoke(null);
      
      // Refresh user roles if viewing details
      if (detailsOpen && selectedProfile) {
        const roles = await getUserRoles(selectedProfile.id);
        setSelectedUserRoles(roles);
      }
    } catch (e) {
      // Error handled in mutation
    }
  };

  const handleRefresh = () => {
    profilesQuery.refetch();
    toast.success("Dados atualizados!");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const roleNeedsScopeType = (role: string) => {
    return ["coordenador_celula", "moderador_celula", "coordenador_municipal", "coordenador_regional"].includes(role);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-600 border-red-500/50";
      case "coordenador_estadual":
        return "bg-purple-500/20 text-purple-600 border-purple-500/50";
      case "coordenador_regional":
        return "bg-blue-500/20 text-blue-600 border-blue-500/50";
      case "coordenador_municipal":
        return "bg-cyan-500/20 text-cyan-600 border-cyan-500/50";
      case "coordenador_celula":
        return "bg-green-500/20 text-green-600 border-green-500/50";
      case "moderador_celula":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/50";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
              Admin
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
              <Home className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {/* Current Scope */}
        <UserScopeBadge />

        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Shield className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">RBAC</span>
          </div>
          <h1 className="text-2xl font-bold">Gestão de Papéis com Escopo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Atribua papéis com escopo geográfico (estado, cidade, célula) e expiração opcional
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade ou UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {profilesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="card-luta text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-bold text-lg">Nenhum usuário encontrado</p>
            <p className="text-muted-foreground">Tente ajustar a busca.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="hidden sm:table-cell">Local</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.slice(0, 50).map((profile) => (
                  <TableRow 
                    key={profile.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(profile)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {profile.full_name?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-medium">{profile.full_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{profile.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {profile.city || "N/A"}, {profile.state || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => handleViewDetails(profile)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-primary" onClick={() => handleGrantClick(profile)}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {selectedProfile?.full_name || "Usuário"}
            </DialogTitle>
            <DialogDescription>
              {selectedProfile?.city}, {selectedProfile?.state}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Papéis Ativos</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHistoryOpen(true);
                  }}
                >
                  <History className="h-4 w-4 mr-1" />
                  Histórico
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleGrantClick(selectedProfile!)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Atribuir
                </Button>
              </div>
            </div>

            {selectedUserRoles.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Nenhum papel atribuído (Voluntário padrão)
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedUserRoles.map((role) => (
                  <li key={role.id} className="border rounded-lg p-3 flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Badge variant="outline" className={getRoleBadgeColor(role.role)}>
                        {ROLE_LABELS[role.role] || role.role}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        <span>Escopo: {SCOPE_TYPE_LABELS[role.scope_type as ScopeType] || role.scope_type}</span>
                        {role.scope_city && <span> ({role.scope_city})</span>}
                        {role.cell_name && <span> ({role.cell_name})</span>}
                      </div>
                      {role.expires_at && (
                        <div className="text-xs text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expira: {format(new Date(role.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleRevokeClick(role)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Papel</DialogTitle>
            <DialogDescription>
              Conceda um papel com escopo para {selectedProfile?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Role */}
            <div>
              <label className="text-sm font-medium">Papel *</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o papel..." />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role] || role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scope Type */}
            {roleNeedsScopeType(newRole) && (
              <div>
                <label className="text-sm font-medium">Tipo de Escopo *</label>
                <Select value={newScopeType} onValueChange={(v) => setNewScopeType(v as ScopeType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="estado">Estado</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="cidade">Cidade</SelectItem>
                    <SelectItem value="celula">Célula</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* State */}
            {(newScopeType === "estado" || newScopeType === "regional") && (
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={newScopeState} onValueChange={setNewScopeState}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* City */}
            {newScopeType === "cidade" && (
              <div>
                <label className="text-sm font-medium">Cidade</label>
                <Select value={newScopeCity} onValueChange={setNewScopeCity}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cell */}
            {newScopeType === "celula" && (
              <div>
                <label className="text-sm font-medium">Célula</label>
                <Select value={newScopeCellId} onValueChange={setNewScopeCellId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cells.map((cell) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name} ({cell.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Expiration */}
            <div>
              <label className="text-sm font-medium">Expira em (opcional)</label>
              <Input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para não expirar
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGrantConfirm} disabled={isGranting || !newRole}>
              {isGranting ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Revogar Papel</DialogTitle>
            <DialogDescription>
              Você está prestes a revogar o papel{" "}
              <strong>{ROLE_LABELS[selectedRoleToRevoke?.role || ""] || selectedRoleToRevoke?.role}</strong>.
              Esta ação será registrada no histórico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo da revogação *</label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Descreva o motivo..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeConfirm}
              disabled={isRevoking || !revokeReason.trim()}
            >
              {isRevoking ? "Revogando..." : "Revogar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Sheet */}
      {selectedProfile && (
        <RoleHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          userId={selectedProfile.id}
          userName={selectedProfile.full_name || undefined}
        />
      )}
    </div>
  );
}
