/**
 * useCoordInlineValidation - Scoped inline validation for coordinator cell registros (F4.1 + F4.1b)
 * 
 * All mutations go through the `coord_validate_evidence` SECURITY DEFINER RPC,
 * which enforces cell-scope on the server. The client-side cellId is kept for
 * cache-invalidation only — it is NOT a security boundary.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MutationParams {
  evidenceId: string;
  action: "validar" | "pedir_ajuste" | "rejeitar";
  reason?: string;
  feedback?: string;
}

async function callCoordValidateEvidence(params: MutationParams) {
  const { data, error } = await supabase.rpc("coord_validate_evidence" as any, {
    _evidence_id: params.evidenceId,
    _action: params.action,
    _reason: params.reason ?? null,
    _feedback: params.feedback ?? null,
  });

  if (error) {
    // Extract user-friendly message from Postgres exception
    const msg = error.message?.replace(/^[A-Z0-9_]+:\s*/, "") || "Erro ao processar ação";
    throw new Error(msg);
  }
  return data;
}

export function useCoordInlineValidation(cellId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["coord-celula-registros", cellId] });
    queryClient.invalidateQueries({ queryKey: ["evidences"] });
    queryClient.invalidateQueries({ queryKey: ["evidences-pending"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const toastMap = {
    validar: { ok: "Registro validado", err: "Erro ao validar registro" },
    pedir_ajuste: { ok: "Pedido de ajuste enviado", err: "Erro ao pedir ajuste" },
    rejeitar: { ok: "Registro rejeitado", err: "Erro ao rejeitar registro" },
  };

  const mutation = useMutation({
    mutationFn: callCoordValidateEvidence,
    onSuccess: (_data, variables) => {
      toast.success(toastMap[variables.action].ok);
      invalidateAll();
    },
    onError: (err: Error, variables) => {
      toast.error(err.message || toastMap[variables.action].err);
    },
  });

  return {
    validate: (evidenceId: string, feedback?: string) =>
      mutation.mutateAsync({ evidenceId, action: "validar", feedback }),
    requestAdjust: (evidenceId: string, howToFix: string) =>
      mutation.mutateAsync({ evidenceId, action: "pedir_ajuste", reason: howToFix }),
    reject: (evidenceId: string, rejectionReason: string) =>
      mutation.mutateAsync({ evidenceId, action: "rejeitar", reason: rejectionReason }),
    isValidating: mutation.isPending && mutation.variables?.action === "validar",
    isAdjusting: mutation.isPending && mutation.variables?.action === "pedir_ajuste",
    isRejecting: mutation.isPending && mutation.variables?.action === "rejeitar",
    /** ID of the evidence currently being mutated */
    activeId: mutation.isPending ? (mutation.variables?.evidenceId ?? null) : null,
  };
}
