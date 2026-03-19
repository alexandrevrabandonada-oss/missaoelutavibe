import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Evidence = Tables<"evidences">;
type EvidenceInsert = TablesInsert<"evidences">;

export type EvidenceWithMission = Evidence & {
  missions: { id: string; title: string; type: string } | null;
};

export function useEvidences(missionId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const evidencesQuery = useQuery({
    queryKey: ["evidences", missionId],
    queryFn: async () => {
      let query = supabase.from("evidences").select("*");
      
      if (missionId) {
        query = query.eq("mission_id", missionId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as Evidence[];
    },
  });

  const myEvidencesQuery = useQuery({
    queryKey: ["my-evidences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("evidences")
        .select("*, missions(id, title, type)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EvidenceWithMission[];
    },
    enabled: !!user?.id,
  });

  const pendingEvidencesQuery = useQuery({
    queryKey: ["evidences-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidences")
        .select("*, missions(title, type)")
        .eq("status", "enviado")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as EvidenceWithMission[];
    },
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: async (evidence: EvidenceInsert) => {
      // Ensure new submissions have proper defaults
      const payload = {
        ...evidence,
        status: evidence.status || "enviado",
        visibilidade: evidence.visibilidade || "privada",
        mode: evidence.mode || "completo",
      };

      const { data, error } = await supabase
        .from("evidences")
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update mission status to "enviada"
      await supabase
        .from("missions")
        .update({ status: "enviada" })
        .eq("id", evidence.mission_id as string);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidences"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["current-mission"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("coord_validate_evidence" as any, {
        _evidence_id: id,
        _action: "validar",
        _reason: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidences"] });
      queryClient.invalidateQueries({ queryKey: ["evidences-pending"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason, howToFix }: { id: string; reason: string; howToFix?: string }) => {
      const action = howToFix ? "pedir_ajuste" : "rejeitar";
      const { data, error } = await supabase.rpc("coord_validate_evidence" as any, {
        _evidence_id: id,
        _action: action,
        _reason: howToFix || reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidences"] });
      queryClient.invalidateQueries({ queryKey: ["evidences-pending"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const validateEvidenceMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      rejectionReason, 
      howToFix,
    }: { 
      id: string; 
      status: "validado" | "rejeitado"; 
      rejectionReason?: string;
      howToFix?: string;
      validatedBy: string;
    }) => {
      let action: string;
      let reason: string | null = null;
      if (status === "validado") {
        action = "validar";
      } else if (howToFix) {
        action = "pedir_ajuste";
        reason = howToFix;
      } else {
        action = "rejeitar";
        reason = rejectionReason || "Rejeitado";
      }
      const { data, error } = await supabase.rpc("coord_validate_evidence" as any, {
        _evidence_id: id,
        _action: action,
        _reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidences"] });
      queryClient.invalidateQueries({ queryKey: ["evidences-pending"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
  });

  return {
    evidences: evidencesQuery.data ?? [],
    pendingEvidences: pendingEvidencesQuery.data ?? [],
    myEvidences: myEvidencesQuery.data ?? [],
    isLoading: evidencesQuery.isLoading || pendingEvidencesQuery.isLoading,
    isPendingLoading: pendingEvidencesQuery.isLoading,
    isMyEvidencesLoading: myEvidencesQuery.isLoading,
    submitEvidence: submitEvidenceMutation.mutateAsync,
    isSubmitting: submitEvidenceMutation.isPending,
    validateEvidence: validateEvidenceMutation.mutate,
    isValidating: validateEvidenceMutation.isPending,
    approve: approveMutation.mutateAsync,
    reject: (id: string, reason: string, howToFix?: string) => 
      rejectMutation.mutateAsync({ id, reason, howToFix }),
  };
}
