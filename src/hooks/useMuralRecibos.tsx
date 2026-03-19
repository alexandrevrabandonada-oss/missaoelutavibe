import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Hook for upserting recibo posts (avoids duplicates)
export function useMuralRecibos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Upsert activity receipt post
  const upsertReciboAtividade = useMutation({
    mutationFn: async (params: {
      cellId: string;
      atividadeId: string;
      cicloId?: string | null;
      titulo: string;
      resumo: string;
      feitos: string;
      proximos_passos: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const corpo_markdown = `## ${params.titulo}

**Resumo:** ${params.resumo}

### ✅ O que foi feito:
${params.feitos}

### ➡️ Próximos passos:
${params.proximos_passos}

---
📍 [Ver detalhes da atividade](/voluntario/agenda/${params.atividadeId})`;

      // Check for existing post
      const { data: existing, error: fetchError } = await supabase
        .from("mural_posts" as any)
        .select("id")
        .eq("atividade_id", params.atividadeId)
        .eq("tipo", "recibo_atividade")
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Update existing post
        const { data, error } = await supabase
          .from("mural_posts" as any)
          .update({
            titulo: params.titulo,
            corpo_markdown,
            ciclo_id: params.cicloId || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existing as any).id)
          .select()
          .single();

        if (error) throw error;
        return { action: "updated", data };
      } else {
        // Create new post
        const { data, error } = await supabase
          .from("mural_posts" as any)
          .insert({
            escopo_tipo: "celula",
            escopo_id: params.cellId,
            tipo: "recibo_atividade",
            titulo: params.titulo,
            corpo_markdown,
            autor_user_id: user.id,
            atividade_id: params.atividadeId,
            ciclo_id: params.cicloId || null,
          })
          .select()
          .single();

        if (error) throw error;
        return { action: "created", data };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      toast.success(
        result.action === "updated"
          ? "Recibo atualizado no Mural!"
          : "Recibo publicado no Mural!"
      );
    },
    onError: (error: Error) => {
      console.error("Error upserting recibo atividade:", error);
      toast.error("Erro ao publicar no mural");
    },
  });

  // Upsert weekly receipt post
  const upsertReciboSemana = useMutation({
    mutationFn: async (params: {
      cellId: string;
      cicloId: string;
      titulo: string;
      feitos: string;
      travas?: string;
      proximos_passos?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const corpo_markdown = `## 📋 Recibo da Semana: ${params.titulo}

### ✅ O que fizemos:
${params.feitos}

${params.travas ? `### 🚧 Travas e desafios:\n${params.travas}\n` : ""}
${params.proximos_passos ? `### ➡️ Próximos passos:\n${params.proximos_passos}\n` : ""}
---
💪 Obrigado a todos que participaram!

📍 [Ver mais em Minha Semana](/voluntario/semana)

#ÉLuta — Escutar • Cuidar • Organizar`;

      // Check for existing post
      const { data: existing, error: fetchError } = await supabase
        .from("mural_posts" as any)
        .select("id")
        .eq("ciclo_id", params.cicloId)
        .eq("tipo", "recibo_semana")
        .eq("escopo_id", params.cellId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Update existing post
        const { data, error } = await supabase
          .from("mural_posts" as any)
          .update({
            titulo: `Recibo: ${params.titulo}`,
            corpo_markdown,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existing as any).id)
          .select()
          .single();

        if (error) throw error;
        return { action: "updated", data };
      } else {
        // Create new post
        const { data, error } = await supabase
          .from("mural_posts" as any)
          .insert({
            escopo_tipo: "celula",
            escopo_id: params.cellId,
            tipo: "recibo_semana",
            titulo: `Recibo: ${params.titulo}`,
            corpo_markdown,
            autor_user_id: user.id,
            ciclo_id: params.cicloId,
          })
          .select()
          .single();

        if (error) throw error;
        return { action: "created", data };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      toast.success(
        result.action === "updated"
          ? "Recibo da Semana atualizado no Mural!"
          : "Recibo da Semana publicado no Mural!"
      );
    },
    onError: (error: Error) => {
      console.error("Error upserting recibo semana:", error);
      toast.error("Erro ao publicar recibo no mural");
    },
  });

  return {
    upsertReciboAtividade: upsertReciboAtividade.mutateAsync,
    isUpsertingAtividade: upsertReciboAtividade.isPending,
    upsertReciboSemana: upsertReciboSemana.mutateAsync,
    isUpsertingSemana: upsertReciboSemana.isPending,
  };
}
