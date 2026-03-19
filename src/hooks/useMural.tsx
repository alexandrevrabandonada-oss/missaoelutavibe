import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Types
export type MuralPostTipo = 'debate' | 'chamado' | 'relato' | 'evidencia' | 'material' | 'recibo_atividade' | 'recibo_semana';
export type MuralReacaoTipo = 'confirmar' | 'apoiar' | 'replicar' | 'convocar' | 'gratidao';

export interface MuralPost {
  id: string;
  escopo_tipo: string;
  escopo_id: string;
  tipo: MuralPostTipo;
  titulo: string | null;
  corpo_markdown: string;
  autor_user_id: string;
  mission_id: string | null;
  atividade_id: string | null;
  ciclo_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Joined data
  autor?: {
    nickname: string | null;
    full_name: string | null;
  } | null;
  mission?: {
    id: string;
    title: string;
  } | null;
  atividade?: {
    id: string;
    titulo: string;
  } | null;
  _count?: {
    comentarios: number;
    reacoes: Record<MuralReacaoTipo, number>;
  };
  _userReactions?: MuralReacaoTipo[];
}

export interface MuralComentario {
  id: string;
  post_id: string;
  autor_user_id: string;
  corpo_markdown: string;
  status: string;
  created_at: string;
  autor?: {
    nickname: string | null;
    full_name: string | null;
  } | null;
}

export interface MuralReacao {
  id: string;
  post_id: string;
  user_id: string;
  tipo: MuralReacaoTipo;
  created_at: string;
}

export const MURAL_TIPO_LABELS: Record<MuralPostTipo, string> = {
  debate: "Debate",
  chamado: "Chamado",
  relato: "Relato",
  evidencia: "Evidência",
  material: "Material",
  recibo_atividade: "Recibo de Atividade",
  recibo_semana: "Recibo da Semana",
};

export const MURAL_TIPO_COLORS: Record<MuralPostTipo, string> = {
  debate: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  chamado: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  relato: "bg-green-500/10 text-green-700 border-green-500/30",
  evidencia: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  material: "bg-pink-500/10 text-pink-700 border-pink-500/30",
  recibo_atividade: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  recibo_semana: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
};

export const MURAL_REACAO_ICONS: Record<MuralReacaoTipo, { emoji: string; label: string }> = {
  confirmar: { emoji: "✅", label: "Confirmar" },
  apoiar: { emoji: "🤝", label: "Apoiar" },
  replicar: { emoji: "♻️", label: "Replicar" },
  convocar: { emoji: "📣", label: "Convocar" },
  gratidao: { emoji: "🌱", label: "Gratidão" },
};

