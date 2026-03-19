import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// Types
export interface PlenariaOpcao {
  id: string;
  ordem: number;
  texto: string;
  votos: number;
}

export interface Plenaria {
  id: string;
  scope_tipo: string;
  scope_id: string;
  ciclo_id: string | null;
  titulo: string;
  resumo: string | null;
  status: string;
  abre_em: string;
  encerra_em: string;
  created_at: string;
  total_votos: number;
  total_comentarios: number;
  user_voted: boolean;
  opcoes: PlenariaOpcao[] | null;
}

export interface PlenariaComentario {
  id: string;
  plenaria_id: string;
  user_id: string;
  body: string;
  hidden: boolean;
  created_at: string;
  author_name?: string;
}

export interface PlenariaEncaminhamento {
  id: string;
  plenaria_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  kind: string;
  status: string;
  created_task_id: string | null;
  created_mission_id: string | null;
  created_at: string;
}

export interface PlenariasMetrics {
  abertas: number;
  encerradas_7d: number;
  encaminhamentos_7d: number;
}

// Hook for volunteer plenarias list
export function usePlenarias(scopeTipo?: string, scopeId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const plenariasQuery = useQuery({
    queryKey: ["plenarias", user?.id, scopeTipo, scopeId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_active_plenarias", {
        p_scope_tipo: scopeTipo || null,
        p_scope_id: scopeId || null,
      });

      if (error) throw error;
      return (data || []) as Plenaria[];
    },
    enabled: !!user?.id,
  });

  const castVoteMutation = useMutation({
    mutationFn: async ({ plenariaId, opcaoId }: { plenariaId: string; opcaoId: string }) => {
      const { data, error } = await (supabase.rpc as any)("cast_vote", {
        p_plenaria_id: plenariaId,
        p_opcao_id: opcaoId,
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plenarias"] });
      toast({ title: "Voto registrado!", description: "Seu voto foi computado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao votar", description: error.message, variant: "destructive" });
    },
  });

  return {
    plenarias: plenariasQuery.data || [],
    isLoading: plenariasQuery.isLoading,
    castVote: castVoteMutation.mutate,
    isVoting: castVoteMutation.isPending,
    refetch: plenariasQuery.refetch,
  };
}

// Hook for plenaria detail with comments
export function usePlenariaDetail(plenariaId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch the single plenaria from the list
  const plenariaQuery = useQuery({
    queryKey: ["plenaria-detail", plenariaId, user?.id],
    queryFn: async () => {
      if (!plenariaId) return null;
      const { data, error } = await (supabase.rpc as any)("get_active_plenarias", {
        p_scope_tipo: null,
        p_scope_id: null,
      });

      if (error) throw error;
      const plenarias = (data || []) as Plenaria[];
      return plenarias.find((p) => p.id === plenariaId) || null;
    },
    enabled: !!user?.id && !!plenariaId,
  });

  // Fetch comments
  const comentariosQuery = useQuery({
    queryKey: ["plenaria-comentarios", plenariaId],
    queryFn: async () => {
      if (!plenariaId) return [];
      const { data, error } = await supabase
        .from("plenaria_comentarios")
        .select(`
          id,
          plenaria_id,
          user_id,
          body,
          hidden,
          created_at
        `)
        .eq("plenaria_id", plenariaId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Fetch author names
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      let profiles: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        profiles = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p.full_name?.split(" ")[0] || "Voluntário";
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map(c => ({
        ...c,
        author_name: profiles[c.user_id] || "Voluntário",
      })) as PlenariaComentario[];
    },
    enabled: !!user?.id && !!plenariaId,
  });

  // Fetch encaminhamentos
  const encaminhamentosQuery = useQuery({
    queryKey: ["plenaria-encaminhamentos", plenariaId],
    queryFn: async () => {
      if (!plenariaId) return [];
      const { data, error } = await supabase
        .from("plenaria_encaminhamentos")
        .select("*")
        .eq("plenaria_id", plenariaId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return (data || []) as PlenariaEncaminhamento[];
    },
    enabled: !!user?.id && !!plenariaId,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!plenariaId || !user?.id) throw new Error("Dados inválidos");

      const { error } = await supabase.from("plenaria_comentarios").insert({
        plenaria_id: plenariaId,
        user_id: user.id,
        body,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plenaria-comentarios", plenariaId] });
      queryClient.invalidateQueries({ queryKey: ["plenaria-detail", plenariaId] });
      toast({ title: "Comentário enviado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao comentar", description: error.message, variant: "destructive" });
    },
  });

  return {
    plenaria: plenariaQuery.data,
    comentarios: comentariosQuery.data || [],
    encaminhamentos: encaminhamentosQuery.data || [],
    isLoading: plenariaQuery.isLoading,
    addComment: addCommentMutation.mutate,
    isAddingComment: addCommentMutation.isPending,
    refetch: () => {
      plenariaQuery.refetch();
      comentariosQuery.refetch();
      encaminhamentosQuery.refetch();
    },
  };
}

// Hook for admin plenarias management
export function useAdminPlenarias() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all plenarias (admin can see all)
  const plenariasQuery = useQuery({
    queryKey: ["admin-plenarias", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plenarias")
        .select(`
          *,
          plenaria_opcoes (id, ordem, texto),
          plenaria_votos (id),
          plenaria_comentarios (id),
          plenaria_encaminhamentos (id, titulo, kind, status)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create plenaria
  const createPlenariaMutation = useMutation({
    mutationFn: async (params: {
      scope_tipo: string;
      scope_id: string;
      ciclo_id?: string;
      titulo: string;
      resumo?: string;
      encerra_em: string;
      opcoes: string[];
    }) => {
      // Insert plenaria
      const { data: plenaria, error: pError } = await supabase
        .from("plenarias")
        .insert({
          scope_tipo: params.scope_tipo,
          scope_id: params.scope_id,
          ciclo_id: params.ciclo_id || null,
          titulo: params.titulo,
          resumo: params.resumo || null,
          encerra_em: params.encerra_em,
          created_by: user?.id,
        })
        .select()
        .single();

      if (pError) throw pError;

      // Insert options
      if (params.opcoes.length > 0) {
        const opcoesData = params.opcoes.map((texto, idx) => ({
          plenaria_id: plenaria.id,
          ordem: idx,
          texto,
        }));

        const { error: oError } = await supabase.from("plenaria_opcoes").insert(opcoesData);
        if (oError) throw oError;
      }

      return plenaria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plenarias"] });
      toast({ title: "Plenária criada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar plenária", description: error.message, variant: "destructive" });
    },
  });

  // Close plenaria
  const closePlenariaMutation = useMutation({
    mutationFn: async (params: {
      plenariaId: string;
      publishToMural: boolean;
      encaminhamentos?: { titulo: string; descricao?: string; kind: string }[];
    }) => {
      const { data, error } = await (supabase.rpc as any)("close_plenaria", {
        p_plenaria_id: params.plenariaId,
        p_recibo_json: null,
        p_publish_to_mural: params.publishToMural,
        p_encaminhamentos_json: JSON.stringify(params.encaminhamentos || []),
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plenarias"] });
      queryClient.invalidateQueries({ queryKey: ["plenarias"] });
      toast({ title: "Plenária encerrada!", description: "Recibo gerado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao encerrar", description: error.message, variant: "destructive" });
    },
  });

  // Create encaminhamento as task
  const createAsTaskMutation = useMutation({
    mutationFn: async (params: { encaminhamentoId: string; squadId: string; responsavelId?: string }) => {
      const { data, error } = await (supabase.rpc as any)("create_encaminhamento_as_task", {
        p_encaminhamento_id: params.encaminhamentoId,
        p_squad_id: params.squadId,
        p_responsavel_id: params.responsavelId || null,
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plenarias"] });
      queryClient.invalidateQueries({ queryKey: ["plenaria-encaminhamentos"] });
      toast({ title: "Tarefa criada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Create encaminhamento as mission
  const createAsMissionMutation = useMutation({
    mutationFn: async (params: { encaminhamentoId: string; tipo?: string; pontos?: number }) => {
      const { data, error } = await (supabase.rpc as any)("create_encaminhamento_as_mission", {
        p_encaminhamento_id: params.encaminhamentoId,
        p_tipo: params.tipo || "acao_direta",
        p_pontos: params.pontos || 10,
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plenarias"] });
      queryClient.invalidateQueries({ queryKey: ["plenaria-encaminhamentos"] });
      toast({ title: "Missão criada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Hide comment
  const hideCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("plenaria_comentarios")
        .update({ hidden: true })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plenaria-comentarios"] });
      toast({ title: "Comentário ocultado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    plenarias: plenariasQuery.data || [],
    isLoading: plenariasQuery.isLoading,
    createPlenaria: createPlenariaMutation.mutate,
    isCreating: createPlenariaMutation.isPending,
    closePlenaria: closePlenariaMutation.mutate,
    isClosing: closePlenariaMutation.isPending,
    createAsTask: createAsTaskMutation.mutate,
    createAsMission: createAsMissionMutation.mutate,
    hideComment: hideCommentMutation.mutate,
    refetch: plenariasQuery.refetch,
  };
}

// Hook for Ops metrics
export function usePlenariasMetrics(scopeTipo: string, scopeCidade?: string | null, scopeCelulaId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["plenarias-metrics", scopeTipo, scopeCidade, scopeCelulaId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_plenarias_metrics", {
        p_scope_tipo: scopeTipo,
        p_scope_cidade: scopeCidade || null,
        p_scope_celula_id: scopeCelulaId || null,
      });

      if (error) throw error;
      return data as PlenariasMetrics;
    },
    enabled: !!user?.id,
  });
}
