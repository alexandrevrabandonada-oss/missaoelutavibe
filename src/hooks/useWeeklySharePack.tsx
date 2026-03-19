import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useRef, useCallback } from "react";
import { toast } from "sonner";

export interface WeeklySharePackData {
  week_key: string;
  eligible: boolean;
  reason: "goal3" | "streak_milestone" | "return_complete" | null;
  invite_code: string;
  share_text: string;
  share_card_kind: "impact" | "certificate";
  already_shared: boolean;
  actions_count: number;
  error?: string;
}

// Get São Paulo day key for dedup
function getSPDayKey(): string {
  const now = new Date();
  // Approximate São Paulo offset (-3h)
  const spTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return spTime.toISOString().split("T")[0];
}

export function useWeeklySharePack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const viewedTodayRef = useRef<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["weekly-share-pack"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_weekly_share_pack");
      if (error) throw error;
      return data as WeeklySharePackData;
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

  // Track view (dedup by day)
  const trackView = useCallback(async () => {
    if (!data?.eligible || !data?.week_key) return;
    
    const dayKey = getSPDayKey();
    if (viewedTodayRef.current === dayKey) return;
    
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: "weekly_sharepack_shown",
        _meta: { week_key: data.week_key, reason: data.reason },
      });
      viewedTodayRef.current = dayKey;
    } catch (err) {
      console.warn("Failed to track weekly sharepack view:", err);
    }
  }, [data?.eligible, data?.week_key, data?.reason]);

  // Track click
  const trackClick = useCallback(async (channel: "native" | "copy" | "whatsapp") => {
    if (!data?.week_key) return;
    
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: "weekly_sharepack_clicked",
        _meta: { week_key: data.week_key, channel },
      });
    } catch (err) {
      console.warn("Failed to track weekly sharepack click:", err);
    }
  }, [data?.week_key]);

  // Track share success
  const trackShareSuccess = useCallback(async (channel: "native" | "copy" | "whatsapp") => {
    if (!data?.week_key) return;
    
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: "weekly_sharepack_shared",
        _meta: { week_key: data.week_key, channel },
      });
      // Invalidate to update already_shared status
      queryClient.invalidateQueries({ queryKey: ["weekly-share-pack"] });
    } catch (err) {
      console.warn("Failed to track weekly sharepack share:", err);
    }
  }, [data?.week_key, queryClient]);

  // Share using native Web Share API
  const shareNative = useCallback(async (): Promise<boolean> => {
    if (!data?.share_text) return false;
    
    trackClick("native");
    
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          text: data.share_text,
        });
        await trackShareSuccess("native");
        return true;
      } catch (err: any) {
        if (err.name === "AbortError") {
          return false; // User cancelled
        }
        console.warn("Native share failed:", err);
      }
    }
    
    return false;
  }, [data?.share_text, trackClick, trackShareSuccess]);

  // Copy text to clipboard
  const copyText = useCallback(async (): Promise<boolean> => {
    if (!data?.share_text) return false;
    
    trackClick("copy");
    
    try {
      await navigator.clipboard.writeText(data.share_text);
      await trackShareSuccess("copy");
      toast.success("Texto copiado!");
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = data.share_text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      
      if (success) {
        await trackShareSuccess("copy");
        toast.success("Texto copiado!");
        return true;
      }
      
      toast.error("Não foi possível copiar");
      return false;
    }
  }, [data?.share_text, trackClick, trackShareSuccess]);

  // Open WhatsApp with pre-filled text
  const openWhatsApp = useCallback(async () => {
    if (!data?.share_text) return;
    
    trackClick("whatsapp");
    
    const encoded = encodeURIComponent(data.share_text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    
    // Assume success since we can't track external app
    await trackShareSuccess("whatsapp");
  }, [data?.share_text, trackClick, trackShareSuccess]);

  // Check if banner should show (eligible + not shared this week)
  const shouldShowBanner = Boolean(
    data?.eligible && 
    !data?.already_shared && 
    !data?.error
  );

  return {
    data,
    isLoading,
    error,
    shouldShowBanner,
    trackView,
    shareNative,
    copyText,
    openWhatsApp,
  };
}
