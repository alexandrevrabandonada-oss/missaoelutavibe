/**
 * Action Queue Hook - Unified "Fila de Ações" for volunteers
 * Aggregates followups, missions (rua/conversa), squad tasks, roteiros,
 * and post-event follow-ups into a single prioritized list.
 */

import { useMemo, useCallback } from "react";
import { useDueFollowups, type FollowupItem, type FollowupKind } from "./useFollowups";
import { useStreetMission } from "./useStreetMission";
import { useConversationMission } from "./useConversationMission";
import { useMyTasks, type SquadTask } from "./useSquads";
import { useRoteiroDoDia } from "./useRoteiros";
import { usePostEventFollowups, type PostEventFollowupItem } from "./usePostEventFollowups";
import { supabase } from "@/integrations/supabase/client";

// Types
export type ActionKind = 
  | "followup" 
  | "event_followup"
  | "mission_rua" 
  | "mission_conversa" 
  | "talento_task" 
  | "roteiro_sugerido";

export type ActionCTA = {
  label: string;
  action: "open" | "whatsapp" | "done" | "snooze" | "generate";
};

export interface ActionItem {
  id: string;
  kind: ActionKind;
  title: string;
  subtitle?: string;
  priority: 1 | 2 | 3 | 4; // 1 = agora (highest)
  dueLabel?: string; // "hoje", "atrasado", "48h"
  href?: string; // route to open
  ctas: ActionCTA[];
  meta?: Record<string, unknown>; // NO PII
}

// Constants
export const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  followup: "Follow-up",
  event_followup: "Pós-Evento",
  mission_rua: "Missão de Rua",
  mission_conversa: "Missão de Conversa",
  talento_task: "Tarefa",
  roteiro_sugerido: "Roteiro",
};

export const ACTION_KIND_ICONS: Record<ActionKind, string> = {
  followup: "phone",
  event_followup: "calendar-clock",
  mission_rua: "map-pin",
  mission_conversa: "message-circle",
  talento_task: "list-todo",
  roteiro_sugerido: "scroll-text",
};

// Tracking helper (no PII)
async function logActionEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[ActionQueue] Tracking error:", error);
  }
}

/**
 * Main hook for unified action queue
 */
