import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCells } from "@/hooks/useCells";
import { 
  useRoleManagement, 
  ProfileWithRoles, 
  UserRole, 
  ROLE_LABELS, 
  ASSIGNABLE_ROLES 
} from "@/hooks/useRoleManagement";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  AlertTriangle,
  Users,
  Mail,
} from "lucide-react";
import type { ExtendedAppRole } from "@/hooks/useRoleManagement";
import { AdminConvitesTab } from "@/components/admin/AdminConvitesTab";

export default function AdminPapeis() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { cells } = useCells();
  const {
    currentRoleLabel,
    profilesWithRoles,
    isProfilesLoading,
    refetchProfiles,
    grantRole,
    revokeRole,
    isGranting,
    isRevoking,
    getUserRoles,
    getAuditLogs,
    managedCities,
    activeAdminCount,
    checkCanPromote,
    checkCanRevoke,
    logDeniedOperation,
  } = useRoleManagement();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithRoles | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedRoleToRevoke, setSelectedRoleToRevoke] = useState<UserRole | null>(null);
  
  // Grant role form state
  const [newRole, setNewRole] = useState<ExtendedAppRole | "">("");
  const [newCidade, setNewCidade] = useState("");
  const [newRegiao, setNewRegiao] = useState("");
  const [newCellId, setNewCellId] = useState("");
  
  // Revoke form state
  const [revokeReason, setRevokeReason] = useState("");
  
  // Permission check state
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  
  // User history
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Filter profiles by search term
  const filteredProfiles = useMemo(() => {
    if (!searchTerm.trim()) return profilesWithRoles;
    
    const term = searchTerm.toLowerCase();
    return profilesWithRoles.filter(profile => 
      profile.full_name?.toLowerCase().includes(term) ||
      profile.city?.toLowerCase().includes(term) ||
      profile.id.toLowerCase().includes(term)
    );
  }, [profilesWithRoles, searchTerm]);

  // Get unique cities from profiles
  const uniqueCities = useMemo(() => {
    const cities = profilesWithRoles
      .map(p => p.city)
      .filter((city): city is string => !!city);
    return [...new Set(cities)].sort();
  }, [profilesWithRoles]);

  // Get unique states from profiles
  const uniqueStates = useMemo(() => {
    const states = profilesWithRoles
      .map(p => p.state)
      .filter((state): state is string => !!state);
    return [...new Set(states)].sort();
  }, [profilesWithRoles]);

  if (rolesLoading) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  if (!isAdmin()) {
    navigate("/admin");
    return null;
  }

  const handleViewDetails = async (profile: ProfileWithRoles) => {
    setSelectedProfile(profile);
    setDetailsOpen(true);
    
    // Load user's role history
    setIsLoadingHistory(true);
    try {
      const history = await getAuditLogs(profile.id);
      setUserHistory(history);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGrantClick = (profile: ProfileWithRoles) => {
    setSelectedProfile(profile);
    setNewRole("");
    setNewCidade("");
    setNewRegiao("");
    setNewCellId("");
    setPermissionError(null);
    setGrantDialogOpen(true);
  };

  const handleRevokeClick = async (role: UserRole) => {
    // Check permission before opening dialog
    setIsCheckingPermission(true);
    const result = await checkCanRevoke(role.id);
    setIsCheckingPermission(false);
    
    if (!result.allowed) {
      // Log denied attempt
      await logDeniedOperation(role.user_id, "revoke", role.role, result.reason || "Sem permissão");
      toast.error(result.reason || "Você não tem permissão para revogar este papel");
      return;
    }
    
    setSelectedRoleToRevoke(role);
    setRevokeReason("");
    setPermissionError(null);
    setRevokeDialogOpen(true);
  };

  const handleGrantConfirm = async () => {
    if (!selectedProfile || !newRole) {
      toast.error("Selecione um papel");
      return;
    }

    // Check permission before granting
    setIsCheckingPermission(true);
    const result = await checkCanPromote(newRole, newCidade || undefined, newRegiao || undefined);
    setIsCheckingPermission(false);
    
    if (!result.allowed) {
      // Log denied attempt
      await logDeniedOperation(selectedProfile.id, "grant", newRole, result.reason || "Sem permissão");
      setPermissionError(result.reason || "Você não tem permissão para promover a este papel");
      toast.error(result.reason || "Operação não permitida");
      return;
    }

    try {
      await grantRole({
        userId: selectedProfile.id,
        role: newRole,
        cidade: newCidade || undefined,
        regiao: newRegiao || undefined,
        cellId: newCellId || undefined,
      });
      setGrantDialogOpen(false);
      setPermissionError(null);
      refetchProfiles();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!selectedRoleToRevoke || !revokeReason.trim()) {
      toast.error("Informe o motivo da revogação");
      return;
    }

    // Re-check permission before revoking (in case state changed)
    setIsCheckingPermission(true);
    const result = await checkCanRevoke(selectedRoleToRevoke.id);
    setIsCheckingPermission(false);
    
    if (!result.allowed) {
      await logDeniedOperation(selectedRoleToRevoke.user_id, "revoke", selectedRoleToRevoke.role, result.reason || "Sem permissão");
      setPermissionError(result.reason || "Você não tem permissão para revogar este papel");
      toast.error(result.reason || "Operação não permitida");
      return;
    }

    try {
      await revokeRole({
        roleId: selectedRoleToRevoke.id,
        reason: revokeReason.trim(),
      });
      setRevokeDialogOpen(false);
      setSelectedRoleToRevoke(null);
      setPermissionError(null);
      refetchProfiles();
      
      // Reload details if open
      if (detailsOpen && selectedProfile) {
        const updated = profilesWithRoles.find(p => p.id === selectedProfile.id);
        if (updated) {
          setSelectedProfile(updated);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefresh = () => {
    refetchProfiles();
    toast.success("Dados atualizados!");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeColor = (role: ExtendedAppRole) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-600 border-red-500/50";
      case "coordenador_estadual":
        return "bg-purple-500/20 text-purple-600 border-purple-500/50";
      case "coordenador_regional":
        return "bg-blue-500/20 text-blue-600 border-blue-500/50";
      case "coordenador_celula":
        return "bg-green-500/20 text-green-600 border-green-500/50";
      case "moderador_celula":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/50";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Check if role needs scope
  const roleNeedsScope = (role: ExtendedAppRole | "") => {
    if (!role) return false;
    return ["coordenador_celula", "moderador_celula", "coordenador_regional", "coordenador_municipal"].includes(role);
  };

  const roleNeedsCity = (role: ExtendedAppRole | "") => {
    return role === "coordenador_celula" || role === "moderador_celula" || role === "coordenador_municipal";
  };

  const roleNeedsRegion = (role: ExtendedAppRole | "") => {
    return role === "coordenador_regional";
  };

  const roleNeedsCell = (role: ExtendedAppRole | "") => {
    return role === "coordenador_celula" || role === "moderador_celula";
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
        {/* Current Role Info */}
        <div className="card-luta bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <span className="text-sm font-medium">Você está operando como:</span>
            <span className="font-bold">{currentRoleLabel}</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Shield className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Gestão de Papéis</span>
          </div>
          <h1 className="text-2xl font-bold">Permissões de Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Atribua e revogue papéis com escopo para controlar acesso ao sistema
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="convites" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Convites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-4 mt-4">
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
            {isProfilesLoading ? (
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
                      <TableHead className="hidden sm:table-cell">Cidade/Estado</TableHead>
                      <TableHead>Papéis Ativos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
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
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {profile.roles.filter(r => !r.revoked_at).length === 0 ? (
                              <Badge variant="outline" className="text-xs">Voluntário</Badge>
                            ) : (
                              profile.roles
                                .filter(r => !r.revoked_at)
                                .slice(0, 2)
                                .map((role) => (
                                  <Badge 
                                    key={role.id} 
                                    variant="outline" 
                                    className={`text-xs ${getRoleBadgeColor(role.role)}`}
                                  >
                                    {ROLE_LABELS[role.role]}
                                  </Badge>
                                ))
                            )}
                            {profile.roles.filter(r => !r.revoked_at).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{profile.roles.filter(r => !r.revoked_at).length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(profile)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary"
                              onClick={() => handleGrantClick(profile)}
                            >
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
          </TabsContent>

          <TabsContent value="convites" className="mt-4">
            <AdminConvitesTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalhes do Usuário</SheetTitle>
            <SheetDescription>
              Papéis ativos e histórico de alterações
            </SheetDescription>
          </SheetHeader>
          
          {selectedProfile && (
            <div className="space-y-6 mt-6">
              {/* Name & ID */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedProfile.full_name?.[0] || "?"}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedProfile.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedProfile.id}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{selectedProfile.city || "N/A"}, {selectedProfile.state || "N/A"}</span>
              </div>

              {/* Active Roles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Papéis Ativos</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGrantClick(selectedProfile)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Promover
                  </Button>
                </div>
                
                {selectedProfile.roles.filter(r => !r.revoked_at).length === 0 ? (
                  <div className="card-luta text-center py-4">
                    <p className="text-muted-foreground">Apenas voluntário (papel padrão)</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedProfile.roles
                      .filter(r => !r.revoked_at)
                      .map((role) => (
                        <div key={role.id} className="card-luta flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className={getRoleBadgeColor(role.role)}>
                              {ROLE_LABELS[role.role]}
                            </Badge>
                            {(role.cidade || role.regiao || role.cell_id) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Escopo: {role.cidade || role.regiao || `Célula: ${role.cell_id?.slice(0, 8)}...`}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Desde: {formatDate(role.created_at)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevokeClick(role)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* History */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Histórico</h4>
                </div>
                
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : userHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum registro de alteração</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {userHistory.map((log) => (
                      <div key={log.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                        <p className="font-medium">
                          {log.action === "role_granted" ? "Papel atribuído" : "Papel revogado"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {log.new_data?.role || log.old_data?.role}
                          {log.new_data?.reason && ` — Motivo: ${log.new_data.reason}`}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Grant Role Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Papel</DialogTitle>
            <DialogDescription>
              Promova {selectedProfile?.full_name || "o usuário"} a um novo papel com escopo opcional.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Papel</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as ExtendedAppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um papel" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {roleNeedsCity(newRole) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade (escopo)</label>
                <Select value={newCidade} onValueChange={setNewCidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {roleNeedsRegion(newRole) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Região/Estado (escopo)</label>
                <Select value={newRegiao} onValueChange={setNewRegiao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueStates.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {roleNeedsCell(newRole) && cells.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Célula (opcional)</label>
                <Select value={newCellId} onValueChange={setNewCellId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a célula" />
                  </SelectTrigger>
                  <SelectContent>
                    {cells.map((cell) => (
                      <SelectItem key={cell.id} value={cell.id}>{cell.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {permissionError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-destructive font-medium">{permissionError}</p>
                </div>
              </div>
            )}

            {newRole && !permissionError && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-amber-700">
                    Esta ação dará poderes de <strong>{ROLE_LABELS[newRole]}</strong> ao usuário.
                    Certifique-se de que está correto.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="btn-luta" 
              onClick={handleGrantConfirm}
              disabled={isGranting || isCheckingPermission || !newRole}
            >
              {(isGranting || isCheckingPermission) ? <LoadingSpinner size="sm" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Role Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar Papel</DialogTitle>
            <DialogDescription>
              Remova o papel {selectedRoleToRevoke && ROLE_LABELS[selectedRoleToRevoke.role]} deste usuário.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da revogação *</label>
              <Textarea
                placeholder="Informe o motivo da revogação..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
              />
            </div>

            {permissionError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-destructive font-medium">{permissionError}</p>
                </div>
              </div>
            )}

            {!permissionError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-destructive">
                    Esta ação removerá os poderes de <strong>{selectedRoleToRevoke && ROLE_LABELS[selectedRoleToRevoke.role]}</strong>.
                    O registro ficará no histórico para auditoria.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRevokeConfirm}
              disabled={isRevoking || isCheckingPermission || !revokeReason.trim()}
            >
              {(isRevoking || isCheckingPermission) ? <LoadingSpinner size="sm" /> : "Revogar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
