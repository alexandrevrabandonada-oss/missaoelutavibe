import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ContentSignal = 'util' | 'replicar' | 'divulgar' | 'puxo';

export const CONTENT_SIGNAL_CONFIG: Record<ContentSignal, { emoji: string; label: string }> = {
  util: { emoji: "✅", label: "Útil" },
  replicar: { emoji: "♻️", label: "Replicar" },
  divulgar: { emoji: "📣", label: "Divulgar" },
  puxo: { emoji: "🤝", label: "Puxo" },
};

export interface SignalCount {
  signal: ContentSignal;
  count: number;
  user_reacted: boolean;
}

export interface TopContentItem {
  content_id: string;
  title: string;
  type: string;
  total_signals: number;
  util_count: number;
  replicar_count: number;
  divulgar_count: number;
  puxo_count: number;
  unique_users: number;
}

// Get signal counts for a content item
export function useContentSignalCounts(contentId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content-signals", contentId],
    queryFn: async () => {
      if (!contentId) return [];

      const { data, error } = await supabase.rpc("get_content_signal_counts", {
        p_content_id: contentId,
      });

      if (error) throw error;
      return (data || []) as SignalCount[];
    },
    enabled: !!user && !!contentId,
  });
}

// Toggle a signal on a content item
export function useToggleContentSignal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentId, signal }: { contentId: string; signal: ContentSignal }) => {
      // Check if signal already exists
      const { data: existing } = await supabase
        .from("content_signals")
        .select("id")
        .eq("content_id", contentId)
        .eq("user_id", user!.id)
        .eq("signal", signal)
        .maybeSingle();

      if (existing) {
        // Remove signal
        const { error } = await supabase
          .from("content_signals")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { action: "removed", signal };
      } else {
        // Add signal
        const { error } = await supabase
          .from("content_signals")
          .insert({
            content_id: contentId,
            user_id: user!.id,
            signal,
          });
        if (error) throw error;
        return { action: "added", signal };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["content-signals", variables.contentId] });
      queryClient.invalidateQueries({ queryKey: ["top-content-week"] });
    },
  });
}

// Get top content for the week
export function useTopContentWeek(type?: string, limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["top-content-week", type, limit],
    queryFn: async () => {
      // Cast to any to avoid enum type mismatch with RPC
      const { data, error } = await (supabase.rpc as any)("get_top_content_week", {
        p_type: type || null,
        p_limit: limit,
      });

      if (error) throw error;
      return (data || []) as TopContentItem[];
    },
    enabled: !!user,
  });
}

// Get user's signals for multiple content items (for list views)
export function useUserSignalsForContent(contentIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-content-signals", contentIds],
    queryFn: async () => {
      if (!contentIds.length) return {} as Record<string, ContentSignal[]>;

      const { data, error } = await supabase
        .from("content_signals")
        .select("content_id, signal")
        .eq("user_id", user!.id)
        .in("content_id", contentIds);

      if (error) throw error;

      // Group by content_id
      const result: Record<string, ContentSignal[]> = {};
      for (const row of data || []) {
        const cid = row.content_id;
        const sig = row.signal as ContentSignal;
        if (!result[cid]) {
          result[cid] = [];
        }
        result[cid].push(sig);
      }
      return result;
    },
    enabled: !!user && contentIds.length > 0,
  });
}
