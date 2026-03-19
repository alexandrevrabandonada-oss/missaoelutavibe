/**
 * Pilot Mode Mission Filter
 * 
 * During pilot mode, only canonical missions (meta_json.canonical = true)
 * and cycle-curated missions are shown to volunteers.
 * Duplicates/old missions are hidden without deletion.
 */

import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

/** Check if a mission is archived (marked in meta_json) */
export function isArchivedMission(mission: Mission): boolean {
  const meta = mission.meta_json as { archived?: boolean } | null;
  return meta?.archived === true;
}

/** Check if a mission is canonical (marked in meta_json) */
export function isCanonicalMission(mission: Mission): boolean {
  const meta = mission.meta_json as { canonical?: boolean } | null;
  return meta?.canonical === true;
}

/**
 * Filter missions for pilot mode display.
 * Keeps only: canonical missions + cycle missions (by ID set).
 * Always keeps missions assigned to the current user regardless.
 */
export function filterPilotMissions(
  missions: Mission[],
  cycleMissionIds: Set<string> = new Set(),
  userId?: string,
): Mission[] {
  return missions.filter((m) => {
    // Never show archived missions
    if (isArchivedMission(m)) return false;
    // Always show user's own assigned missions
    if (userId && m.assigned_to === userId) return true;
    // Keep canonical missions
    if (isCanonicalMission(m)) return true;
    // Keep cycle-curated missions
    if (cycleMissionIds.has(m.id)) return true;
    // Hide everything else
    return false;
  });
}
