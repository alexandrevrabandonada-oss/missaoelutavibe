/**
 * useNavTracking - Navigation analytics hook
 * 
 * Tracks navigation clicks by role without PII.
 * Also provides hub_opened and checkin_submitted tracking.
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type NavRole = "voluntario" | "coordenador" | "admin";

interface NavTrackingOptions {
  role: NavRole;
  item: string;
  section?: string;
}

interface HubOpenedOptions {
  hub: "aprender" | "agir" | "eu";
}

interface CheckinSubmittedOptions {
  disponibilidade: number;
  foco_tipo: string;
  has_blocker: boolean;
}

export function useNavTracking() {
  const { user } = useAuth();

  const trackNavClick = useCallback(
    async ({ role, item, section }: NavTrackingOptions) => {
      if (!user?.id) return;

      try {
        // Fire-and-forget analytics insert
        await supabase.from("audit_logs").insert({
          action: "nav_clicked",
          entity_type: "navigation",
          entity_id: null,
          user_id: user.id,
          old_data: null,
          new_data: {
            role,
            item,
            section: section || null,
          },
        });
      } catch (error) {
        // Silent fail - analytics should not block UX
        console.debug("Nav tracking failed:", error);
      }
    },
    [user?.id]
  );

  const trackHubOpened = useCallback(
    async ({ hub }: HubOpenedOptions) => {
      if (!user?.id) return;

      try {
        await supabase.from("audit_logs").insert({
          action: "hub_opened",
          entity_type: "navigation",
          entity_id: null,
          user_id: user.id,
          old_data: null,
          new_data: { hub },
        });
      } catch (error) {
        console.debug("Hub tracking failed:", error);
      }
    },
    [user?.id]
  );

  const trackCheckinSubmitted = useCallback(
    async ({ disponibilidade, foco_tipo, has_blocker }: CheckinSubmittedOptions) => {
      if (!user?.id) return;

      try {
        await supabase.from("audit_logs").insert({
          action: "checkin_submitted",
          entity_type: "daily_checkin",
          entity_id: null,
          user_id: user.id,
          old_data: null,
          new_data: {
            disponibilidade,
            foco_tipo,
            has_blocker,
          },
        });
      } catch (error) {
        console.debug("Checkin tracking failed:", error);
      }
    },
    [user?.id]
  );

  return { 
    trackNavClick, 
    trackHubOpened, 
    trackCheckinSubmitted 
  };
}
