import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Types
export interface CidadeOverview {
  cidade_id: string;
  nome: string;
  uf: string;
  slug: string;
  status: string;
  has_coord: boolean;
  celulas_count: number;
  membros_aprovados: number;
  voluntarios_aprovados: number;
  ativos_7d: number;
  signups_7d: number;
  approved_7d: number;
  first_action_7d: number;
  shares_7d: number;
  semana_ativa: boolean;
  atividades_7d: number;
  alerts: string[] | null;
}

export interface CelulaOverview {
  id: string;
  name: string;
  neighborhood: string | null;
  description: string | null;
  is_active: boolean;
  tipo: string;
  tags: string[];
  membros_aprovados: number;
  pendentes: number;
  has_moderador: boolean;
  missoes_7d: number;
  atividades_7d: number;
  recibos_7d: number;
  alerts: string[] | null;
}

export interface TerritorioKPIs {
  cidades_sem_coord: number;
  celulas_sem_moderador: number;
  cidades_crescendo_sem_estrutura: number;
  interesses_pendentes: number;
}

export interface CoordInterest {
  id: string;
  user_id: string;
  cidade_id: string;
  celula_id: string | null;
  disponibilidade: string | null;
  msg: string | null;
  status: string;
  created_at: string;
  profile_name?: string;
  profile_nickname?: string;
  profile_city?: string;
  cidade_nome?: string;
}

export interface PendingMembership {
  id: string;
  user_id: string;
  cell_id: string;
  status: string;
  requested_at: string;
  profile_name?: string;
  profile_nickname?: string;
  profile_city?: string;
  cell_name?: string;
  cell_neighborhood?: string;
}

// Hook principal
export function useTerritorio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Overview de cidades
  const overviewQuery = useQuery({
    queryKey: ["territorio-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_territorio_overview", { period_days: 7 });
      if (error) throw error;
      return (data as unknown as CidadeOverview[]) || [];
    },
  });

  // KPIs para card do Ops
  const kpisQuery = useQuery({
    queryKey: ["territorio-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_territorio_kpis");
      if (error) throw error;
      return data as unknown as TerritorioKPIs;
    },
  });

  return {
    overview: overviewQuery.data ?? [],
    kpis: kpisQuery.data,
    isLoading: overviewQuery.isLoading,
    isLoadingKpis: kpisQuery.isLoading,
    refetch: () => {
      overviewQuery.refetch();
      kpisQuery.refetch();
    },
  };
}

// Hook para células de uma cidade
export function useCidadeCelulas(cidadeId: string | null) {
  return useQuery({
    queryKey: ["cidade-celulas", cidadeId],
    queryFn: async () => {
      if (!cidadeId) return [];
      const { data, error } = await supabase.rpc("get_cidade_celulas", { p_cidade_id: cidadeId });
      if (error) throw error;
      return (data as unknown as CelulaOverview[]) || [];
    },
    enabled: !!cidadeId,
  });
}

// Hook para lista de cidades
export function useCidades() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cidadesQuery = useQuery({
    queryKey: ["cidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cidades")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createCidadeMutation = useMutation({
    mutationFn: async (cidade: { nome: string; uf: string; slug: string; status?: string }) => {
      const { data, error } = await supabase
        .from("cidades")
        .insert(cidade)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidades"] });
      queryClient.invalidateQueries({ queryKey: ["territorio-overview"] });
      toast({ title: "Cidade criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar cidade", description: error.message, variant: "destructive" });
    },
  });

  return {
    cidades: cidadesQuery.data ?? [],
    isLoading: cidadesQuery.isLoading,
    createCidade: createCidadeMutation.mutate,
    isCreating: createCidadeMutation.isPending,
  };
}

// Hook para fila de interesse em coordenação
export function useCoordInterest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const interestsQuery = useQuery({
    queryKey: ["coord-interests"],
    queryFn: async () => {
      // Fetch interests
      const { data: interests, error } = await supabase
        .from("territorio_coord_interest")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch related data
      const userIds = [...new Set(interests.map(i => i.user_id))];
      const cidadeIds = [...new Set(interests.map(i => i.cidade_id))];

      const [profilesRes, cidadesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, nickname, city").in("id", userIds),
        supabase.from("cidades").select("id, nome").in("id", cidadeIds),
      ]);

      const profilesMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]));
      const cidadesMap = new Map((cidadesRes.data ?? []).map(c => [c.id, c]));

      return interests.map(i => {
        const profile = profilesMap.get(i.user_id);
        const cidade = cidadesMap.get(i.cidade_id);
        return {
          ...i,
          profile_name: profile?.full_name,
          profile_nickname: profile?.nickname,
          profile_city: profile?.city,
          cidade_nome: cidade?.nome,
        } as CoordInterest;
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("territorio_coord_interest")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coord-interests"] });
      queryClient.invalidateQueries({ queryKey: ["territorio-kpis"] });
      toast({ title: "Status atualizado" });
    },
  });

  return {
    interests: interestsQuery.data ?? [],
    isLoading: interestsQuery.isLoading,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
}

