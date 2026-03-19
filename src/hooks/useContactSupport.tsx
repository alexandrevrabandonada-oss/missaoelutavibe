/**
 * CRM Apoio/Voto v0 - Contact Support Level Hook
 * 
 * Manages support/vote level tracking for CRM contacts.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";
import { useLogGrowthEvent } from "./useGrowth";
import { useAppMode } from "./useAppMode";
import { toast } from "sonner";

export type SupportLevel = 'unknown' | 'negative' | 'neutral' | 'leaning' | 'yes' | 'mobilizer';

export interface SupportMetrics {
  total: number;
  unknown: number;
  negative: number;
  neutral: number;
  leaning: number;
  yes: number;
  mobilizer: number;
  changes_period: number;
  conversion_rate?: number;
  scope_tipo?: string;
  scope_id?: string;
}

// Support level options with mode-aware labels
export function getSupportLevelOptions(mode: 'pre' | 'campanha' | 'pos') {
  const isCampaign = mode === 'campanha';
  
  return [
    { 
      value: 'unknown' as SupportLevel, 
      label: 'Não sei', 
      color: 'bg-muted text-muted-foreground',
      emoji: '❓'
    },
    { 
      value: 'negative' as SupportLevel, 
      label: 'Contra', 
      color: 'bg-destructive/10 text-destructive border-destructive/30',
      emoji: '👎'
    },
    { 
      value: 'neutral' as SupportLevel, 
      label: 'Neutro', 
      color: 'bg-muted text-muted-foreground',
      emoji: '😐'
    },
    { 
      value: 'leaning' as SupportLevel, 
      label: 'Tendendo', 
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      emoji: '🤔'
    },
    { 
      value: 'yes' as SupportLevel, 
      label: isCampaign ? 'Voto Sim' : 'Apoia', 
      color: 'bg-green-100 text-green-700 border-green-300',
      emoji: '✅'
    },
    { 
      value: 'mobilizer' as SupportLevel, 
      label: 'Puxa junto', 
      color: 'bg-primary/10 text-primary border-primary/30',
      emoji: '🔥'
    },
  ];
}

// Scripts for quick actions (mode-aware)
export function getSupportScripts(mode: 'pre' | 'campanha' | 'pos') {
  const isCampaign = mode === 'campanha';
  
  return {
    ask_support: isCampaign 
      ? "Oi! Posso contar com seu voto? Seria muito importante pra nossa luta." 
      : "Oi! Queria saber se posso contar com seu apoio. Estamos construindo algo importante.",
    ask_referral: isCampaign
      ? "Você conhece mais alguém que poderia votar com a gente? Cada voto conta!"
      : "Você conhece mais alguém que poderia apoiar nossa causa? Toda ajuda conta!",
    invite_event: isCampaign
      ? "Temos uma atividade de campanha esta semana. Gostaria de participar?"
      : "Temos uma atividade esta semana. Gostaria de conhecer mais sobre nosso movimento?",
  };
}

/**
 * Set support level for a contact
 */
export function useSetSupportLevel() {
  const queryClient = useQueryClient();
  const { mutate: logEvent } = useLogGrowthEvent();
  const { mode } = useAppMode();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      level, 
      reason 
    }: { 
      contactId: string; 
      level: SupportLevel; 
      reason?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)("set_contact_support_level", {
        _contact_id: contactId,
        _support_level: level,
        _reason: reason || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["crm-contato", variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-my-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["support-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["scope-support-metrics"] });

      // Track event without PII
      logEvent({
        eventType: "crm_support_set",
        meta: {
          level: variables.level,
          mode,
          contact_ref: "present", // No contact_id!
        },
      });

      toast.success("Apoio atualizado!");
    },
    onError: (error: Error) => {
      console.error("Error setting support level:", error);
      toast.error("Erro ao atualizar apoio");
    },
  });
}

/**
 * Get my support metrics (volunteer view)
 */
export function useMySupportMetrics(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["support-metrics", user?.id, days],
    queryFn: async (): Promise<SupportMetrics> => {
      const { data, error } = await (supabase.rpc as any)("get_my_support_metrics", {
        _days: days,
      });

      if (error) throw error;
      return data as SupportMetrics;
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute cache
  });
}

/**
 * Get scope support metrics (coordinator/admin view)
 */
export function useScopeSupportMetrics(
  scopeTipo: 'cidade' | 'all' = 'all',
  scopeId?: string,
  days: number = 30
) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["scope-support-metrics", scopeTipo, scopeId, days],
    queryFn: async (): Promise<SupportMetrics> => {
      const { data, error } = await (supabase.rpc as any)("get_scope_support_metrics", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId || null,
        _days: days,
      });

      if (error) throw error;
      return data as SupportMetrics;
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
  });
}

/**
 * Track support script copied
 */
export function useTrackSupportScript() {
  const { mutate: logEvent } = useLogGrowthEvent();
  const { mode } = useAppMode();

  return (scriptType: 'ask_support' | 'ask_referral' | 'invite_event') => {
    logEvent({
      eventType: "crm_support_script_copied",
      meta: {
        type: scriptType,
        mode,
      },
    });
  };
}
