import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useAdminBootstrap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check how many admins exist using the SECURITY DEFINER function
  const adminCountQuery = useQuery({
    queryKey: ["admin-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_count");
      if (error) throw error;
      return data as number;
    },
    enabled: !!user?.id,
  });

  // Check if current user is already an admin (from admins table directly)
  const isCurrentUserAdminQuery = useQuery({
    queryKey: ["is-current-user-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Try to select from admins - will succeed if user is admin
      const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      // If error, user is not admin (RLS blocks non-admins from reading)
      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Mutation to bootstrap admin
  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("admins")
        .insert({ user_id: user.id });
      
      if (error) throw error;

      // Also add admin role to user_roles table
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "admin" as const });
      
      if (roleError) {
        console.warn("Erro ao adicionar role admin (pode já existir):", roleError);
      }
    },
    onSuccess: () => {
      toast.success("Admin Master ativado com sucesso!", {
        description: "Você agora tem poderes administrativos totais.",
      });
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["admin-count"] });
      queryClient.invalidateQueries({ queryKey: ["is-current-user-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
    },
    onError: (error: Error) => {
      console.error("Erro ao ativar admin:", error);
      if (error.message.includes("violates row-level security")) {
        toast.error("Não é possível ativar admin", {
          description: "Já existe um admin configurado no sistema.",
        });
      } else {
        toast.error("Erro ao ativar admin", {
          description: error.message,
        });
      }
    },
  });

  const canBootstrap = 
    adminCountQuery.data === 0 && 
    !isCurrentUserAdminQuery.data &&
    !!user?.id;

  const needsBootstrap = adminCountQuery.data === 0;
  const isAdmin = isCurrentUserAdminQuery.data === true;

  return {
    adminCount: adminCountQuery.data ?? null,
    isAdmin,
    canBootstrap,
    needsBootstrap,
    isLoading: adminCountQuery.isLoading || isCurrentUserAdminQuery.isLoading,
    bootstrap: bootstrapMutation.mutate,
    isBootstrapping: bootstrapMutation.isPending,
    user,
  };
}
