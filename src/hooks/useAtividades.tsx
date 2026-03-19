import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export type AtividadeTipo = 
  | "reuniao" 
  | "panfletagem" 
  | "visita" 
  | "mutirao" 
  | "plenaria" 
  | "formacao_presencial" 
  | "ato" 
  | "outro";

export type AtividadeStatus = "rascunho" | "publicada" | "cancelada" | "concluida";

export type RsvpStatus = "vou" | "talvez" | "nao_vou";

export interface ReciboAtividade {
  resumo: string;
  feitos: string;
  proximos_passos: string;
  links?: string[];
  fotos?: string[];
  publico?: boolean;
}

export interface Atividade {
  id: string;
  titulo: string;
  tipo: AtividadeTipo;
  status: AtividadeStatus;
  cidade: string | null;
  celula_id: string | null;
  ciclo_id: string | null;
  inicio_em: string;
  fim_em: string | null;
  local_texto: string | null;
  descricao: string | null;
  responsavel_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Receipt fields
  concluida_em: string | null;
  concluida_por: string | null;
  recibo_json: ReciboAtividade | null;
  // Joined
  responsavel?: { nickname: string | null; full_name: string | null } | null;
  celula?: { name: string } | null;
  ciclo?: { titulo: string } | null;
  rsvp_count?: number;
  my_rsvp?: RsvpStatus | null;
}

export interface AtividadeRsvp {
  id: string;
  atividade_id: string;
  user_id: string;
  status: RsvpStatus;
  checkin_em: string | null;
  updated_at: string;
  // Joined
  user?: { nickname: string | null; full_name: string | null } | null;
}

export const ATIVIDADE_TIPO_LABELS: Record<AtividadeTipo, string> = {
  reuniao: "Reunião",
  panfletagem: "Panfletagem",
  visita: "Visita",
  mutirao: "Mutirão",
  plenaria: "Plenária",
  formacao_presencial: "Formação Presencial",
  ato: "Ato",
  outro: "Outro",
};

export const ATIVIDADE_STATUS_LABELS: Record<AtividadeStatus, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  cancelada: "Cancelada",
  concluida: "Concluída",
};

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  vou: "Vou",
  talvez: "Talvez",
  nao_vou: "Não vou",
};

// Helper to access table not yet in generated types
const atividadesTable = () => (supabase.from as any)("atividades");
const rsvpTable = () => (supabase.from as any)("atividade_rsvp");

