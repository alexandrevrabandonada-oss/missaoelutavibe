import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type SharePlatform = 'whatsapp' | 'instagram_feed' | 'instagram_reels' | 'tiktok';

export interface SharePackFile {
  url: string;
  filename: string;
  type?: string;
}

export interface SharePackData {
  success: boolean;
  error?: string;
  template_id: string;
  platform: SharePlatform;
  caption: string;
  link: string;
  link_full: string;
  hook?: string;
  cta?: string;
  hashtags: string[];
  variant_key: string;
  files: SharePackFile[] | null;
  available_variants: Record<string, number>;
  titulo: string;
}

export interface SharePackMetrics {
  total_shares_7d: number;
  shares_by_platform: Record<string, number>;
  top_templates: Array<{
    id: string;
    titulo: string;
    shares: number;
  }>;
  conversion: {
    shares: number;
    signups_from_template: number;
    rate: number;
  };
  period_days: number;
}

export type ShareAction = 
  | 'share_whatsapp'
  | 'share_instagram_feed' 
  | 'share_instagram_reels'
  | 'share_tiktok'
  | 'copy_caption'
  | 'copy_link'
  | 'download_media';

export const PLATFORM_CONFIG: Record<SharePlatform, {
  label: string;
  emoji: string;
  variant: string;
  description: string;
}> = {
  whatsapp: {
    label: "WhatsApp",
    emoji: "💬",
    variant: "vertical_9x16",
    description: "Chat e Status",
  },
  instagram_feed: {
    label: "Instagram Feed",
    emoji: "📸",
    variant: "feed_4x5",
    description: "Post 4:5",
  },
  instagram_reels: {
    label: "Reels/Stories",
    emoji: "🎬",
    variant: "vertical_9x16",
    description: "9:16 vertical",
  },
  tiktok: {
    label: "TikTok",
    emoji: "🎵",
    variant: "vertical_9x16",
    description: "Post vertical",
  },
};

export const VARIANT_LABELS: Record<string, string> = {
  square_1x1: "Quadrado (1080×1080)",
  feed_4x5: "Feed (1080×1350)",
  vertical_9x16: "Vertical (1080×1920)",
  thumb_16x9: "Thumbnail (1920×1080)",
};

// Check if Web Share API supports files
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  // @ts-ignore - canShare is not in all TS versions
  if (!navigator.canShare) return false;
  return true;
}

// Fetch file as blob and create File object
async function fetchAsFile(url: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const type = blob.type || 'image/jpeg';
    return new File([blob], filename, { type });
  } catch (error) {
    console.error("Error fetching file:", error);
    return null;
  }
}

// Hook to get share pack data for a template
export function useSharePack(templateId: string | undefined, platform: SharePlatform) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["share-pack", templateId, platform],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await (supabase.rpc as any)("get_share_pack", {
        p_template_id: templateId,
        p_platform: platform,
      });

      if (error) throw error;
      return data as SharePackData;
    },
    enabled: !!user?.id && !!templateId,
    staleTime: 30000,
  });
}

// Hook to track share actions
export function useTrackShareAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      templateId, 
      action, 
      meta = {} 
    }: { 
      templateId: string; 
      action: ShareAction; 
      meta?: Record<string, any>;
    }) => {
      const { data, error } = await (supabase.rpc as any)("track_share_action", {
        p_template_id: templateId,
        p_action: action,
        p_meta: meta,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-pack"] });
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-user"] });
    },
  });
}

// Hook for share pack metrics (Ops)
export function useSharePackMetrics(scopeTipo: string = 'global', scopeId: string | null = null, days: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["share-pack-metrics", scopeTipo, scopeId, days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_share_pack_metrics", {
        p_scope_tipo: scopeTipo,
        p_scope_id: scopeId,
        p_days: days,
      });

      if (error) {
        console.error("Error fetching share pack metrics:", error);
        throw error;
      }

      return data as SharePackMetrics;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });
}

// Main sharing function using Web Share API
export async function shareMedia(
  files: SharePackFile[] | null,
  caption: string,
  link: string,
  platform: SharePlatform
): Promise<{ success: boolean; method: 'share_api' | 'download' | 'fallback'; error?: string }> {
  
  // Try Web Share API with files first
  if (files && files.length > 0 && canShareFiles()) {
    try {
      const fileObjects: File[] = [];
      
      for (const file of files) {
        const fileObj = await fetchAsFile(file.url, file.filename);
        if (fileObj) {
          fileObjects.push(fileObj);
        }
      }

      if (fileObjects.length > 0) {
        // Check if we can share these files
        const shareData: ShareData = {
          files: fileObjects,
          text: caption,
          url: link,
        };

        // @ts-ignore
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return { success: true, method: 'share_api' };
        }
      }
    } catch (error: any) {
      // User cancelled or share failed
      if (error.name === 'AbortError') {
        return { success: false, method: 'share_api', error: 'cancelled' };
      }
      console.error("Share API error:", error);
    }
  }

  // Fallback: Try share without files
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        text: caption,
        url: link,
      });
      return { success: true, method: 'fallback' };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, method: 'fallback', error: 'cancelled' };
      }
    }
  }

  return { success: false, method: 'fallback', error: 'not_supported' };
}

// Open WhatsApp with text (wa.me link)
export function openWhatsAppWithText(text: string): void {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

// Download files
export async function downloadFiles(files: SharePackFile[]): Promise<void> {
  for (const file of files) {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.filename || "media";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
