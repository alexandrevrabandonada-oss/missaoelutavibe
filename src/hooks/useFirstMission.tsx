import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import type { Database } from "@/integrations/supabase/types";

type InterestType = Database["public"]["Enums"]["interest_type"];

export function useFirstMission() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const assignFirstMissionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.interests?.length) {
        throw new Error("User or interests not available");
      }

      // Get a random interest from user's interests
      const randomInterest = profile.interests[
        Math.floor(Math.random() * profile.interests.length)
      ] as InterestType;

      // Find a template for this interest
      const { data: template, error: templateError } = await supabase
        .from("first_mission_templates")
        .select("*")
        .eq("interest_type", randomInterest)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (templateError) {
        // Fallback to any active template
        const { data: fallbackTemplate, error: fallbackError } = await supabase
          .from("first_mission_templates")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .single();

        if (fallbackError) throw fallbackError;
        
        // Create mission from fallback template
        const { data: mission, error: missionError } = await supabase
          .from("missions")
          .insert({
            title: fallbackTemplate.title,
            description: fallbackTemplate.description,
            instructions: fallbackTemplate.instructions,
            type: fallbackTemplate.mission_type,
            status: "publicada",
            assigned_to: user.id,
            is_first_mission: true,
            requires_validation: true,
          })
          .select()
          .single();

        if (missionError) throw missionError;
        return mission;
      }

      // Create mission from template
      const { data: mission, error: missionError } = await supabase
        .from("missions")
        .insert({
          title: template.title,
          description: template.description,
          instructions: template.instructions,
          type: template.mission_type,
          status: "publicada",
          assigned_to: user.id,
          is_first_mission: true,
          requires_validation: true,
        })
        .select()
        .single();

      if (missionError) throw missionError;
      return mission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["current-mission"] });
    },
  });

  return {
    assignFirstMission: assignFirstMissionMutation.mutate,
    isAssigning: assignFirstMissionMutation.isPending,
    error: assignFirstMissionMutation.error,
  };
}
