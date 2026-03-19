/**
 * Mission Template Resolver
 * 
 * Resolves mission template fields (porque_importa, como_fazer, como_provar, share_message)
 * with time-based variation overrides from meta_json.variacoes_tempo.
 * 
 * Variations structure in meta_json:
 * {
 *   "variacoes_tempo": [
 *     { "minutes": 10, "como_fazer": ["bullet1", "bullet2"], "como_provar": "..." },
 *     { "minutes": 20, "como_fazer": ["bullet1", "bullet2", "bullet3"], "como_provar": "..." },
 *     { "minutes": 40, "como_fazer": ["bullet1", "bullet2", "bullet3"], "como_provar": "..." }
 *   ]
 * }
 */

import type { Tables, Json } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

interface TimeVariation {
  minutes: number;
  como_fazer?: string[];
  como_provar?: string;
  share_message?: string;
}

interface MetaWithVariations {
  variacoes_tempo?: TimeVariation[];
  estimated_min?: number;
  tags?: string[];
  [key: string]: unknown;
}

export interface ResolvedTemplate {
  porque_importa: string | null;
  como_fazer: string[];
  como_provar: string | null;
  share_message: string | null;
  resolved_minutes: number | null;
}

/**
 * Find the best time variation for the given available minutes.
 * Picks the largest variation that fits within availableMinutes.
 * If none fit, picks the smallest variation available.
 */
function findBestVariation(
  variations: TimeVariation[],
  availableMinutes: number
): TimeVariation | null {
  if (!variations.length) return null;

  // Sort ascending by minutes
  const sorted = [...variations].sort((a, b) => a.minutes - b.minutes);

  // Find the largest that fits
  let best: TimeVariation | null = null;
  for (const v of sorted) {
    if (v.minutes <= availableMinutes) {
      best = v;
    }
  }

  // If nothing fits, use the smallest
  return best ?? sorted[0];
}

/**
 * Resolve a mission's template fields, optionally adapting for available time.
 * 
 * @param mission - The mission record
 * @param availableMinutes - User's available time from check-in (optional)
 * @returns Resolved template fields with time-appropriate overrides
 */
export function resolveTemplate(
  mission: Mission,
  availableMinutes?: number | null
): ResolvedTemplate {
  const meta = mission.meta_json as MetaWithVariations | null;
  const variations = meta?.variacoes_tempo ?? [];

  // Base values from mission columns
  const base: ResolvedTemplate = {
    porque_importa: mission.porque_importa ?? null,
    como_fazer: mission.como_fazer ?? [],
    como_provar: mission.como_provar ?? null,
    share_message: mission.share_message ?? null,
    resolved_minutes: meta?.estimated_min ?? null,
  };

  // No variations or no time context → return base
  if (!variations.length || availableMinutes == null) {
    return base;
  }

  const variation = findBestVariation(variations, availableMinutes);
  if (!variation) return base;

  return {
    porque_importa: base.porque_importa,
    como_fazer: variation.como_fazer?.length ? variation.como_fazer : base.como_fazer,
    como_provar: variation.como_provar ?? base.como_provar,
    share_message: variation.share_message ?? base.share_message,
    resolved_minutes: variation.minutes,
  };
}