// Hook for cell wall posts
export function useMuralPosts(cellId?: string, tipoFilter?: MuralPostTipo | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ["mural-posts", cellId, tipoFilter],
    queryFn: async () => {
      if (!cellId) return [];

      let query = supabase
        .from("mural_posts")
        .select(`
          *,
          mission:missions!mural_posts_mission_id_fkey (id, title),
          atividade:atividades!mural_posts_atividade_id_fkey (id, titulo)
        `)
        .eq("escopo_tipo", "celula")
        .eq("escopo_id", cellId)
        .order("created_at", { ascending: false });

      if (tipoFilter) {
        query = query.eq("tipo", tipoFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch reaction counts and user reactions for each post
      const postIds = data?.map(p => p.id) ?? [];
      
      if (postIds.length === 0) return [] as MuralPost[];

      // Get author profiles
      const authorIds = [...new Set(data?.map(p => p.autor_user_id) ?? [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname, full_name")
        .in("id", authorIds);

      // Get reaction counts grouped by post and type
      const { data: reacoes } = await supabase
        .from("mural_reacoes")
        .select("post_id, tipo, user_id")
        .in("post_id", postIds);

      // Get comment counts
      const { data: comentarios } = await supabase
        .from("mural_comentarios")
        .select("post_id")
        .in("post_id", postIds)
        .eq("status", "publicado");

      // Process posts with counts
      const postsWithCounts = data?.map(post => {
        const postReacoes = reacoes?.filter(r => r.post_id === post.id) ?? [];
        const postComentarios = comentarios?.filter(c => c.post_id === post.id) ?? [];
        const autorProfile = profiles?.find(p => p.id === post.autor_user_id);
        
        const reacoesCounts = {
          confirmar: postReacoes.filter(r => r.tipo === 'confirmar').length,
          apoiar: postReacoes.filter(r => r.tipo === 'apoiar').length,
          replicar: postReacoes.filter(r => r.tipo === 'replicar').length,
          convocar: postReacoes.filter(r => r.tipo === 'convocar').length,
          gratidao: postReacoes.filter(r => r.tipo === 'gratidao').length,
        };

        const userReactions = postReacoes
          .filter(r => r.user_id === user?.id)
          .map(r => r.tipo as MuralReacaoTipo);

        return {
          ...post,
          autor: autorProfile || null,
          _count: {
            comentarios: postComentarios.length,
            reacoes: reacoesCounts,
          },
          _userReactions: userReactions,
        } as MuralPost;
      }) ?? [];

      return postsWithCounts;
    },
    enabled: !!cellId && !!user?.id,
  });

  const createPostMutation = useMutation({
    mutationFn: async (post: {
      escopo_id: string;
      tipo: MuralPostTipo;
      titulo?: string;
      corpo_markdown: string;
      mission_id?: string;
      atividade_id?: string;
      ciclo_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("mural_posts")
        .insert({
          escopo_tipo: "celula",
          escopo_id: post.escopo_id,
          tipo: post.tipo,
          titulo: post.titulo || null,
          corpo_markdown: post.corpo_markdown,
          autor_user_id: user!.id,
          mission_id: post.mission_id || null,
          atividade_id: post.atividade_id || null,
          ciclo_id: post.ciclo_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      toast.success("Post criado com sucesso!");
    },
    onError: (error: Error) => {
      if (error.message.includes("rate")) {
        toast.error("Aguarde 30 segundos entre posts.");
      } else {
        toast.error("Erro ao criar post.");
      }
    },
  });

  const hidePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("mural_posts")
        .update({ status: "oculto" })
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      toast.success("Post ocultado.");
    },
  });

  const restorePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("mural_posts")
        .update({ status: "publicado" })
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      toast.success("Post restaurado.");
    },
  });

  return {
    posts: postsQuery.data ?? [],
    isLoading: postsQuery.isLoading,
    createPost: createPostMutation.mutateAsync,
    isCreating: createPostMutation.isPending,
    hidePost: hidePostMutation.mutate,
    restorePost: restorePostMutation.mutate,
  };
}