export function useAtividades(options?: {
  cicloId?: string | null;
  cidade?: string | null;
  celulaId?: string | null;
  status?: AtividadeStatus | "all";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // List activities with filters
  const atividadesQuery = useQuery({
    queryKey: ["atividades", options],
    queryFn: async () => {
      let query = atividadesTable()
        .select(`
          *,
          responsavel:profiles!atividades_responsavel_user_id_fkey(nickname, full_name),
          celula:cells!atividades_celula_id_fkey(name),
          ciclo:ciclos_semanais!atividades_ciclo_id_fkey(titulo)
        `)
        .order("inicio_em", { ascending: true });

      // Filter by status
      if (options?.status && options.status !== "all") {
        query = query.eq("status", options.status);
      }

      // Filter by cycle
      if (options?.cicloId) {
        query = query.eq("ciclo_id", options.cicloId);
      }

      // Filter by date range
      if (options?.startDate) {
        query = query.gte("inicio_em", options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte("inicio_em", options.endDate.toISOString());
      }

      // Limit
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Atividade[];
    },
    enabled: !!user,
  });

  // Get single activity
  const getAtividade = async (id: string): Promise<Atividade | null> => {
    const { data, error } = await atividadesTable()
      .select(`
        *,
        responsavel:profiles!atividades_responsavel_user_id_fkey(nickname, full_name),
        celula:cells!atividades_celula_id_fkey(name),
        ciclo:ciclos_semanais!atividades_ciclo_id_fkey(titulo)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as Atividade | null;
  };

  // Create activity
  const createMutation = useMutation({
    mutationFn: async (data: {
      titulo: string;
      tipo: AtividadeTipo;
      inicio_em: string;
      fim_em?: string | null;
      local_texto?: string | null;
      descricao?: string | null;
      cidade?: string | null;
      celula_id?: string | null;
      ciclo_id?: string | null;
      responsavel_user_id?: string | null;
      status?: AtividadeStatus;
    }) => {
      const { data: result, error } = await atividadesTable()
        .insert({
          ...data,
          created_by: user?.id,
          status: data.status || "rascunho",
        })
        .select()
        .single();

      if (error) throw error;
      return result as Atividade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      toast({ title: "Atividade criada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar atividade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update activity
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Atividade> & { id: string }) => {
      const { data: result, error } = await atividadesTable()
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as Atividade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      queryClient.invalidateQueries({ queryKey: ["atividade"] });
      toast({ title: "Atividade atualizada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar atividade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change status (publish, cancel, complete)
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AtividadeStatus }) => {
      const { data: result, error } = await atividadesTable()
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as Atividade;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      queryClient.invalidateQueries({ queryKey: ["atividade"] });
      const labels: Record<AtividadeStatus, string> = {
        publicada: "Atividade publicada!",
        cancelada: "Atividade cancelada.",
        concluida: "Atividade concluída!",
        rascunho: "Voltou para rascunho.",
      };
      toast({ title: labels[status] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete activity (admin only)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await atividadesTable().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      toast({ title: "Atividade excluída." });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir atividade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    atividades: atividadesQuery.data ?? [],
    isLoading: atividadesQuery.isLoading,
    refetch: atividadesQuery.refetch,
    getAtividade,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    changeStatus: changeStatusMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// Hook for RSVP operations
export function useAtividadeRsvp(atividadeId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get my RSVP for this activity
  const myRsvpQuery = useQuery({
    queryKey: ["my-rsvp", atividadeId, user?.id],
    queryFn: async () => {
      if (!atividadeId || !user?.id) return null;

      const { data, error } = await rsvpTable()
        .select("*")
        .eq("atividade_id", atividadeId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AtividadeRsvp | null;
    },
    enabled: !!atividadeId && !!user?.id,
  });

  // Get all RSVPs for an activity (coordinator view)
  const allRsvpsQuery = useQuery({
    queryKey: ["activity-rsvps", atividadeId],
    queryFn: async () => {
      if (!atividadeId) return [];

      const { data, error } = await rsvpTable()
        .select(`
          *,
          user:profiles!atividade_rsvp_user_id_fkey(nickname, full_name)
        `)
        .eq("atividade_id", atividadeId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AtividadeRsvp[];
    },
    enabled: !!atividadeId,
  });

  // Upsert RSVP
  const upsertMutation = useMutation({
    mutationFn: async (status: RsvpStatus) => {
      if (!atividadeId || !user?.id) throw new Error("Missing data");

      const { data, error } = await rsvpTable()
        .upsert(
          {
            atividade_id: atividadeId,
            user_id: user.id,
            status,
          },
          { onConflict: "atividade_id,user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data as AtividadeRsvp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-rsvp", atividadeId] });
      queryClient.invalidateQueries({ queryKey: ["activity-rsvps", atividadeId] });
      toast({ title: "Presença confirmada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao confirmar presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!atividadeId || !user?.id) throw new Error("Missing data");

      // Must have existing RSVP with vou or talvez
      if (!myRsvpQuery.data || myRsvpQuery.data.status === "nao_vou") {
        throw new Error("Você precisa confirmar presença antes de fazer check-in");
      }

      const { data, error } = await rsvpTable()
        .update({ checkin_em: new Date().toISOString() })
        .eq("atividade_id", atividadeId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as AtividadeRsvp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-rsvp", atividadeId] });
      queryClient.invalidateQueries({ queryKey: ["activity-rsvps", atividadeId] });
      toast({ title: "Check-in realizado!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer check-in",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete RSVP
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!atividadeId || !user?.id) throw new Error("Missing data");

      const { error } = await rsvpTable()
        .delete()
        .eq("atividade_id", atividadeId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-rsvp", atividadeId] });
      queryClient.invalidateQueries({ queryKey: ["activity-rsvps", atividadeId] });
      toast({ title: "Presença removida." });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    myRsvp: myRsvpQuery.data,
    allRsvps: allRsvpsQuery.data ?? [],
    isLoadingMyRsvp: myRsvpQuery.isLoading,
    isLoadingAllRsvps: allRsvpsQuery.isLoading,
    setRsvp: upsertMutation.mutateAsync,
    removeRsvp: deleteMutation.mutateAsync,
    isSettingRsvp: upsertMutation.isPending,
    checkin: checkinMutation.mutateAsync,
    isCheckingIn: checkinMutation.isPending,
  };
}

// Hook to get activities for the current week/cycle
export function useAgendaSemana(cicloId?: string | null, userCellIds?: string[], userCity?: string | null) {
  const { user } = useAuth();

  const now = new Date();
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  return useQuery({
    queryKey: ["agenda-semana", cicloId, userCellIds, userCity],
    queryFn: async () => {
      let query = atividadesTable()
        .select(`
          *,
          responsavel:profiles!atividades_responsavel_user_id_fkey(nickname, full_name),
          celula:cells!atividades_celula_id_fkey(name)
        `)
        .eq("status", "publicada")
        .gte("inicio_em", now.toISOString())
        .lte("inicio_em", sevenDaysLater.toISOString())
        .order("inicio_em", { ascending: true })
        .limit(10);

      // If we have an active cycle, filter by it
      if (cicloId) {
        query = query.eq("ciclo_id", cicloId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Atividade[];
    },
    enabled: !!user,
  });
}
