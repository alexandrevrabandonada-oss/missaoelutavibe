import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type AnuncioEscopo = "GLOBAL" | "REGIAO" | "CIDADE" | "CELULA";
export type AnuncioStatus = "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";

export interface Anuncio {
  id: string;
  titulo: string;
  texto: string;
  tags: string[];
  escopo: AnuncioEscopo;
  regiao: string | null;
  cidade: string | null;
  celula_id: string | null;
  status: AnuncioStatus;
  criado_por: string;
  publicado_em: string | null;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
  cells?: { name: string } | null;
}

export interface AnuncioFormData {
  titulo: string;
  texto: string;
  tags?: string[];
  escopo: AnuncioEscopo;
  regiao?: string | null;
  cidade?: string | null;
  celula_id?: string | null;
}

export function useAnuncios(filterStatus?: AnuncioStatus) {
  const { user } = useAuth();

  const anunciosQuery = useQuery({
    queryKey: ["anuncios", filterStatus, user?.id],
    queryFn: async () => {
      let query = (supabase as any)
        .from("anuncios")
        .select("*, cells(name)")
        .order("publicado_em", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filterStatus) {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Anuncio[];
    },
    enabled: !!user?.id,
  });

  return {
    anuncios: anunciosQuery.data || [],
    isLoading: anunciosQuery.isLoading,
    error: anunciosQuery.error,
    refetch: anunciosQuery.refetch,
  };
}

export function useAnuncioDetail(id: string | undefined) {
  const { user } = useAuth();

  const anuncioQuery = useQuery({
    queryKey: ["anuncio", id, user?.id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await (supabase as any)
        .from("anuncios")
        .select("*, cells(name)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Anuncio;
    },
    enabled: !!id && !!user?.id,
  });

  return {
    anuncio: anuncioQuery.data,
    isLoading: anuncioQuery.isLoading,
    error: anuncioQuery.error,
  };
}

export function useAnunciosVoluntario() {
  const { user } = useAuth();

  // Fetch published announcements with read status
  const anunciosQuery = useQuery({
    queryKey: ["anuncios-voluntario", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: anuncios, error: anunciosError } = await (supabase as any)
        .from("anuncios")
        .select("*, cells(name)")
        .eq("status", "PUBLICADO")
        .order("publicado_em", { ascending: false });

      if (anunciosError) throw anunciosError;

      const { data: lidos, error: lidosError } = await (supabase as any)
        .from("anuncios_lidos")
        .select("anuncio_id")
        .eq("user_id", user.id);

      if (lidosError) throw lidosError;

      const readIds = new Set((lidos || []).map((l: any) => l.anuncio_id));

      return (anuncios || []).map((a: any) => ({
        ...a,
        is_read: readIds.has(a.id),
      })) as Anuncio[];
    },
    enabled: !!user?.id,
  });

  return {
    anuncios: anunciosQuery.data || [],
    isLoading: anunciosQuery.isLoading,
    error: anunciosQuery.error,
    refetch: anunciosQuery.refetch,
  };
}

export function useUnreadAnunciosCount() {
  const { user } = useAuth();

  const countQuery = useQuery({
    queryKey: ["unread-anuncios-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { data, error } = await (supabase as any).rpc("get_unread_anuncios_count", {
        _user_id: user.id,
      });

      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    unreadCount: countQuery.data ?? 0,
    isLoading: countQuery.isLoading,
  };
}

export function useMarkAnuncioAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (anuncioId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await (supabase as any)
        .from("anuncios_lidos")
        .upsert(
          { anuncio_id: anuncioId, user_id: user.id },
          { onConflict: "anuncio_id,user_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anuncios-voluntario"] });
      queryClient.invalidateQueries({ queryKey: ["unread-anuncios-count"] });
    },
  });
}

export function useAnuncioMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createMutation = useMutation({
    mutationFn: async (data: AnuncioFormData & { status?: AnuncioStatus }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data: result, error } = await (supabase as any)
        .from("anuncios")
        .insert({
          ...data,
          criado_por: user.id,
          status: data.status || "RASCUNHO",
          publicado_em: data.status === "PUBLICADO" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anuncios"] });
      toast.success("Anúncio criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar anúncio: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: AnuncioFormData & { id: string; status?: AnuncioStatus }) => {
      const updateData: Record<string, unknown> = { ...data };
      
      if (data.status === "PUBLICADO") {
        const { data: existing } = await (supabase as any)
          .from("anuncios")
          .select("publicado_em")
          .eq("id", id)
          .single();
        
        if (!existing?.publicado_em) {
          updateData.publicado_em = new Date().toISOString();
        }
      }

      const { data: result, error } = await (supabase as any)
        .from("anuncios")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anuncios"] });
      queryClient.invalidateQueries({ queryKey: ["anuncio"] });
      toast.success("Anúncio atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar anúncio: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("anuncios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anuncios"] });
      toast.success("Anúncio excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir anúncio: " + error.message);
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}

export function useAnuncioMetrics(anuncioId: string | undefined) {
  const anuncioMetricsQuery = useQuery({
    queryKey: ["anuncio-metrics", anuncioId],
    queryFn: async () => {
      if (!anuncioId) return { totalLidos: 0 };

      const { count, error } = await (supabase as any)
        .from("anuncios_lidos")
        .select("*", { count: "exact", head: true })
        .eq("anuncio_id", anuncioId);

      if (error) throw error;
      return { totalLidos: count ?? 0 };
    },
    enabled: !!anuncioId,
  });

  return {
    metrics: anuncioMetricsQuery.data,
    isLoading: anuncioMetricsQuery.isLoading,
  };
}
