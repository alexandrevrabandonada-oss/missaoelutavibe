import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";
import { format, startOfWeek } from "date-fns";

// Types for playbook data
export interface RitualAlert {
  level: "verde" | "amarelo" | "vermelho";
  title: string;
  action_url: string;
  hint: string;
}

export interface WeeklyRitualStatus {
  ciclo: {
    exists: boolean;
    id: string | null;
    titulo: string | null;
    status: string | null;
  };
  plenaria: {
    abertas_count: number;
    encerradas_7d: number;
    has_recibo_last: boolean;
  };
  semana: {
    has_metas: boolean;
    has_plano: boolean;
    has_backlog_tasks: boolean;
    has_recibo: boolean;
  };
  fabrica: {
    aprovados_7d: number;
    em_revisao: number;
  };
  agenda: {
    publicadas_7d: number;
    proximas_48h: number;
    concluidas_sem_recibo: number;
  };
  execucao: {
    missoes_abertas: number;
    em_execucao: number;
    concluidas_7d: number;
  };
  validacao: {
    evidencias_pendentes: number;
    tickets_abertos: number;
    tickets_antigos_dias: number;
  };
  moderacao: {
    reports_abertos: number;
  };
  crm: {
    followups_24h: number;
    conversas_pendentes: number;
  };
  status_geral: "verde" | "amarelo" | "vermelho";
  alerts: RitualAlert[];
}

export interface PlaybookNote {
  scope_tipo: string;
  scope_id: string | null;
  week_start: string;
  notes: string;
  updated_at: string;
  updated_by: string;
}

export type ScopeType = "global" | "estado" | "cidade" | "celula";

export function usePlaybook(
  scopeTipo?: ScopeType,
  scopeId?: string | null,
  weekStart?: string
) {
  const { user } = useAuth();
  const { getScope, isCoordinator, isAdmin } = useUserRoles();
  const queryClient = useQueryClient();

  // Auto-determine scope if not provided
  const userScope = getScope();
  const effectiveScopeTipo = scopeTipo ?? (userScope.type === "none" ? "global" : (userScope.type as ScopeType));
  const effectiveScopeId = scopeId ?? (userScope.type === "celula" ? userScope.cellId : userScope.cidade);
  const effectiveWeekStart = weekStart ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  // Fetch ritual status
  const ritualQuery = useQuery({
    queryKey: ["weekly-ritual-status", effectiveScopeTipo, effectiveScopeId, effectiveWeekStart],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_weekly_ritual_status", {
        _scope_tipo: effectiveScopeTipo,
        _scope_id: effectiveScopeId,
        _week_start: effectiveWeekStart,
      });

      if (error) {
        console.error("Error fetching weekly ritual status:", error);
        throw error;
      }

      return data as WeeklyRitualStatus;
    },
    enabled: !!user?.id && isCoordinator(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Fetch notes for current scope/week
  const notesQuery = useQuery({
    queryKey: ["playbook-notes", effectiveScopeTipo, effectiveScopeId, effectiveWeekStart],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("playbook_notes" as any) as any)
        .select("*")
        .eq("scope_tipo", effectiveScopeTipo)
        .eq("week_start", effectiveWeekStart)
        .maybeSingle();

      if (error) {
        console.error("Error fetching playbook notes:", error);
        throw error;
      }

      return data as PlaybookNote | null;
    },
    enabled: !!user?.id && isCoordinator(),
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const { data, error } = await (supabase.rpc as any)("save_playbook_notes", {
        _scope_tipo: effectiveScopeTipo,
        _scope_id: effectiveScopeId,
        _week_start: effectiveWeekStart,
        _notes: notes,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook-notes"] });
    },
  });

  return {
    ritual: ritualQuery.data,
    notes: notesQuery.data,
    isLoading: ritualQuery.isLoading,
    isLoadingNotes: notesQuery.isLoading,
    error: ritualQuery.error,
    refetch: ritualQuery.refetch,
    
    saveNotes: saveNotesMutation.mutateAsync,
    isSavingNotes: saveNotesMutation.isPending,
    
    // Expose effective scope
    effectiveScope: {
      tipo: effectiveScopeTipo,
      id: effectiveScopeId,
      weekStart: effectiveWeekStart,
    },
    
    // Access control helpers
    canChangeScope: isAdmin(),
  };
}

// Helper to get status icon/color
export function getRitualStepStatus(
  hasData: boolean,
  warningCondition: boolean = false
): { status: "ok" | "pendente" | "atrasado"; icon: string; color: string } {
  if (warningCondition) {
    return { status: "atrasado", icon: "🚨", color: "text-destructive" };
  }
  if (hasData) {
    return { status: "ok", icon: "✅", color: "text-green-500" };
  }
  return { status: "pendente", icon: "⚠️", color: "text-orange-500" };
}

// Helper to get overall status display
export function getStatusDisplay(status: "verde" | "amarelo" | "vermelho"): {
  icon: string;
  color: string;
  label: string;
  bgClass: string;
} {
  switch (status) {
    case "verde":
      return { 
        icon: "🟢", 
        color: "text-green-500", 
        label: "Saudável",
        bgClass: "bg-green-500/10 border-green-500/30"
      };
    case "amarelo":
      return { 
        icon: "🟡", 
        color: "text-yellow-500", 
        label: "Atenção",
        bgClass: "bg-yellow-500/10 border-yellow-500/30"
      };
    case "vermelho":
      return { 
        icon: "🔴", 
        color: "text-destructive", 
        label: "Crítico",
        bgClass: "bg-destructive/10 border-destructive/30"
      };
  }
}
