import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useConvites } from "./useConvites";
import { useLogGrowthEvent } from "./useGrowth";
import { toast } from "sonner";
import { buildInviteShareUrl, copyToClipboard } from "@/lib/shareUtils";

export interface InviteLoopState {
  hasShared: boolean;
  inviteCode: string | null;
  inviteLink: string;
  isLoading: boolean;
}

/**
 * Hook to manage the "Convide 1" loop state and actions.
 * All links use buildInviteShareUrl for consistent ref= tracking.
 */
export function useInviteLoop() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { convitesComUsos, isLoading: convitesLoading, createConvite, isCreating } = useConvites();
  const logGrowthEvent = useLogGrowthEvent();

  // Check if user has shared at least one invite
  const { data: hasSharedData, isLoading: sharedLoading } = useQuery({
    queryKey: ["invite-shared-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("growth_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_type", "invite_shared")
        .limit(1);
      if (error) {
        console.error("Error checking invite shared:", error);
        return false;
      }
      return (data?.length || 0) > 0;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Get the user's primary invite code or create one
  const primaryInvite = convitesComUsos.find(c => c.ativo) || null;
  const inviteCode = primaryInvite?.code || null;

  // Standard invite link with ref=
  const inviteLink = inviteCode ? buildInviteShareUrl(inviteCode) : "";

  // Create a default invite if none exists
  const ensureInviteCode = async (): Promise<string | null> => {
    if (inviteCode) return inviteCode;
    try {
      const result = await new Promise<any>((resolve, reject) => {
        createConvite(
          {
            canal_declarado: "convide1_loop",
            escopo_cidade: profile?.city || undefined,
            campanha_tag: "convide1",
          },
          {
            onSuccess: (data) => resolve(data),
            onError: (error) => reject(error),
          }
        );
      });
      return result?.code || null;
    } catch (error) {
      console.error("Error creating invite:", error);
      return null;
    }
  };

  // Copy invite link to clipboard
  const copyLink = async (): Promise<boolean> => {
    let code = inviteCode;
    if (!code) {
      code = await ensureInviteCode();
    }
    if (!code) {
      toast.error("Erro ao gerar seu link");
      return false;
    }

    const link = buildInviteShareUrl(code);
    const ok = await copyToClipboard(link);
    if (ok) {
      toast.success("Link copiado!");
      logGrowthEvent.mutate({
        eventType: "invite_shared",
        inviteCode: code,
        meta: { action: "copy_link" },
      });
    }
    return ok;
  };

  // Share via Web Share API
  const shareNative = async (): Promise<boolean> => {
    let code = inviteCode;
    if (!code) {
      code = await ensureInviteCode();
    }
    if (!code) {
      toast.error("Erro ao gerar seu link");
      return false;
    }

    const link = buildInviteShareUrl(code);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Missão ÉLuta - Convite",
          text: "Junte-se à Missão ÉLuta! Sua primeira missão em 10 minutos.",
          url: link,
        });
        logGrowthEvent.mutate({
          eventType: "invite_shared",
          inviteCode: code,
          meta: { action: "native_share" },
        });
        return true;
      } catch {
        return copyLink();
      }
    } else {
      return copyLink();
    }
  };

  // Log QR modal open
  const logQrOpen = () => {
    if (inviteCode) {
      logGrowthEvent.mutate({
        eventType: "invite_qr_opened",
        inviteCode,
        meta: {},
      });
    }
  };

  return {
    hasShared: hasSharedData || false,
    inviteCode,
    inviteLink,
    isLoading: convitesLoading || sharedLoading,
    isCreating,
    copyLink,
    shareNative,
    logQrOpen,
    ensureInviteCode,
    profile,
  };
}

/**
 * Hook to get invite loop metrics for admin dashboard
 */
export function useInviteLoopMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invite-loop-metrics"],
    queryFn: async () => {
      const now = new Date();
      const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: shared7d, error: sharedError } = await supabase
        .from("growth_events")
        .select("id")
        .eq("event_type", "invite_shared")
        .gte("occurred_at", date7d);

      if (sharedError) {
        console.error("Error fetching invite metrics:", sharedError);
        throw sharedError;
      }

      const { data: approvedWithRef, error: approvedError } = await supabase
        .from("growth_events")
        .select("id, referrer_user_id")
        .eq("event_type", "approved")
        .gte("occurred_at", date7d)
        .not("referrer_user_id", "is", null);

      if (approvedError) {
        console.error("Error fetching approved metrics:", approvedError);
        throw approvedError;
      }

      return {
        convites_compartilhados_7d: shared7d?.length || 0,
        conversao_approved_por_ref_7d: approvedWithRef?.length || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
