import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";

export interface UserTemplate {
  id: string;
  titulo: string;
  texto_base: string;
  hashtags: string[] | null;
  instrucoes: string | null;
  objetivo: string | null;
  status: string;
  created_at: string;
  variacoes_json: any[] | null;
}

/**
 * Hook to fetch templates available for the current user's territory scope
 */
export function useTemplatesForUser() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["user-templates", user?.id, profile?.city],
    queryFn: async () => {
      // Fetch templates that are published and either global or scoped to user's city
      let query = supabase
        .from("fabrica_templates")
        .select("*")
        .eq("status", "publicado")
        .order("created_at", { ascending: false });

      // Filter by scope: global OR user's city
      if (profile?.city) {
        query = query.or(`scope_id.is.null,scope_id.eq.${profile.city}`);
      } else {
        query = query.is("scope_id", null);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error("Error fetching templates:", error);
        throw error;
      }

      return data as UserTemplate[];
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  return {
    templates: templates || [],
    isLoading,
    error,
  };
}
