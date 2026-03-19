/**
 * useTodayOrchestrator - Orchestrates modules on /voluntario/hoje
 * 
 * Manages module priorities, visibility, and dismissals to keep
 * the UI clean and focused (max 3 primary modules visible).
 */

import { useMemo, useCallback, useEffect, useRef, ReactNode } from "react";
import { isDismissedToday, dismissToday, cleanupOldDismissals } from "@/lib/todayDismiss";
import { supabase } from "@/integrations/supabase/client";

// Module keys for tracking and rendering
export type TodayModuleKey =
  | "primary_cta"
  | "today_mission"
  | "event_cycle"
  | "event_followup"
  | "return_mode"
  | "validation_feedback"
  | "daily_plan"
  | "streak"
  | "weekly_share"
  | "impact"
  | "first_action"
  | "bring1"
  | "quick_capture"
  | "micro_banner"
  | "return_complete";

// Module definition
export interface TodayModule {
  key: TodayModuleKey;
  priority: number; // lower = more important
  title?: string;
  reason?: string; // e.g., "48h_inactive", "event_36h", "overdue_followups"
  component: ReactNode;
  dismissible?: boolean;
  // If false, module won't be shown at all
  visible?: boolean;
}

// Module priorities (lower = more important)
export const MODULE_PRIORITIES: Record<TodayModuleKey, number> = {
  primary_cta: 0,
  today_mission: 1, // Recommended mission after check-in
  micro_banner: 2, // Micro completion feedback
  return_complete: 3, // Return mode completion
  event_followup: 4, // Overdue/pending followups
  event_cycle: 5, // Event within 36h
  return_mode: 6, // 48h+ inactive
  validation_feedback: 7,
  daily_plan: 8,
  streak: 9,
  weekly_share: 10,
  first_action: 11,
  bring1: 12,
  quick_capture: 13,
  impact: 14,
};

// Track events without PII
async function logTodayModuleEvent(
  eventType: string,
  meta?: Record<string, unknown>
) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[TodayOrchestrator] Tracking error:", error);
  }
}

interface UseTodayOrchestratorOptions {
  maxPrimary?: number; // Default: 3
}

interface TodayModuleInput {
  key: TodayModuleKey;
  component: ReactNode;
  visible?: boolean;
  dismissible?: boolean;
  reason?: string;
  title?: string;
  priorityOverride?: number; // Override default priority
}

export function useTodayOrchestrator(
  modules: TodayModuleInput[],
  options: UseTodayOrchestratorOptions = {}
) {
  const { maxPrimary = 3 } = options;
  
  // Track which modules have been shown (for dedupe tracking)
  const trackedShownRef = useRef<Set<string>>(new Set());
  const moreOpenedTrackedRef = useRef(false);

  // Cleanup old dismissals on mount
  useEffect(() => {
    cleanupOldDismissals();
  }, []);

  // Check if a module is dismissed
  const isDismissed = useCallback((key: TodayModuleKey): boolean => {
    return isDismissedToday(key);
  }, []);

  // Dismiss a module for today
  const dismissModule = useCallback((key: TodayModuleKey) => {
    dismissToday(key);
    
    // Track dismissal (no PII)
    logTodayModuleEvent("today_module_dismissed", { key });
  }, []);

  // Process and sort modules
  const { primary, more } = useMemo(() => {
    // Filter visible and non-dismissed modules
    const validModules = modules
      .filter((m) => m.visible !== false && !isDismissed(m.key))
      .map((m) => ({
        key: m.key,
        priority: m.priorityOverride ?? MODULE_PRIORITIES[m.key] ?? 99,
        title: m.title,
        reason: m.reason,
        component: m.component,
        dismissible: m.dismissible ?? false,
        visible: true,
      }))
      .sort((a, b) => a.priority - b.priority);

    // Split into primary (visible) and more (bottom sheet)
    const primaryModules = validModules.slice(0, maxPrimary);
    const moreModules = validModules.slice(maxPrimary);

    return {
      primary: primaryModules,
      more: moreModules,
    };
  }, [modules, maxPrimary, isDismissed]);

  // Track module shown (dedupe per key per session)
  const trackModuleShown = useCallback(
    (key: TodayModuleKey, slot: "primary" | "more", position: number, reason?: string) => {
      const trackKey = `${key}_${slot}_${position}`;
      if (trackedShownRef.current.has(trackKey)) return;
      
      trackedShownRef.current.add(trackKey);
      logTodayModuleEvent("today_module_shown", {
        key,
        slot,
        position,
        ...(reason ? { reason } : {}),
      });
    },
    []
  );

  // Track "Ver mais" opened
  const trackMoreOpened = useCallback((count: number) => {
    if (moreOpenedTrackedRef.current) return;
    moreOpenedTrackedRef.current = true;
    logTodayModuleEvent("today_more_opened", { count });
  }, []);

  // Track shown modules on render
  useEffect(() => {
    primary.forEach((m, index) => {
      trackModuleShown(m.key, "primary", index + 1, m.reason);
    });
  }, [primary, trackModuleShown]);

  return {
    primary,
    more,
    dismissModule,
    isDismissed,
    trackMoreOpened,
    hasMore: more.length > 0,
    moreCount: more.length,
  };
}