// Hook para pedidos pendentes de memberships
export function usePendingMemberships(cidadeNome?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const pendingQuery = useQuery({
    queryKey: ["pending-memberships", cidadeNome],
    queryFn: async () => {
      // Fetch pending memberships
      const { data: memberships, error } = await supabase
        .from("cell_memberships")
        .select("*")
        .eq("status", "pendente")
        .order("requested_at", { ascending: false });
      if (error) throw error;

      // Fetch related data
      const userIds = [...new Set(memberships.map(m => m.user_id))];
      const cellIds = [...new Set(memberships.map(m => m.cell_id))];

      const [profilesRes, cellsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, nickname, city").in("id", userIds),
        supabase.from("cells").select("id, name, neighborhood, city").in("id", cellIds),
      ]);

      const profilesMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]));
      const cellsMap = new Map((cellsRes.data ?? []).map(c => [c.id, c]));

      let result = memberships.map(m => {
        const profile = profilesMap.get(m.user_id);
        const cell = cellsMap.get(m.cell_id);
        return {
          ...m,
          profile_name: profile?.full_name,
          profile_nickname: profile?.nickname,
          profile_city: profile?.city,
          cell_name: cell?.name,
          cell_neighborhood: cell?.neighborhood,
          cell_city: cell?.city,
        };
      });

      // Filter by city if provided
      if (cidadeNome) {
        result = result.filter(m => m.cell_city === cidadeNome);
      }

      return result as PendingMembership[];
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ membershipId, decision }: { membershipId: string; decision: "aprovado" | "recusado" }) => {
      const { data, error } = await supabase.rpc("decide_membership", {
        p_membership_id: membershipId,
        p_decision: decision,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["cidade-celulas"] });
      queryClient.invalidateQueries({ queryKey: ["cell-members"] });
      toast({
        title: variables.decision === "aprovado" ? "Membro aprovado!" : "Solicitação recusada",
      });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    pending: pendingQuery.data ?? [],
    isLoading: pendingQuery.isLoading,
    decide: decideMutation.mutate,
    isDeciding: decideMutation.isPending,
  };
}

// Hook para voluntário: células da sua cidade + ações
export function useVoluntarioTerritorio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar cidade do usuário e dados relacionados
  const territorioQuery = useQuery({
    queryKey: ["voluntario-territorio", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Buscar perfil com cidade
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, city, neighborhood")
        .eq("id", user.id)
        .single();

      if (!profile?.city) return { profile, celulas: [], currentCell: null, cidade: null };

      // Buscar cidade
      const { data: cidade } = await supabase
        .from("cidades")
        .select("*")
        .eq("nome", profile.city)
        .maybeSingle();

      // Buscar células da cidade
      const { data: celulas } = await supabase
        .from("cells")
        .select("*")
        .eq("city", profile.city)
        .eq("is_active", true)
        .order("name");

      // Buscar membership atual
      const { data: membership } = await supabase
        .from("cell_memberships")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "aprovado")
        .maybeSingle();

      let currentCell = null;
      if (membership) {
        const { data: cell } = await supabase
          .from("cells")
          .select("*")
          .eq("id", membership.cell_id)
          .single();
        currentCell = cell;
      }

      // Buscar interesse em coord existente
      const { data: interest } = await supabase
        .from("territorio_coord_interest")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Buscar pedido pendente
      const { data: pendingRequest } = await supabase
        .from("cell_memberships")
        .select("*, cells:cell_id(name)")
        .eq("user_id", user.id)
        .eq("status", "pendente")
        .maybeSingle();

      return {
        profile,
        cidade,
        celulas: celulas ?? [],
        currentCell,
        membership,
        interest,
        pendingRequest,
      };
    },
    enabled: !!user?.id,
  });

  // Pedir entrada em célula
  const requestJoinMutation = useMutation({
    mutationFn: async (celulaId: string) => {
      const { data, error } = await supabase.rpc("request_join_celula", {
        p_celula_id: celulaId,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; message?: string; error?: string };
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voluntario-territorio"] });
      toast({ title: "Solicitação enviada!", description: "Aguarde a aprovação do coordenador." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Expressar interesse em coordenar
  const expressInterestMutation = useMutation({
    mutationFn: async (data: { cidadeId: string; celulaId?: string; disponibilidade?: string; msg?: string }) => {
      const { data: result, error } = await supabase.rpc("upsert_coord_interest", {
        p_cidade_id: data.cidadeId,
        p_celula_id: data.celulaId || null,
        p_disponibilidade: data.disponibilidade || null,
        p_msg: data.msg || null,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voluntario-territorio"] });
      toast({ title: "Interesse registrado!", description: "A coordenação entrará em contato." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    data: territorioQuery.data,
    isLoading: territorioQuery.isLoading,
    requestJoin: requestJoinMutation.mutate,
    isRequesting: requestJoinMutation.isPending,
    expressInterest: expressInterestMutation.mutate,
    isExpressing: expressInterestMutation.isPending,
    refetch: territorioQuery.refetch,
  };
}
