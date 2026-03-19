import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  cidade: string | null;
  regiao: string | null;
  cell_id: string | null;
  created_at: string;
}

export function useUserRoles() {
  const { user } = useAuth();

  const rolesQuery = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .is("revoked_at", null);
      
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!user?.id,
  });

  const roles = rolesQuery.data?.map(r => r.role) ?? [];
  const userRoles = rolesQuery.data ?? [];

  const hasRole = (role: AppRole) => roles.includes(role);
  
  const isCoordinator = () => 
    hasRole("coordenador_celula") || 
    hasRole("coordenador_regional") || 
    hasRole("coordenador_estadual") || 
    hasRole("admin");

  const isAdmin = () => hasRole("admin");
  const isMasterAdmin = () => hasRole("admin");

  // Get scope data from user's roles
  const getScope = () => {
    // Priority: admin (all) > regional > municipal/city > cell
    if (hasRole("admin") || hasRole("coordenador_estadual")) {
      return { type: "all" as const, cidade: null, regiao: null, cellId: null };
    }
    
    const regionalRole = userRoles.find(r => r.role === "coordenador_regional");
    if (regionalRole) {
      return { type: "regiao" as const, cidade: null, regiao: regionalRole.regiao, cellId: null };
    }

    // Look for city-level role (coordenador_celula with cidade scope)
    const cityRole = userRoles.find(r => r.cidade && (r.role === "coordenador_celula" || r.role === "coordenador_regional"));
    if (cityRole) {
      return { type: "cidade" as const, cidade: cityRole.cidade, regiao: null, cellId: cityRole.cell_id };
    }

    const cellRole = userRoles.find(r => r.role === "coordenador_celula" && r.cell_id);
    if (cellRole) {
      return { type: "celula" as const, cidade: cellRole.cidade, regiao: null, cellId: cellRole.cell_id };
    }

    return { type: "none" as const, cidade: null, regiao: null, cellId: null };
  };

  return {
    roles,
    userRoles,
    hasRole,
    isCoordinator,
    isAdmin,
    isMasterAdmin,
    getScope,
    isLoading: rolesQuery.isLoading,
  };
}
