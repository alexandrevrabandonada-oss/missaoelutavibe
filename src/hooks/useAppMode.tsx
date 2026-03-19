/**
 * App Mode Hook v0
 * 
 * Provides access to app configuration (mode + brand pack) with caching and feature flags.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  AppMode, 
  BrandPack, 
  getBrandStrings, 
  getBrandThemeTokens, 
  getModeFlags,
  BrandStrings,
  BrandThemeTokens,
  ModeFlags
} from "@/lib/brand";

interface AppConfig {
  mode: AppMode;
  brandPack: BrandPack;
  updatedAt: string | null;
}

const DEFAULT_CONFIG: AppConfig = {
  mode: 'pre',
  brandPack: 'eluta',
  updatedAt: null,
};

/**
 * Hook to get current app mode and configuration
 */
export function useAppMode() {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["app-config"],
    queryFn: async (): Promise<AppConfig> => {
      const { data, error } = await (supabase.rpc as any)("get_app_config");
      
      if (error) {
        console.error("Error fetching app config:", error);
        return DEFAULT_CONFIG;
      }

      if (!data || data.length === 0) {
        return DEFAULT_CONFIG;
      }

      const row = data[0];
      return {
        mode: (row.mode as AppMode) || 'pre',
        brandPack: (row.brand_pack as BrandPack) || 'eluta',
        updatedAt: row.updated_at,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const currentConfig = config || DEFAULT_CONFIG;
  const mode = currentConfig.mode;
  const brandPack = currentConfig.brandPack;

  // Derived values
  const brandStrings: BrandStrings = getBrandStrings(mode);
  const themeTokens: BrandThemeTokens = getBrandThemeTokens(brandPack);
  const flags: ModeFlags = getModeFlags(mode);

  return {
    // Config values
    mode,
    brandPack,
    updatedAt: currentConfig.updatedAt,
    isLoading,
    error,
    
    // Derived values
    brandStrings,
    themeTokens,
    flags,
    
    // Convenience flags (destructured from flags)
    invitesEnabled: flags.invitesEnabled,
    printKitEnabled: flags.printKitEnabled,
    fabricaShareEnabled: flags.fabricaShareEnabled,
    publicCertificatesEnabled: flags.publicCertificatesEnabled,
    templatesEnabled: flags.templatesEnabled,
    showPreCampaignBadge: flags.showPreCampaignBadge,

    // Refetch function
    refetch: () => queryClient.invalidateQueries({ queryKey: ["app-config"] }),
  };
}

/**
 * Hook to update app mode (admin only)
 */
export function useSetAppMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mode, brandPack }: { mode: AppMode; brandPack: BrandPack }) => {
      const { data, error } = await (supabase.rpc as any)("set_app_config", {
        p_mode: mode,
        p_brand_pack: brandPack,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
      // Also invalidate governance audit if viewing history
      queryClient.invalidateQueries({ queryKey: ["governance-audit", "app_config"] });
    },
  });
}
