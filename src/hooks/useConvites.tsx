import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Convite {
  id: string;
  code: string;
  criado_por: string;
  escopo_cidade: string | null;
  escopo_regiao: string | null;
  escopo_celula: string | null;
  campanha_tag: string;
  canal_declarado: string | null;
  limite_uso: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface ConviteUso {
  id: string;
  convite_id: string;
  usado_por: string;
  usado_em: string;
}

export interface ConviteStats {
  total_convites: number;
  total_usos: number;
  cadastros_com_convite: number;
  cadastros_sem_convite: number;
}

export interface ConviteComUsos extends Convite {
  usos: ConviteUso[];
  total_usos: number;
}

const CANAIS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter/X" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "E-mail" },
  { value: "rua", label: "Panfletagem/Rua" },
  { value: "evento", label: "Evento Presencial" },
  { value: "outro", label: "Outro" },
];

export { CANAIS };

export function useConvites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's own invites
  const convitesQuery = useQuery({
    queryKey: ["convites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Using 'as any' until types are regenerated with new tables
      const { data, error } = await (supabase as any)
        .from("convites")
        .select("*")
        .eq("criado_por", user.id)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data as Convite[];
    },
    enabled: !!user?.id,
  });

  // Fetch usage for user's invites
  const usosQuery = useQuery({
    queryKey: ["convites-usos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's invite IDs first
      const { data: convites } = await (supabase as any)
        .from("convites")
        .select("id")
        .eq("criado_por", user.id);

      if (!convites || convites.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("convites_usos")
        .select("*")
        .in("convite_id", convites.map((c: any) => c.id))
        .order("usado_em", { ascending: false });

      if (error) throw error;
      return data as ConviteUso[];
    },
    enabled: !!user?.id,
  });

  // Get combined data with usage counts
  const convitesComUsos: ConviteComUsos[] = (convitesQuery.data || []).map((convite) => {
    const usos = (usosQuery.data || []).filter((u) => u.convite_id === convite.id);
    return {
      ...convite,
      usos,
      total_usos: usos.length,
    };
  });

  // Create new invite
  const createConviteMutation = useMutation({
    mutationFn: async (data: {
      canal_declarado?: string;
      escopo_cidade?: string;
      escopo_regiao?: string;
      campanha_tag?: string;
      limite_uso?: number;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Generate unique code using RPC
      const { data: codeResult } = await (supabase as any).rpc("generate_invite_code");
      const code = codeResult as string;

      const { data: result, error } = await (supabase as any)
        .from("convites")
        .insert({
          code,
          criado_por: user.id,
          canal_declarado: data.canal_declarado || null,
          escopo_cidade: data.escopo_cidade || null,
          escopo_regiao: data.escopo_regiao || null,
          campanha_tag: data.campanha_tag || "pre-campanha",
          limite_uso: data.limite_uso || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convites"] });
    },
  });

  // Update invite
  const updateConviteMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      canal_declarado?: string;
      ativo?: boolean;
      limite_uso?: number | null;
    }) => {
      const { data, error } = await (supabase as any)
        .from("convites")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convites"] });
    },
  });

  // Register invite usage (called after signup)
  const registerUsageMutation = useMutation({
    mutationFn: async ({ code, userId }: { code: string; userId: string }) => {
      const { data, error } = await (supabase as any).rpc("register_invite_usage", {
        _code: code,
        _user_id: userId,
      });

      if (error) throw error;
      return data;
    },
  });

  // Validate invite code
  const validateInvite = async (code: string): Promise<boolean> => {
    const { data, error } = await (supabase as any).rpc("is_invite_valid", { _code: code });
    if (error) return false;
    return data as boolean;
  };

  return {
    // Data
    convites: convitesQuery.data || [],
    convitesComUsos,
    isLoading: convitesQuery.isLoading,
    error: convitesQuery.error,

    // Mutations
    createConvite: createConviteMutation.mutate,
    createConviteAsync: createConviteMutation.mutateAsync,
    isCreating: createConviteMutation.isPending,

    updateConvite: updateConviteMutation.mutate,
    isUpdating: updateConviteMutation.isPending,

    registerUsage: registerUsageMutation.mutateAsync,

    // Helpers
    validateInvite,
  };
}

