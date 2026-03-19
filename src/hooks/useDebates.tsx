import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type Topico = Database["public"]["Tables"]["topicos"]["Row"];
type TopicoInsert = Database["public"]["Tables"]["topicos"]["Insert"];
type Post = Database["public"]["Tables"]["posts"]["Row"];
type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
type Comentario = Database["public"]["Tables"]["comentarios"]["Row"];
type ComentarioInsert = Database["public"]["Tables"]["comentarios"]["Insert"];
type TopicoEscopo = Database["public"]["Enums"]["topico_escopo"];

export const ESCOPO_LABELS: Record<TopicoEscopo, string> = {
  global: "Global",
  celula: "Célula",
};

export function useTopicos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const topicosQuery = useQuery({
    queryKey: ["topicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topicos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Topico[];
    },
    enabled: !!user,
  });

  const createTopicoMutation = useMutation({
    mutationFn: async (topico: Omit<TopicoInsert, "criado_por">) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("topicos")
        .insert({ ...topico, criado_por: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Topico;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topicos"] });
    },
  });

  const toggleOcultoMutation = useMutation({
    mutationFn: async ({ id, oculto }: { id: string; oculto: boolean }) => {
      const { error } = await supabase
        .from("topicos")
        .update({ oculto })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topicos"] });
    },
  });

  return {
    topicos: topicosQuery.data ?? [],
    isLoading: topicosQuery.isLoading,
    createTopico: createTopicoMutation.mutateAsync,
    toggleOculto: toggleOcultoMutation.mutateAsync,
  };
}

export function useTopico(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["topico", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("topicos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Topico;
    },
    enabled: !!user && !!id,
  });
}

export function usePosts(topicoId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ["posts", topicoId],
    queryFn: async () => {
      if (!topicoId) return [];

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("topico_id", topicoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Post[];
    },
    enabled: !!user && !!topicoId,
  });

  const createPostMutation = useMutation({
    mutationFn: async (texto: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!topicoId) throw new Error("Tópico não especificado");

      const { data, error } = await supabase
        .from("posts")
        .insert({
          topico_id: topicoId,
          autor_id: user.id,
          texto,
        } as PostInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", topicoId] });
    },
  });

  const toggleOcultoMutation = useMutation({
    mutationFn: async ({ id, oculto }: { id: string; oculto: boolean }) => {
      const { error } = await supabase
        .from("posts")
        .update({ oculto })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", topicoId] });
    },
  });

  return {
    posts: postsQuery.data ?? [],
    isLoading: postsQuery.isLoading,
    createPost: createPostMutation.mutateAsync,
    toggleOculto: toggleOcultoMutation.mutateAsync,
  };
}

export function useComentarios(postId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const comentariosQuery = useQuery({
    queryKey: ["comentarios", postId],
    queryFn: async () => {
      if (!postId) return [];

      const { data, error } = await supabase
        .from("comentarios")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Comentario[];
    },
    enabled: !!user && !!postId,
  });

  const createComentarioMutation = useMutation({
    mutationFn: async (texto: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!postId) throw new Error("Post não especificado");

      const { data, error } = await supabase
        .from("comentarios")
        .insert({
          post_id: postId,
          autor_id: user.id,
          texto,
        } as ComentarioInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios", postId] });
    },
  });

  const toggleOcultoMutation = useMutation({
    mutationFn: async ({ id, oculto }: { id: string; oculto: boolean }) => {
      const { error } = await supabase
        .from("comentarios")
        .update({ oculto })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comentarios", postId] });
    },
  });

  return {
    comentarios: comentariosQuery.data ?? [],
    isLoading: comentariosQuery.isLoading,
    createComentario: createComentarioMutation.mutateAsync,
    toggleOculto: toggleOcultoMutation.mutateAsync,
  };
}

// Hook to get author profiles for posts/comments
export function useAutorProfile(autorId: string | undefined) {
  return useQuery({
    queryKey: ["profile", autorId],
    queryFn: async () => {
      if (!autorId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, avatar_url")
        .eq("id", autorId)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!autorId,
  });
}
