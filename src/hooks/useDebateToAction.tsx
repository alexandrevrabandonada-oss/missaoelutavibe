import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type MissionType = Database["public"]["Enums"]["mission_type"];
type DemandaTipo = Database["public"]["Enums"]["demanda_tipo"];

interface CreateMissionFromDebateParams {
  title: string;
  description: string;
  type: MissionType;
  cellId?: string | null;
  topicoId?: string;
  postId?: string;
}

interface CreateDemandaFromDebateParams {
  titulo: string;
  descricao: string;
  territorio?: string | null;
  topicoId?: string;
  postId?: string;
}

export function useDebateToAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createMissionMutation = useMutation({
    mutationFn: async (params: CreateMissionFromDebateParams) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("missions")
        .insert({
          title: params.title,
          description: params.description,
          type: params.type,
          cell_id: params.cellId ?? null,
          created_by: user.id,
          status: "rascunho",
          debate_topico_id: params.topicoId ?? null,
          debate_post_id: params.postId ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
  });

  const createDemandaMutation = useMutation({
    mutationFn: async (params: CreateDemandaFromDebateParams) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("demandas")
        .insert({
          titulo: params.titulo,
          descricao: params.descricao,
          tipo: "sugestao_base" as DemandaTipo,
          territorio: params.territorio ?? null,
          criada_por: user.id,
          status: "nova",
          prioridade: "media",
          debate_topico_id: params.topicoId ?? null,
          debate_post_id: params.postId ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
    },
  });

  return {
    createMissionFromDebate: createMissionMutation.mutateAsync,
    isCreatingMission: createMissionMutation.isPending,
    createDemandaFromDebate: createDemandaMutation.mutateAsync,
    isCreatingDemanda: createDemandaMutation.isPending,
  };
}
