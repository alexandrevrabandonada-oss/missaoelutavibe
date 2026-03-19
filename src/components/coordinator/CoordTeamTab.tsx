/**
 * CoordTeamTab - Team management for coordinators
 * 
 * Allows granting/revoking coord_roles:
 * - COORD_GLOBAL: Full coordination access (admin-only)
 * - COORD_CITY: City-level coordination
 * - CELL_COORD: Cell-level coordination
 * 
 * No PII displayed - uses V#XXXXXX codes only.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCoordRoles, type CoordRoleType, COORD_ROLE_LABELS } from "@/hooks/useCoordRoles";
import { useCityCells, type CityCell } from "@/hooks/useCellOps";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertTriangle,
  Copy,
  Crown,
  Globe,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

interface CoordTeamTabProps {
  selectedCityId: string | null;
  selectedCityName?: string;
}

// Hook to get caller's coordination level
function useCallerCoordLevel() {
  return useQuery({
    queryKey: ["caller-coord-level"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_caller_coord_level");
      if (error) throw error;
      return data as string | null;
    },
    staleTime: 60000,
  });
}

export function CoordTeamTab({ selectedCityId, selectedCityName }: CoordTeamTabProps) {
  const { isAdmin } = useUserRoles();
  const isAdminUser = isAdmin();
  const { data: callerLevel, isLoading: levelLoading } = useCallerCoordLevel();
  
  const { roles, isLoading, grantRole, isGranting, revokeRole, isRevoking } = useCoordRoles(
    isAdminUser ? null : selectedCityId // Admins see all, coordinators see their city
  );
  const { data: cells = [] } = useCityCells(selectedCityId);

  // Determine what roles the caller can grant/revoke (P2 Safe Delegation)
  const canGrantGlobal = callerLevel === "ADMIN_MASTER";
  const canGrantCity = callerLevel === "ADMIN_MASTER" || callerLevel === "COORD_GLOBAL";
  const canGrantCell = callerLevel === "ADMIN_MASTER" || callerLevel === "COORD_GLOBAL" || callerLevel === "COORD_CITY";

  // Form state
  const [userCode, setUserCode] = useState("");
  const [selectedRole, setSelectedRole] = useState<CoordRoleType | "">("");
  const [selectedCellId, setSelectedCellId] = useState<string>("");
  
  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<{
    userId: string;
    role: CoordRoleType;
    cityId: string | null;
    cellId: string | null;
    userCode: string;
  } | null>(null);

  // Extract user_id from code (V#XXXXXX or raw UUID)
  const parseUserCode = (code: string): string | null => {
    const trimmed = code.trim();
    
    // If it looks like a full UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      return trimmed;
    }
    
    // If it's a V# code, we can't reverse it - user needs to provide full UUID
    if (trimmed.startsWith("V#") || trimmed.startsWith("v#")) {
      toast.error("Use o UUID completo do usuário, não o código V#");
      return null;
    }
    
    // Try as raw UUID
    if (/^[0-9a-f-]+$/i.test(trimmed) && trimmed.length >= 32) {
      return trimmed;
    }
    
    toast.error("Formato de código inválido. Use o UUID completo.");
    return null;
  };

  // Handle grant
  const handleGrant = async () => {
    if (!selectedRole) {
      toast.error("Selecione um papel");
      return;
    }

    const userId = parseUserCode(userCode);
    if (!userId) return;

    // Validate scope requirements
    if (selectedRole === "COORD_CITY" && !selectedCityId) {
      toast.error("Selecione uma cidade primeiro");
      return;
    }

    if (selectedRole === "CELL_COORD" && !selectedCellId) {
      toast.error("Selecione uma célula");
      return;
    }

    try {
      await grantRole({
        userId,
        role: selectedRole,
        cityId: selectedRole === "COORD_CITY" ? selectedCityId || undefined : 
                selectedRole === "CELL_COORD" ? (cells.find(c => c.id === selectedCellId) as any)?.cidade_id || selectedCityId || undefined : 
                undefined,
        cellId: selectedRole === "CELL_COORD" ? selectedCellId : undefined,
      });

      // Reset form
      setUserCode("");
      setSelectedRole("");
      setSelectedCellId("");
    } catch (err) {
      // Error already toasted by hook
    }
  };

  // Handle revoke
  const handleRevoke = async () => {
    if (!revokeTarget) return;

    try {
      await revokeRole({
        userId: revokeTarget.userId,
        role: revokeTarget.role,
        cityId: revokeTarget.cityId || undefined,
        cellId: revokeTarget.cellId || undefined,
      });
    } catch (err) {
      // Error already toasted by hook
    } finally {
      setRevokeTarget(null);
    }
  };

  // Copy user code to clipboard
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  // Role badge colors
  const getRoleBadgeProps = (role: CoordRoleType) => {
    switch (role) {
      case "COORD_GLOBAL":
        return { className: "bg-purple-500/10 text-purple-700 border-purple-500" };
      case "COORD_CITY":
        return { className: "bg-blue-500/10 text-blue-700 border-blue-500" };
      case "CELL_COORD":
        return { className: "bg-green-500/10 text-green-700 border-green-500" };
      default:
        return {};
    }
  };

  // Role icon
  const getRoleIcon = (role: CoordRoleType) => {
    switch (role) {
      case "COORD_GLOBAL":
        return <Globe className="h-4 w-4" />;
      case "COORD_CITY":
        return <MapPin className="h-4 w-4" />;
      case "CELL_COORD":
        return <Crown className="h-4 w-4" />;
    }
  };

  // Filter roles to display
  const displayRoles = roles.filter(r => {
    if (isAdminUser) return true;
    // Non-admins only see roles in their city
    if (r.role === "COORD_GLOBAL") return true; // Show globals for reference
    return r.city_id === selectedCityId || 
           (r.cell_id && cells.some(c => c.id === r.cell_id));
  });

  return (
    <div className="space-y-4">
      {/* Grant Role Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Coordenador
          </CardTitle>
          <CardDescription>
            Conceda papel de coordenação a um voluntário usando o UUID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">UUID do Voluntário</label>
              <Input
                placeholder="Cole o UUID completo aqui..."
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O voluntário pode copiar seu código em "Eu" → "Meu código"
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Papel</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as CoordRoleType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o papel..." />
                </SelectTrigger>
                <SelectContent>
                    {canGrantGlobal && (
                    <SelectItem value="COORD_GLOBAL">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-purple-600" />
                        Coordenador Geral
                      </div>
                    </SelectItem>
                  )}
                    {selectedCityId && canGrantCity && (
                    <SelectItem value="COORD_CITY">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Coordenador de Cidade
                      </div>
                    </SelectItem>
                  )}
                    {selectedCityId && cells.length > 0 && canGrantCell && (
                    <SelectItem value="CELL_COORD">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-green-600" />
                        Coordenador de Célula
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cell selector for CELL_COORD */}
          {selectedRole === "CELL_COORD" && selectedCityId && (
            <div>
              <label className="text-sm font-medium">Célula</label>
              <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a célula..." />
                </SelectTrigger>
                <SelectContent>
                  {cells.filter(c => c.is_active).map((cell) => (
                    <SelectItem key={cell.id} value={cell.id}>
                      {cell.name} {cell.neighborhood && `(${cell.neighborhood})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hint about hierarchy */}
          {!isAdminUser && callerLevel === "COORD_GLOBAL" && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-700">
                <p className="font-medium">Coordenação Global ≠ Admin Master</p>
                <p className="text-muted-foreground">
                  Você pode conceder COORD_CITY e CELL_COORD, mas não COORD_GLOBAL.
                </p>
              </div>
            </div>
          )}

          {callerLevel === "COORD_CITY" && (
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium">Escopo: Coordenador de Cidade</p>
                <p className="text-muted-foreground">
                  Você pode conceder apenas CELL_COORD dentro da sua cidade.
                </p>
              </div>
            </div>
          )}

          <Button 
            onClick={handleGrant} 
            disabled={isGranting || !userCode || !selectedRole}
            className="w-full md:w-auto"
          >
            {isGranting ? "Concedendo..." : "Conceder Papel"}
          </Button>
        </CardContent>
      </Card>

      {/* Roles List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipe de Coordenação
            {displayRoles.length > 0 && (
              <Badge variant="outline" className="ml-2">{displayRoles.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isAdminUser 
              ? "Todos os coordenadores do sistema" 
              : selectedCityName 
                ? `Coordenadores de ${selectedCityName}` 
                : "Selecione uma cidade para ver a equipe"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : displayRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum coordenador cadastrado</p>
              <p className="text-sm">Use o formulário acima para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getRoleIcon(role.role)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {role.user_code}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(role.user_id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" {...getRoleBadgeProps(role.role)}>
                          {COORD_ROLE_LABELS[role.role]}
                        </Badge>
                        {role.city_name && (
                          <span className="text-xs text-muted-foreground">
                            {role.city_name}
                          </span>
                        )}
                        {role.cell_name && (
                          <span className="text-xs text-muted-foreground">
                            → {role.cell_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Only show revoke if caller can revoke this role */}
                  {(
                    (role.role === "COORD_GLOBAL" && canGrantGlobal) ||
                    (role.role === "COORD_CITY" && canGrantCity) ||
                    (role.role === "CELL_COORD" && canGrantCell)
                  ) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setRevokeTarget({
                        userId: role.user_id,
                        role: role.role,
                        cityId: role.city_id,
                        cellId: role.cell_id,
                        userCode: role.user_code,
                      })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar papel de coordenação?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget && (
                <>
                  Você está prestes a remover o papel de{" "}
                  <strong>{COORD_ROLE_LABELS[revokeTarget.role]}</strong> do voluntário{" "}
                  <strong>{revokeTarget.userCode}</strong>.
                  <br /><br />
                  Esta ação pode ser revertida concedendo o papel novamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? "Revogando..." : "Revogar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
