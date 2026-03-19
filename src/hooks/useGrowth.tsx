import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Types for growth funnel data
export interface GrowthCounts {
  visit_comecar: number;
  signup: number;
  approved: number;
  onboarding_complete: number;
  first_action: number;
  active_7d: number;
}

export interface GrowthRates {
  visit_to_signup: number;
  signup_to_approved: number;
  approved_to_onboarding: number;
  onboarding_to_first_action: number;
  first_action_to_active: number;
  visit_to_active: number;
}

export interface TopTemplate {
  template_id: string;
  template_titulo: string | null;
  template_objetivo: string | null;
  visit_count: number;
  signup_count: number;
  approved_count: number;
  active_count: number;
}

export interface TopReferrer {
  referrer_user_id: string;
  referrer_name: string | null;
  referrer_cidade: string | null;
  signup_count: number;
  approved_count: number;
  active_count: number;
}

export interface TopCity {
  cidade: string;
  signup_count: number;
  approved_count: number;
  active_count: number;
  total: number;
}

export interface GrowthAlert {
  level: "warning" | "error" | "info";
  title: string;
  hint: string;
  action_url: string;
}

export interface GrowthFunnelMetrics {
  period_days: number;
  scope_cidade: string | null;
  counts: GrowthCounts;
  rates: GrowthRates;
  top_templates: TopTemplate[];
  top_referrers: TopReferrer[];
  top_cities: TopCity[];
  alerts: GrowthAlert[];
  generated_at: string;
}

// Session ID expiry in days (rotates for privacy)
const SESSION_EXPIRY_DAYS = 90;

// Generate a random session ID (alphanumeric, 32 chars)
function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate or retrieve a stable session ID for anonymous tracking with auto-rotation
function getOrCreateSessionId(): string {
  const STORAGE_KEY = "growth_session_id";
  const EXPIRY_KEY = "growth_session_expiry";
  
  try {
    // Try localStorage first (persists across tabs/sessions)
    const sessionId = localStorage.getItem(STORAGE_KEY);
    const expiryStr = localStorage.getItem(EXPIRY_KEY);
    const now = Date.now();
    
    // Check if session exists and is still valid
    if (sessionId && expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (!isNaN(expiry) && now < expiry) {
        return sessionId;
      }
    }
    
    // Generate new session with expiry
    const newSessionId = generateSessionId();
    const newExpiry = now + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    localStorage.setItem(STORAGE_KEY, newSessionId);
    localStorage.setItem(EXPIRY_KEY, String(newExpiry));
    
    return newSessionId;
  } catch {
    // Fallback for when localStorage is unavailable
    try {
      // sessionStorage doesn't need rotation - it's already session-scoped
      let sessionId = sessionStorage.getItem(STORAGE_KEY);
      if (!sessionId) {
        sessionId = generateSessionId();
        sessionStorage.setItem(STORAGE_KEY, sessionId);
      }
      return sessionId;
    } catch {
      // Last resort: generate a new one each time (no storage available)
      return generateSessionId();
    }
  }
}

// Hook to log growth events
export function useLogGrowthEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventType,
      templateId,
      inviteCode,
      meta,
    }: {
      eventType: string;
      templateId?: string;
      inviteCode?: string;
      meta?: Record<string, any>;
    }) => {
      const sessionId = getOrCreateSessionId();
      
      const { data, error } = await (supabase.rpc as any)("log_growth_event", {
        _event_type: eventType,
        _template_id: templateId || null,
        _invite_code: inviteCode || null,
        _meta: meta ?? {},
        _session_id: sessionId,
      });

      // Don't throw on error - log silently to avoid breaking user experience
      if (error) {
        console.warn("Growth event logging failed (non-blocking):", error.message);
        return null;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["growth-funnel"] });
    },
    // Don't propagate errors to UI
    onError: () => {},
  });
}

// Hook to get mini vs normal signup metrics
export function useMiniVsNormalMetrics(periodDays: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mini-vs-normal-metrics", periodDays],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - periodDays);
      
      // Get mini submits
      const { count: miniCount, error: miniError } = await supabase
        .from("growth_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "invite_submit_mini")
        .gte("occurred_at", cutoff.toISOString());
      
      if (miniError) throw miniError;
      
      // Get normal form opens (that didn't go through mini)
      const { count: formOpenCount, error: formError } = await supabase
        .from("growth_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "invite_form_open")
        .gte("occurred_at", cutoff.toISOString());
      
      if (formError) throw formError;
      
      // Get signups
      const { count: signupCount, error: signupError } = await supabase
        .from("growth_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "signup")
        .gte("occurred_at", cutoff.toISOString());
      
      if (signupError) throw signupError;
      
      const mini = miniCount || 0;
      const normal = (formOpenCount || 0) - mini; // Form opens that didn't submit mini
      const signups = signupCount || 0;
      
      return {
        mini,
        normal: Math.max(0, normal),
        signups,
        miniToSignupRate: mini > 0 ? Math.round((signups / mini) * 100) : 0,
        totalForms: (formOpenCount || 0) + mini,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });
}

// Hook to get growth funnel metrics (admin only)
export function useGrowthFunnel(periodDays: number = 7, scopeCidade?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["growth-funnel", periodDays, scopeCidade],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_growth_funnel_metrics", {
        _period_days: periodDays,
        _scope_cidade: scopeCidade,
      });

      if (error) {
        console.error("Error fetching growth funnel:", error);
        throw error;
      }

      return data as GrowthFunnelMetrics;
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Helper to get the stored origin data from localStorage
export function getStoredOrigin(): { templateId?: string; inviteCode?: string; utmSource?: string } | null {
  try {
    const stored = sessionStorage.getItem("growth_origin");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading growth origin:", e);
  }
  return null;
}

// Helper to store origin data in sessionStorage
export function storeOrigin(data: { templateId?: string; inviteCode?: string; utmSource?: string }) {
  try {
    sessionStorage.setItem("growth_origin", JSON.stringify(data));
  } catch (e) {
    console.error("Error storing growth origin:", e);
  }
}

// Helper to clear stored origin
export function clearStoredOrigin() {
  try {
    sessionStorage.removeItem("growth_origin");
  } catch (e) {
    console.error("Error clearing growth origin:", e);
  }
}

// Labels for event types
export const EVENT_TYPE_LABELS: Record<string, string> = {
  visit: "Visita",
  visit_comecar: "Visita /comecar",
  territory_link_open: "Link territorial",
  invite_form_open: "Formulário aberto",
  invite_submit_mini: "Convite mini",
  missions_view: "Ver missões",
  signup: "Cadastro",
  approved: "Aprovado",
  onboarding_complete: "Onboarding",
  first_action: "1ª Ação",
  first_mission_assigned: "Missão inicial atribuída",
  first_share_opened: "Modal ativação aberto",
  first_share_completed: "Share inicial",
  active_7d: "Ativo 7d",
  invite_shared: "Convite compartilhado",
  invite_qr_opened: "QR aberto",
  template_share: "Template compartilhado",
  // Certificate & post-course events
  certificate_viewed: "Certificado visualizado",
  certificate_shared: "Certificado compartilhado",
  post_course_mission_started: "Missão pós-curso iniciada",
  post_course_mission_completed: "Missão pós-curso concluída",
};

// Export session ID getter for components that need it
export { getOrCreateSessionId };
