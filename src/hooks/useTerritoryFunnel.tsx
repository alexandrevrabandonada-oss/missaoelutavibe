import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

export interface TerritoryFunnelRow {
  cidade: string;
  link_open: number;
  form_open: number;
  signup: number;
  approved: number;
  first_action: number;
  // Calculated conversion rates
  open_to_form: number | null;
  form_to_signup: number | null;
  signup_to_approved: number | null;
  approved_to_action: number | null;
}

export interface TerritoryFunnelAlert {
  cidade: string;
  type: "baixa_form" | "gargalo_aprovacao" | "gargalo_ativacao";
  message: string;
  severity: "warning" | "error";
}

interface RawFunnelRow {
  cidade: string;
  link_open: number;
  form_open: number;
  signup: number;
  approved: number;
  first_action: number;
}

function calculateConversion(from: number, to: number): number | null {
  if (from === 0) return null;
  return Math.round((to / from) * 100);
}

function detectAlerts(rows: TerritoryFunnelRow[]): TerritoryFunnelAlert[] {
  const alerts: TerritoryFunnelAlert[] = [];
  
  for (const row of rows) {
    // Cidade com muito open e pouco form (< 10% conversão)
    if (row.link_open >= 10 && row.open_to_form !== null && row.open_to_form < 10) {
      alerts.push({
        cidade: row.cidade,
        type: "baixa_form",
        message: `${row.cidade}: ${row.link_open} aberturas → apenas ${row.form_open} formulários (${row.open_to_form}%). Provável problema de copy/landing.`,
        severity: "warning",
      });
    }
    
    // Cidade com muito signup e pouca aprovação (< 50% conversão)
    if (row.signup >= 5 && row.signup_to_approved !== null && row.signup_to_approved < 50) {
      alerts.push({
        cidade: row.cidade,
        type: "gargalo_aprovacao",
        message: `${row.cidade}: ${row.signup} signups → apenas ${row.approved} aprovados (${row.signup_to_approved}%). Gargalo de validação.`,
        severity: "error",
      });
    }
    
    // Cidade com aprovado e zero first_action
    if (row.approved >= 3 && row.first_action === 0) {
      alerts.push({
        cidade: row.cidade,
        type: "gargalo_ativacao",
        message: `${row.cidade}: ${row.approved} aprovados → 0 primeiras ações. Gargalo de ativação.`,
        severity: "error",
      });
    }
  }
  
  return alerts;
}

export function useTerritoryFunnel(periodDays: number = 7) {
  const { user } = useAuth();
  const { getScope, isAdmin } = useUserRoles();
  
  const scope = getScope();
  const scopeCidade = isAdmin() ? null : scope.cidade;
  
  return useQuery({
    queryKey: ["territory-funnel", periodDays, scopeCidade],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_territory_funnel_by_city", {
        p_period_days: periodDays,
        p_scope_cidade: scopeCidade,
      });
      
      if (error) throw error;
      
      const rawRows = (data as unknown as RawFunnelRow[]) || [];
      
      // Calculate conversion rates
      const rows: TerritoryFunnelRow[] = rawRows.map(row => ({
        ...row,
        open_to_form: calculateConversion(row.link_open, row.form_open),
        form_to_signup: calculateConversion(row.form_open, row.signup),
        signup_to_approved: calculateConversion(row.signup, row.approved),
        approved_to_action: calculateConversion(row.approved, row.first_action),
      }));
      
      // Detect alerts
      const alerts = detectAlerts(rows);
      
      // Calculate totals
      const totals = rows.reduce(
        (acc, row) => ({
          link_open: acc.link_open + row.link_open,
          form_open: acc.form_open + row.form_open,
          signup: acc.signup + row.signup,
          approved: acc.approved + row.approved,
          first_action: acc.first_action + row.first_action,
        }),
        { link_open: 0, form_open: 0, signup: 0, approved: 0, first_action: 0 }
      );
      
      return {
        rows,
        alerts,
        totals: {
          ...totals,
          open_to_form: calculateConversion(totals.link_open, totals.form_open),
          form_to_signup: calculateConversion(totals.form_open, totals.signup),
          signup_to_approved: calculateConversion(totals.signup, totals.approved),
          approved_to_action: calculateConversion(totals.approved, totals.first_action),
        },
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
