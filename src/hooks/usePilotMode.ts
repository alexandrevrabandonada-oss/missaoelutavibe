/**
 * usePilotMode - Lightweight 3-step pilot funnel tracking.
 *
 * Steps: (1) Check-in  (2) Missão do dia  (3) Convite +1
 *
 * Uses localStorage for persistence. Auto-detects step completion
 * from existing hooks (checkin, missions, invites).
 * Resets daily so the funnel is fresh each day.
 */

import { useMemo, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useDailyCheckin } from "./useCadencia";
import { useInviteLoop } from "./useInviteLoop";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PILOT_KEY = "pilot_mode_v1";
const SHARED_MATERIAL_KEY = "shared_material_today";

interface PilotState {
  date: string; // YYYY-MM-DD
  dismissed: boolean;
  inviteSent: boolean; // manual flag for step 4
  materialShared: boolean; // manual flag for step 3
}

/** Check if user shared a material today (set by ShareMaterialModal) */
export function hasSharedMaterialToday(userId: string): boolean {
  try {
    const raw = localStorage.getItem(`${SHARED_MATERIAL_KEY}:${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.date === todayStr();
    }
  } catch {}
  return false;
}

/** Mark that user shared a material today (called from ShareMaterialModal) */
export function markMaterialSharedToday(userId: string) {
  localStorage.setItem(
    `${SHARED_MATERIAL_KEY}:${userId}`,
    JSON.stringify({ date: todayStr() })
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function readState(userId: string): PilotState {
  try {
    const raw = localStorage.getItem(`${PILOT_KEY}:${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as PilotState;
      if (parsed.date === todayStr()) return parsed;
    }
  } catch {}
  return { date: todayStr(), dismissed: false, inviteSent: false, materialShared: false };
}

function writeState(userId: string, state: PilotState) {
  localStorage.setItem(`${PILOT_KEY}:${userId}`, JSON.stringify(state));
}

export type PilotStep = 1 | 2 | 3 | 4;

export function usePilotMode() {
  const { user } = useAuth();
  const { hasCheckedInToday } = useDailyCheckin();
  const { hasShared } = useInviteLoop();

  // Check if user completed a mission today
  const completedTodayQuery = useQuery({
    queryKey: ["pilot-completed-today", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("missions")
        .select("id")
        .eq("assigned_to", user.id)
        .in("status", ["concluida", "enviada", "validada"])
        .gte("updated_at", todayStart.toISOString())
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const state = useMemo(() => {
    if (!user?.id) return null;
    return readState(user.id);
  }, [user?.id]);

  const step1Done = hasCheckedInToday;
  const step2Done = completedTodayQuery.data ?? false;
  const step3Done = user?.id ? (state?.materialShared || hasSharedMaterialToday(user.id)) : false;
  const step4Done = state?.inviteSent || hasShared;

  const stepsCompleted = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0) + (step4Done ? 1 : 0);
  const isComplete = stepsCompleted === 4;
  const isDismissed = state?.dismissed ?? false;

  // Current dominant step (first incomplete)
  const currentStep: PilotStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4;

  const markInviteSent = useCallback(() => {
    if (!user?.id) return;
    const s = readState(user.id);
    s.inviteSent = true;
    writeState(user.id, s);
  }, [user?.id]);

  const dismiss = useCallback(() => {
    if (!user?.id) return;
    const s = readState(user.id);
    s.dismissed = true;
    writeState(user.id, s);
  }, [user?.id]);

  // During beta, pilot mode is always active for filtering purposes
  const isPilotMode = true;

  // Show pilot track for all users while in beta (hide only if dismissed or complete)
  const showPilotTrack = !isComplete && !isDismissed;

  return {
    isPilotMode,
    showPilotTrack,
    currentStep,
    step1Done,
    step2Done,
    step3Done,
    step4Done,
    stepsCompleted,
    isComplete,
    markInviteSent,
    dismiss,
  };
}