export function useActionQueue() {
  // === Data Sources (each in isolation to avoid cross-failures) ===
  
  // 1. Follow-ups
  const followupsData = useDueFollowups(10);
  
  // 2. Street Mission
  const streetData = useStreetMission();
  
  // 3. Conversation Mission
  const conversaData = useConversationMission();
  
  // 4. Squad Tasks (from talent bank acceptance)
  const tasksData = useMyTasks();
  
  // 5. Roteiro do Dia
  const roteiroData = useRoteiroDoDia();

  // 6. Post-Event Follow-ups
  const postEventData = usePostEventFollowups();

  // === Error Codes (for debugging without PII) ===
  const errorCodes: string[] = useMemo(() => {
    const codes: string[] = [];
    // Each source can fail independently; we log which ones
    // (actual errors are caught internally by each hook)
    return codes;
  }, []);

  // === Build Unified Queue ===
  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];

    // --- Post-Event Follow-ups (Priority 1 - highest for attended contacts) ---
    try {
      if (postEventData.pendingFollowups && postEventData.pendingFollowups.length > 0) {
        postEventData.pendingFollowups.forEach((f: PostEventFollowupItem) => {
          items.push({
            id: `event-followup-${f.invite_id}`,
            kind: "event_followup",
            title: `Pós-Evento: ${f.contact_nome}`,
            subtitle: f.event_title,
            priority: 1,
            dueLabel: f.is_overdue ? "atrasado" : "12h",
            href: `/voluntario/crm?contato=${f.contact_id}`,
            ctas: [
              { label: "WhatsApp", action: "whatsapp" },
              { label: "Feito", action: "done" },
            ],
            meta: { 
              contact_id: f.contact_id, 
              event_id: f.event_id,
              kind: f.followup_kind,
            },
          });
        });
      }
    } catch {
      // Silently fail, other sources continue
    }

    // --- Regular Follow-ups (Priority 1) ---
    try {
      if (followupsData.followups && followupsData.followups.length > 0) {
        followupsData.followups.forEach((f: FollowupItem) => {
          const isOverdue = new Date(f.scheduled_for) < new Date();
          items.push({
            id: `followup-${f.id}`,
            kind: "followup",
            title: `Follow-up: ${f.nome_curto}`,
            subtitle: f.bairro ? `${f.bairro}, ${f.cidade}` : f.cidade,
            priority: 1,
            dueLabel: isOverdue ? "atrasado" : "hoje",
            href: "/voluntario/crm",
            ctas: [
              { label: "WhatsApp", action: "whatsapp" },
              { label: "Feito", action: "done" },
              { label: "Adiar", action: "snooze" },
            ],
            meta: { 
              contact_id: f.id, 
              kind: f.kind,
              cidade: f.cidade,
            },
          });
        });
      }
    } catch {
      // Silently fail, other sources continue
    }

    // --- Conversation Mission (Priority 1 if active, 2 if can generate) ---
    try {
      if (conversaData.missionInProgress && conversaData.todaysMission) {
        items.push({
          id: `conversa-${conversaData.todaysMission.id}`,
          kind: "mission_conversa",
          title: conversaData.todaysMission.title,
          subtitle: `${(conversaData.todaysMission.meta_json as any)?.actual_count || 0}/${(conversaData.todaysMission.meta_json as any)?.target_count || 3} conversas`,
          priority: 1,
          dueLabel: "em andamento",
          href: `/voluntario/missao-conversa/${conversaData.todaysMission.id}`,
          ctas: [{ label: "Continuar", action: "open" }],
          meta: { 
            mission_id: conversaData.todaysMission.id,
            objective: (conversaData.todaysMission.meta_json as any)?.objective,
          },
        });
      } else if (!conversaData.hasGeneratedToday && !conversaData.isLoading) {
        items.push({
          id: "conversa-generate",
          kind: "mission_conversa",
          title: "Missão de Conversa",
          subtitle: "Fale com 3 contatos hoje",
          priority: 2,
          dueLabel: "gerar",
          ctas: [{ label: "Gerar missão", action: "generate" }],
          meta: { type: "generate" },
        });
      }
    } catch {
      // Silently fail
    }

    // --- Street Mission (Priority 2 if active, 3 if can generate) ---
    try {
      if (streetData.missionInProgress && streetData.todaysMission) {
        const meta = streetData.todaysMission.meta_json as any;
        items.push({
          id: `rua-${streetData.todaysMission.id}`,
          kind: "mission_rua",
          title: "Missão de Rua",
          subtitle: meta?.bairro 
            ? `${meta.tempo_estimado || 10} min em ${meta.bairro}`
            : `${meta?.tempo_estimado || 10} min`,
          priority: 2,
          dueLabel: "em andamento",
          href: `/voluntario/missao-rua/${streetData.todaysMission.id}`,
          ctas: [{ label: "Continuar", action: "open" }],
          meta: { 
            mission_id: streetData.todaysMission.id,
            acao: meta?.acao,
          },
        });
      } else if (!streetData.hasGeneratedToday && !streetData.isLoading) {
        items.push({
          id: "rua-generate",
          kind: "mission_rua",
          title: "Missão de Rua (10 min)",
          subtitle: "Panfletagem ou visita rápida",
          priority: 3,
          dueLabel: "gerar",
          ctas: [{ label: "Gerar missão", action: "generate" }],
          meta: { type: "generate" },
        });
      }
    } catch {
      // Silently fail
    }

    // --- Squad Tasks from Talent Bank (Priority 3-4) ---
    try {
      if (tasksData.tasks && tasksData.tasks.length > 0) {
        // Filter to tasks linked to chamados (talent bank)
        const talentTasks = tasksData.tasks.filter((t: SquadTask) => t.ligado_chamado_id);
        
        talentTasks.slice(0, 3).forEach((task: SquadTask) => {
          const isUrgent = task.prazo_em && new Date(task.prazo_em) < new Date(Date.now() + 48 * 60 * 60 * 1000);
          items.push({
            id: `task-${task.id}`,
            kind: "talento_task",
            title: task.titulo,
            subtitle: (task as any).squad?.nome || "Tarefa atribuída",
            priority: isUrgent ? 3 : 4,
            dueLabel: task.prazo_em 
              ? new Date(task.prazo_em) < new Date() ? "atrasado" : "pendente"
              : undefined,
            href: "/voluntario/squads",
            ctas: [{ label: "Ver tarefa", action: "open" }],
            meta: { 
              task_id: task.id,
              status: task.status,
              prioridade: task.prioridade,
            },
          });
        });
      }
    } catch {
      // Silently fail
    }

    // --- Roteiro do Dia (Priority 4 - suggestion) ---
    try {
      if (roteiroData.roteiroDoDia) {
        items.push({
          id: `roteiro-${roteiroData.roteiroDoDia.id}`,
          kind: "roteiro_sugerido",
          title: "Roteiro do Dia",
          subtitle: roteiroData.roteiroDoDia.titulo,
          priority: 4,
          ctas: [
            { label: "Ver roteiro", action: "open" },
            { label: "WhatsApp", action: "whatsapp" },
          ],
          meta: { 
            roteiro_id: roteiroData.roteiroDoDia.id,
            objetivo: roteiroData.roteiroDoDia.objetivo,
          },
        });
      }
    } catch {
      // Silently fail
    }

    // Sort by priority
    return items.sort((a, b) => a.priority - b.priority);
  }, [
    postEventData.pendingFollowups,
    followupsData.followups,
    streetData.todaysMission,
    streetData.hasGeneratedToday,
    streetData.missionInProgress,
    streetData.isLoading,
    conversaData.todaysMission,
    conversaData.hasGeneratedToday,
    conversaData.missionInProgress,
    conversaData.isLoading,
    tasksData.tasks,
    roteiroData.roteiroDoDia,
  ]);

  // === Computed Properties ===
  const isLoading = 
    postEventData.isLoading ||
    followupsData.isLoading || 
    streetData.isLoading || 
    conversaData.isLoading || 
    tasksData.isLoading ||
    roteiroData.isLoading;

  const nextAction = actions.length > 0 ? actions[0] : null;
  const top3Actions = actions.slice(0, 3);
  const hasActions = actions.length > 0;

  // === Actions ===
  const refetch = useCallback(() => {
    followupsData.refetch();
    // Other data sources auto-refetch via query invalidation
  }, [followupsData]);

  // Tracking (stable reference - no deps that change frequently)
  const trackQueueViewed = useCallback(() => {
    logActionEvent("action_queue_viewed", { count: actions.length });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally stable

  const trackActionOpened = useCallback((item: ActionItem) => {
    logActionEvent("action_opened", { kind: item.kind, priority: item.priority });
  }, []);

  const trackActionGenerated = useCallback((kind: "mission_rua" | "mission_conversa") => {
    logActionEvent("action_generated", { kind });
  }, []);

  const trackActionDone = useCallback((kind: ActionKind, action: string) => {
    logActionEvent("action_done", { kind, action });
  }, []);

  // Mutation helpers
  const markFollowupDone = useCallback(async (contactId: string) => {
    await followupsData.markDone(contactId);
    trackActionDone("followup", "done");
  }, [followupsData, trackActionDone]);

  const snoozeFollowup = useCallback(async (contactId: string, hours = 24) => {
    await followupsData.snooze({ contactId, hours });
    trackActionDone("followup", "snooze");
  }, [followupsData, trackActionDone]);

  const generateStreetMission = useCallback(async () => {
    try {
      await streetData.generateMission({});
      trackActionGenerated("mission_rua");
    } catch {
      // Errors are surfaced by the underlying hook (toast). Swallow to prevent
      // window.unhandledrejection → AppErrorBoundary fatal screen.
    }
  }, [streetData, trackActionGenerated]);

  const generateConversaMission = useCallback(async (objective: "convidar" | "explicar" | "objecao" | "fechamento" = "convidar") => {
    try {
      await conversaData.generateMission({ objective });
      trackActionGenerated("mission_conversa");
    } catch {
      // Errors are surfaced by the underlying hook (toast). Swallow to prevent
      // window.unhandledrejection → AppErrorBoundary fatal screen.
    }
  }, [conversaData, trackActionGenerated]);

  // Post-event follow-up completion
  const completeEventFollowup = useCallback(async (eventId: string, contactId: string) => {
    await postEventData.complete(eventId, contactId);
    trackActionDone("event_followup", "done");
  }, [postEventData, trackActionDone]);

  return {
    // Data
    actions,
    nextAction,
    top3Actions,
    hasActions,
    
    // State
    isLoading,
    errorCodes,
    
    // Tracking
    trackQueueViewed,
    trackActionOpened,
    
    // Mutations
    markFollowupDone,
    snoozeFollowup,
    isMarkingDone: followupsData.isMarkingDone,
    isSnoozing: followupsData.isSnoozing,
    
    generateStreetMission,
    isGeneratingStreet: streetData.isGenerating,
    
    generateConversaMission,
    isGeneratingConversa: conversaData.isGenerating,

    completeEventFollowup,
    isCompletingEventFollowup: postEventData.isCompleting,
    
    // Refetch
    refetch,
  };
}