// Hook for admin stats
export function useConviteStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["convite-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any).rpc("get_invite_stats_for_scope", {
        _user_id: user.id,
      });

      if (error) throw error;
      
      // RPC returns array, get first row
      const stats = Array.isArray(data) ? data[0] : data;
      return stats as ConviteStats;
    },
    enabled: !!user?.id,
  });
}

// Hook for admin to view all invites with usage
export function useAdminConvites() {
  const { user } = useAuth();

  const convitesQuery = useQuery({
    queryKey: ["admin-convites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from("convites")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data as Convite[];
    },
    enabled: !!user?.id,
  });

  const usosQuery = useQuery({
    queryKey: ["admin-convites-usos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from("convites_usos")
        .select("*")
        .order("usado_em", { ascending: false });

      if (error) throw error;
      return data as ConviteUso[];
    },
    enabled: !!user?.id,
  });

  // Combine data
  const convitesComUsos: ConviteComUsos[] = (convitesQuery.data || []).map((convite) => {
    const usos = (usosQuery.data || []).filter((u) => u.convite_id === convite.id);
    return {
      ...convite,
      usos,
      total_usos: usos.length,
    };
  });

  return {
    convites: convitesQuery.data || [],
    convitesComUsos,
    usos: usosQuery.data || [],
    isLoading: convitesQuery.isLoading || usosQuery.isLoading,
    error: convitesQuery.error || usosQuery.error,
  };
}

// Types for chain and funnel
export interface ChainMember {
  depth: number;
  user_id: string;
  user_name: string | null;
  user_city: string | null;
  invited_by: string | null;
  invite_code: string | null;
  invite_channel: string | null;
  joined_at: string;
}

export interface UserReferral {
  user_id: string;
  user_name: string | null;
  user_city: string | null;
  invite_code: string | null;
  invite_channel: string | null;
  joined_at: string;
  volunteer_status: string | null;
  downstream_count: number;
}

export interface TopReferrer {
  user_id: string;
  user_name: string | null;
  user_city: string | null;
  total_referrals: number;
  aprovados: number;
}

export interface OriginFunnel {
  convites_7d: number;
  cadastros_7d: number;
  cadastros_com_convite_7d: number;
  aprovados_7d: number;
  ativos_7d: number;
  por_canal_30d: Record<string, number> | null;
  top_referrers_30d: TopReferrer[] | null;
  funil: {
    total_convites: number;
    convites_usados: number;
    total_cadastros: number;
    com_origem: number;
    aprovados: number;
  };
}

// Get invite chain for a user (admin only - uses RPC)
export function useInviteChain(userId: string | undefined) {
  return useQuery({
    queryKey: ["invite-chain", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await (supabase.rpc as any)("get_invite_chain", {
        _target_user_id: userId,
      });

      if (error) {
        console.error("Chain fetch error:", error);
        return null;
      }

      return data as ChainMember[];
    },
    enabled: !!userId,
  });
}

// Get user's downstream referrals
export function useUserReferrals(referrerId: string | undefined) {
  return useQuery({
    queryKey: ["user-referrals", referrerId],
    queryFn: async () => {
      if (!referrerId) return [];

      const { data, error } = await (supabase.rpc as any)("get_user_referrals", {
        _referrer_id: referrerId,
      });

      if (error) {
        console.error("Referrals fetch error:", error);
        return [];
      }

      return data as UserReferral[];
    },
    enabled: !!referrerId,
  });
}

// Get origin funnel metrics (admin/coord)
export function useOriginFunnel(scopeType: "global" | "cidade" = "global", scopeCidade?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["origin-funnel", scopeType, scopeCidade],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase.rpc as any)("origin_funnel", {
        _scope_type: scopeType,
        _scope_cidade: scopeCidade || null,
      });

      if (error) {
        console.error("Funnel fetch error:", error);
        throw error;
      }

      return data as OriginFunnel;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

// Get who invited the current user (for volunteer profile)
export function useMyInviter() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-inviter", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get referrer_user_id from profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("referrer_user_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.referrer_user_id) return null;

      // Get inviter's name
      const { data: inviter, error: inviterError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", profile.referrer_user_id)
        .single();

      if (inviterError) return null;

      return inviter;
    },
    enabled: !!user?.id,
  });
}
