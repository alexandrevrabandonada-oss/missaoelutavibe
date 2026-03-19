/**
 * Brand Configuration v0
 * 
 * Centralized branding strings and theme tokens based on app mode and brand pack.
 */

export type AppMode = 'pre' | 'campanha' | 'pos';
export type BrandPack = 'eluta' | 'neutro';

export interface BrandStrings {
  appName: string;
  slogan: string;
  signature: string;
  onboardingWelcome: string;
  onboardingSubtitle: string;
  inviteTitle: string;
  inviteSubtitle: string;
}

export interface BrandThemeTokens {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
}

const BRAND_STRINGS: Record<AppMode, BrandStrings> = {
  pre: {
    appName: "MISSÃO ÉLUTA",
    slogan: "Escutar • Cuidar • Organizar",
    signature: "#ÉLUTA — Escutar • Cuidar • Organizar",
    onboardingWelcome: "Bem-vindo(a) à pré-campanha!",
    onboardingSubtitle: "Estamos organizando nossa base para a campanha eleitoral.",
    inviteTitle: "Junte-se à luta!",
    inviteSubtitle: "Faça parte do movimento de pré-campanha.",
  },
  campanha: {
    appName: "MISSÃO ÉLUTA",
    slogan: "Escutar • Cuidar • Organizar",
    signature: "#ÉLUTA — Escutar • Cuidar • Organizar",
    onboardingWelcome: "Bem-vindo(a) à campanha!",
    onboardingSubtitle: "Juntos vamos fazer história nas eleições.",
    inviteTitle: "Junte-se à campanha!",
    inviteSubtitle: "Faça parte da campanha oficial.",
  },
  pos: {
    appName: "MISSÃO ÉLUTA",
    slogan: "Escutar • Cuidar • Organizar",
    signature: "#ÉLUTA — Escutar • Cuidar • Organizar",
    onboardingWelcome: "Bem-vindo(a)!",
    onboardingSubtitle: "Continue fazendo parte do movimento.",
    inviteTitle: "Junte-se ao movimento!",
    inviteSubtitle: "Faça parte da nossa rede de apoio.",
  },
};

const BRAND_THEME_TOKENS: Record<BrandPack, BrandThemeTokens> = {
  eluta: {
    primary: "0 0% 9%",
    primaryForeground: "0 0% 98%",
    accent: "47 100% 50%",
    accentForeground: "0 0% 9%",
  },
  neutro: {
    primary: "220 14% 30%",
    primaryForeground: "0 0% 98%",
    accent: "220 14% 50%",
    accentForeground: "0 0% 98%",
  },
};

/**
 * Get brand strings for the current app mode
 */
export function getBrandStrings(mode: AppMode): BrandStrings {
  return BRAND_STRINGS[mode] || BRAND_STRINGS.pre;
}

/**
 * Get theme tokens for the current brand pack
 */
export function getBrandThemeTokens(brandPack: BrandPack): BrandThemeTokens {
  return BRAND_THEME_TOKENS[brandPack] || BRAND_THEME_TOKENS.eluta;
}

/**
 * Feature flags based on app mode
 */
export interface ModeFlags {
  invitesEnabled: boolean;
  printKitEnabled: boolean;
  fabricaShareEnabled: boolean;
  publicCertificatesEnabled: boolean;
  templatesEnabled: boolean;
  showPreCampaignBadge: boolean;
}

export function getModeFlags(mode: AppMode): ModeFlags {
  switch (mode) {
    case 'pre':
      return {
        invitesEnabled: true,
        printKitEnabled: false,
        fabricaShareEnabled: true,
        publicCertificatesEnabled: false,
        templatesEnabled: true,
        showPreCampaignBadge: true,
      };
    case 'campanha':
      return {
        invitesEnabled: true,
        printKitEnabled: true,
        fabricaShareEnabled: true,
        publicCertificatesEnabled: true,
        templatesEnabled: true,
        showPreCampaignBadge: false,
      };
    case 'pos':
      return {
        invitesEnabled: false,
        printKitEnabled: false,
        fabricaShareEnabled: false,
        publicCertificatesEnabled: true,
        templatesEnabled: false,
        showPreCampaignBadge: false,
      };
    default:
      return getModeFlags('pre');
  }
}

/**
 * Mode labels for UI
 */
export const MODE_LABELS: Record<AppMode, string> = {
  pre: "Pré-Campanha",
  campanha: "Campanha",
  pos: "Pós-Eleição",
};

export const BRAND_PACK_LABELS: Record<BrandPack, string> = {
  eluta: "ÉLUTA (Padrão)",
  neutro: "Neutro",
};
