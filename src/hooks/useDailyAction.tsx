/**
 * useDailyAction - Hook for the "Esteira do Dia" flow
 * 
 * Manages the main daily action based on check-in availability + focus.
 * Supports execution mode with completion tracking.
 */

import { useState, useCallback, useMemo } from "react";
import { useActionQueue, type ActionItem, type ActionKind } from "./useActionQueue";
import { useDailyCheckin } from "./useCadencia";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { updateLastAction } from "./useReturnMode";

export type ExecutionStatus = "idle" | "in_progress" | "completed";

export interface DailyActionState {
  selectedAction: ActionItem | null;
  executionStatus: ExecutionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  completionNote: string;
  hasEvidence: boolean;
}

// Track action events (no PII)
async function logDailyActionEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[DailyAction] Tracking error:", error);
  }
}

/**
 * Main hook for daily action execution flow
 */
export function useDailyAction() {
  const { user } = useAuth();
  const { todayCheckin, hasCheckedInToday } = useDailyCheckin();
  const actionQueue = useActionQueue();
  
  const [state, setState] = useState<DailyActionState>({
    selectedAction: null,
    executionStatus: "idle",
    startedAt: null,
    completedAt: null,
    completionNote: "",
    hasEvidence: false,
  });

  // Pick the best action based on checkin availability + focus
  const suggestedAction = useMemo(() => {
    if (!hasCheckedInToday || !todayCheckin) {
      return actionQueue.nextAction;
    }

    const { disponibilidade, foco_tipo } = todayCheckin;
    const actions = actionQueue.actions;

    // If user has specific focus, prioritize matching action
    if (foco_tipo && foco_tipo !== "none") {
      const kindMapping: Record<string, ActionKind[]> = {
        task: ["talento_task"],
        mission: ["mission_rua", "mission_conversa"],
        crm: ["followup"],
        agenda: [], // Agenda items come from elsewhere
      };
      
      const preferredKinds = kindMapping[foco_tipo] || [];
      const matchingAction = actions.find(a => preferredKinds.includes(a.kind));
      if (matchingAction) return matchingAction;
    }

    // Filter by availability time
    if (disponibilidade <= 15) {
      // Short time: prefer quick actions (followup, roteiro)
      const quickActions = actions.filter(a => 
        a.kind === "followup" || a.kind === "roteiro_sugerido"
      );
      if (quickActions.length > 0) return quickActions[0];
    } else if (disponibilidade >= 60) {
      // Plenty of time: prefer missions
      const longActions = actions.filter(a => 
        a.kind === "mission_rua" || a.kind === "mission_conversa"
      );
      if (longActions.length > 0) return longActions[0];
    }

    // Default: return next action by priority
    return actionQueue.nextAction;
  }, [hasCheckedInToday, todayCheckin, actionQueue.actions, actionQueue.nextAction]);

  // Start execution mode
  const startExecution = useCallback((action?: ActionItem) => {
    const actionToStart = action || suggestedAction;
    if (!actionToStart) return;

    setState(prev => ({
      ...prev,
      selectedAction: actionToStart,
      executionStatus: "in_progress",
      startedAt: new Date(),
      completedAt: null,
      completionNote: "",
      hasEvidence: false,
    }));

    logDailyActionEvent("next_action_started", {
      kind: actionToStart.kind,
      priority: actionToStart.priority,
    });
  }, [suggestedAction]);

  // Complete action (light or with evidence)
  const completeAction = useCallback(async (options?: { 
    note?: string; 
    withEvidence?: boolean;
  }) => {
    if (!state.selectedAction) return;

    const completedAt = new Date();
    const durationMs = state.startedAt 
      ? completedAt.getTime() - state.startedAt.getTime() 
      : 0;

    setState(prev => ({
      ...prev,
      executionStatus: "completed",
      completedAt,
      completionNote: options?.note || "",
      hasEvidence: options?.withEvidence || false,
    }));

    logDailyActionEvent("next_action_completed", {
      kind: state.selectedAction.kind,
      duration_seconds: Math.round(durationMs / 1000),
      has_evidence: options?.withEvidence || false,
      has_note: !!options?.note,
    });

    // Update last_action_at in profiles
    const kindMapping: Record<string, string> = {
      mission_rua: "mission_rua",
      mission_conversa: "mission_conversa",
      followup: "crm_followup",
      talento_task: "other",
      roteiro_sugerido: "other",
    };
    await updateLastAction(kindMapping[state.selectedAction.kind] || "other");

    // Handle specific action completion
    const { kind, meta } = state.selectedAction;
    
    if (kind === "followup" && meta?.contact_id) {
      await actionQueue.markFollowupDone(meta.contact_id as string);
    }
  }, [state.selectedAction, state.startedAt, actionQueue]);

  // Reset to idle
  const resetExecution = useCallback(() => {
    setState({
      selectedAction: null,
      executionStatus: "idle",
      startedAt: null,
      completedAt: null,
      completionNote: "",
      hasEvidence: false,
    });
  }, []);

  // Track invite click
  const trackInviteClicked = useCallback(() => {
    logDailyActionEvent("invite_clicked", {});
  }, []);

  // Track invite shared
  const trackInviteShared = useCallback(() => {
    logDailyActionEvent("invite_shared", {});
  }, []);

  // Track contact added
  const trackContactAdded = useCallback(() => {
    logDailyActionEvent("contact_added", {});
  }, []);

  return {
    // State
    suggestedAction,
    selectedAction: state.selectedAction,
    executionStatus: state.executionStatus,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    isIdle: state.executionStatus === "idle",
    isInProgress: state.executionStatus === "in_progress",
    isCompleted: state.executionStatus === "completed",
    
    // Actions
    startExecution,
    completeAction,
    resetExecution,
    
    // Tracking
    trackInviteClicked,
    trackInviteShared,
    trackContactAdded,
    
    // Queue passthrough
    actions: actionQueue.actions,
    isLoading: actionQueue.isLoading,
    hasActions: actionQueue.hasActions,
    generateStreetMission: actionQueue.generateStreetMission,
    generateConversaMission: actionQueue.generateConversaMission,
    isGeneratingStreet: actionQueue.isGeneratingStreet,
    isGeneratingConversa: actionQueue.isGeneratingConversa,
  };
}