// Hook for single post with comments
export function useMuralPost(postId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const postQuery = useQuery({
    queryKey: ["mural-post", postId],
    queryFn: async () => {
      if (!postId) return null;

      const { data, error } = await supabase
        .from("mural_posts")
        .select(`
          *,
          mission:missions!mural_posts_mission_id_fkey (id, title),
          atividade:atividades!mural_posts_atividade_id_fkey (id, titulo)
        `)
        .eq("id", postId)
        .single();

      if (error) throw error;
      
      // Get author profile
      const { data: autorProfile } = await supabase
        .from("profiles")
        .select("id, nickname, full_name")
        .eq("id", data.autor_user_id)
        .single();
      return { ...data, autor: autorProfile } as MuralPost;
    },
    enabled: !!postId,
  });

  const comentariosQuery = useQuery({
    queryKey: ["mural-comentarios", postId],
    queryFn: async () => {
      if (!postId) return [] as MuralComentario[];

      const { data, error } = await supabase
        .from("mural_comentarios")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Get author profiles
      const authorIds = [...new Set(data?.map(c => c.autor_user_id) ?? [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname, full_name")
        .in("id", authorIds);
      
      return data?.map(c => ({
        ...c,
        autor: profiles?.find(p => p.id === c.autor_user_id) || null,
      })) as MuralComentario[];
      return data as MuralComentario[];
    },
    enabled: !!postId,
  });

  const reacoesQuery = useQuery({
    queryKey: ["mural-reacoes", postId],
    queryFn: async () => {
      if (!postId) return [];

      const { data, error } = await supabase
        .from("mural_reacoes")
        .select("*")
        .eq("post_id", postId);

      if (error) throw error;
      return data as MuralReacao[];
    },
    enabled: !!postId,
  });

  const addComentarioMutation = useMutation({
    mutationFn: async (corpo: string) => {
      const { data, error } = await supabase
        .from("mural_comentarios")
        .insert({
          post_id: postId!,
          autor_user_id: user!.id,
          corpo_markdown: corpo,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mural-comentarios", postId] });
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      toast.success("Comentário adicionado!");
    },
    onError: (error: Error) => {
      if (error.message.includes("rate")) {
        toast.error("Aguarde 10 segundos entre comentários.");
      } else {
        toast.error("Erro ao comentar.");
      }
    },
  });

  const toggleReacaoMutation = useMutation({
    mutationFn: async (tipo: MuralReacaoTipo) => {
      // Check if reaction already exists
      const existing = reacoesQuery.data?.find(
        r => r.user_id === user?.id && r.tipo === tipo
      );

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from("mural_reacoes")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from("mural_reacoes")
          .insert({
            post_id: postId!,
            user_id: user!.id,
            tipo,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mural-reacoes", postId] });
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
    },
  });

  const hideComentarioMutation = useMutation({
    mutationFn: async (comentarioId: string) => {
      const { error } = await supabase
        .from("mural_comentarios")
        .update({ status: "oculto" })
        .eq("id", comentarioId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mural-comentarios", postId] });
      toast.success("Comentário ocultado.");
    },
  });

  // Compute reaction counts and user reactions
  const reacoesCounts = {
    confirmar: reacoesQuery.data?.filter(r => r.tipo === 'confirmar').length ?? 0,
    apoiar: reacoesQuery.data?.filter(r => r.tipo === 'apoiar').length ?? 0,
    replicar: reacoesQuery.data?.filter(r => r.tipo === 'replicar').length ?? 0,
    convocar: reacoesQuery.data?.filter(r => r.tipo === 'convocar').length ?? 0,
    gratidao: reacoesQuery.data?.filter(r => r.tipo === 'gratidao').length ?? 0,
  };

  const userReactions = reacoesQuery.data
    ?.filter(r => r.user_id === user?.id)
    .map(r => r.tipo as MuralReacaoTipo) ?? [];

  return {
    post: postQuery.data,
    comentarios: comentariosQuery.data ?? [],
    reacoesCounts,
    userReactions,
    isLoading: postQuery.isLoading || comentariosQuery.isLoading,
    addComentario: addComentarioMutation.mutateAsync,
    isAddingComentario: addComentarioMutation.isPending,
    toggleReacao: toggleReacaoMutation.mutate,
    hideComentario: hideComentarioMutation.mutate,
  };
}

// Hook to create a recibo post from admin
export function useCreateReciboPost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      cellId: string;
      tipo: 'recibo_atividade' | 'recibo_semana';
      titulo: string;
      corpo_markdown: string;
      atividade_id?: string;
      ciclo_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("mural_posts")
        .insert({
          escopo_tipo: "celula",
          escopo_id: params.cellId,
          tipo: params.tipo,
          titulo: params.titulo,
          corpo_markdown: params.corpo_markdown,
          autor_user_id: user!.id,
          atividade_id: params.atividade_id || null,
          ciclo_id: params.ciclo_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      toast.success("Recibo publicado no mural!");
    },
    onError: () => {
      toast.error("Erro ao publicar no mural.");
    },
  });
}
