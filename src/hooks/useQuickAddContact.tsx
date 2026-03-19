import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { useProfile } from "@/hooks/useProfile";
import { isRateLimited, handleRateLimitError } from "@/hooks/useRateLimits";
import { updateLastAction } from "@/hooks/useReturnMode";
import type { Json } from "@/integrations/supabase/types";

export interface QuickAddContactParams {
  nome?: string;
  whatsapp: string;
  tags?: string[];
  origem?: "rua" | "conversa" | "manual" | "qr";
  scheduleKind?: "followup" | "agendar" | "nutrir";
  scheduleInHours?: number;
  context?: Record<string, unknown>;
}

export interface QuickAddContactResult {
  contact_id: string;
  is_new: boolean;
  whatsapp_norm: string | null;
  scheduled_at: string | null;
}

export function useQuickAddContact() {
  const queryClient = useQueryClient();
  const logGrowthEvent = useLogGrowthEvent();
  const { profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);

  const upsertMutation = useMutation({
    mutationFn: async (params: QuickAddContactParams): Promise<QuickAddContactResult | null> => {
      const { data, error } = await supabase.rpc("upsert_quick_contact", {
        _nome: params.nome || null,
        _whatsapp: params.whatsapp,
        _tags: params.tags || [],
        _origem: params.origem || "manual",
        _schedule_kind: params.scheduleKind || null,
        _schedule_in_hours: params.scheduleInHours || null,
        _context: (params.context || {}) as Json,
      });

      if (error) throw error;
      
      // Check for rate limit
      if (isRateLimited(data)) {
        handleRateLimitError(data, "cadastrar contato");
        return null;
      }
      
      return data as unknown as QuickAddContactResult;
    },
    onSuccess: (result, params) => {
      if (!result) return; // Rate limited
      
      queryClient.invalidateQueries({ queryKey: ["crm-contatos"] });
      queryClient.invalidateQueries({ queryKey: ["my-due-followups"] });
      queryClient.invalidateQueries({ queryKey: ["reactivation-status"] });
      
      // Update last_action_at
      updateLastAction("crm_contact");
      
      // Track event without PII
      logGrowthEvent.mutate({
        eventType: "crm_quick_add_saved",
        meta: {
          origem: params.origem || "manual",
          cidade: profile?.city || "unknown",
          has_name: !!params.nome,
          tags_count: params.tags?.length || 0,
          scheduled_kind: params.scheduleKind || null,
          scheduled_hours: params.scheduleInHours || null,
          is_new: result.is_new,
        },
      });

      toast.success(result.is_new ? "Contato cadastrado!" : "Contato atualizado!");
    },
    onError: (error) => {
      console.error("Quick add contact error:", error);
      toast.error("Erro ao salvar contato");
    },
  });

  const openModal = () => {
    setIsOpen(true);
    logGrowthEvent.mutate({
      eventType: "crm_quick_add_opened",
      meta: {
        cidade: profile?.city || "unknown",
      },
    });
  };

  const closeModal = () => setIsOpen(false);

  const openWhatsApp = (whatsapp: string, message?: string, inviteCode?: string) => {
    // Normalize whatsapp number
    const normalized = whatsapp.replace(/[^0-9]/g, "");
    const fullNumber = normalized.startsWith("55") ? normalized : `55${normalized}`;
    
    // Build message with UTM
    let text = message || "Oi! Tudo bem?";
    if (inviteCode) {
      const baseUrl = window.location.origin;
      text += `\n\nEntre no movimento: ${baseUrl}/r/${inviteCode}?utm_source=followup&utm_medium=whatsapp`;
    }
    
    const url = `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    
    logGrowthEvent.mutate({
      eventType: "crm_quick_add_whatsapp_opened",
      meta: {
        cidade: profile?.city || "unknown",
        has_invite_code: !!inviteCode,
      },
    });
  };

  return {
    isOpen,
    openModal,
    closeModal,
    upsertContact: upsertMutation.mutateAsync,
    isLoading: upsertMutation.isPending,
    openWhatsApp,
  };
}
