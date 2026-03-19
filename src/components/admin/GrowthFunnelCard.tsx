import { useNavigate } from "react-router-dom";
import { useGrowthFunnel, useMiniVsNormalMetrics, EVENT_TYPE_LABELS } from "@/hooks/useGrowth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  AlertCircle, 
  AlertTriangle,
  ChevronRight,
  Users,
  ArrowDown,
  Package,
  Share2,
  Zap,
} from "lucide-react";

interface GrowthFunnelCardProps {
  periodDays?: number;
  scopeCidade?: string | null;
  compact?: boolean;
}

export function GrowthFunnelCard({ 
  periodDays = 7, 
  scopeCidade,
  compact = false,
}: GrowthFunnelCardProps) {
  const navigate = useNavigate();
  const { data: metrics, isLoading, error } = useGrowthFunnel(periodDays, scopeCidade);
  const { data: miniMetrics } = useMiniVsNormalMetrics(periodDays);

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return null;
  }

  const { counts, rates, alerts, top_templates, top_referrers } = metrics;

  // Calculate funnel steps for visualization
  const funnelSteps = [
    { key: "visit_comecar", label: "Visitas", value: counts.visit_comecar, rate: null },
    { key: "signup", label: "Cadastros", value: counts.signup, rate: rates.visit_to_signup },
    { key: "approved", label: "Aprovados", value: counts.approved, rate: rates.signup_to_approved },
    { key: "onboarding_complete", label: "Onboarding", value: counts.onboarding_complete, rate: rates.approved_to_onboarding },
    { key: "first_action", label: "1ª Ação", value: counts.first_action, rate: rates.onboarding_to_first_action },
  ];

  // Filter out steps with zero values at the start
  const activeFunnelSteps = funnelSteps.filter((step, idx) => {
    if (idx === 0) return step.value > 0;
    return true;
  });

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Growth Funnel ({periodDays}d)
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {rates.visit_to_active > 0 ? `${rates.visit_to_active}%` : "—"} conversão total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Funnel Visualization */}
        <div className="space-y-1">
          {activeFunnelSteps.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-2">
              <div 
                className="h-8 bg-primary/20 rounded-lg flex items-center justify-between px-3 text-sm"
                style={{ 
                  width: `${Math.max(30, (step.value / Math.max(counts.visit_comecar, 1)) * 100)}%`,
                  minWidth: "100px"
                }}
              >
                <span className="font-medium truncate">{step.label}</span>
                <span className="font-bold">{step.value}</span>
              </div>
              {step.rate !== null && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <ArrowDown className="h-3 w-3" />
                  {step.rate}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Mini vs Normal Metrics */}
        {miniMetrics && (miniMetrics.mini > 0 || miniMetrics.normal > 0) && !compact && (
          <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg text-xs">
            <Zap className="h-4 w-4 text-primary" />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Mini:</span>{" "}
                <span className="font-bold">{miniMetrics.mini}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Normal:</span>{" "}
                <span className="font-bold">{miniMetrics.normal}</span>
              </div>
            </div>
            {miniMetrics.mini > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {miniMetrics.miniToSignupRate}% → signup
              </Badge>
            )}
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && !compact && (
          <div className="space-y-2">
            {alerts.slice(0, 2).map((alert, idx) => (
              <div 
                key={idx}
                className={`p-2 rounded-lg text-xs flex items-start gap-2 cursor-pointer hover:opacity-80 ${
                  alert.level === "error" 
                    ? "bg-destructive/10 text-destructive" 
                    : "bg-orange-500/10 text-orange-600"
                }`}
                onClick={() => navigate(alert.action_url)}
              >
                {alert.level === "error" ? (
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="opacity-80">{alert.hint}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Contributors */}
        {!compact && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Top Templates */}
            {top_templates.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Top Templates
                </p>
                {top_templates.slice(0, 3).map((t) => (
                  <div 
                    key={t.template_id}
                    className="flex items-center justify-between bg-muted/50 px-2 py-1 rounded cursor-pointer hover:bg-muted"
                    onClick={() => navigate(`/admin/fabrica?template=${t.template_id}`)}
                  >
                    <span className="truncate flex-1">{t.template_titulo || "Sem título"}</span>
                    <Badge variant="secondary" className="text-[10px]">{t.active_count}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Top Referrers */}
            {top_referrers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Top Referrers
                </p>
                {top_referrers.slice(0, 3).map((r) => (
                  <div 
                    key={r.referrer_user_id}
                    className="flex items-center justify-between bg-muted/50 px-2 py-1 rounded cursor-pointer hover:bg-muted"
                    onClick={() => navigate("/admin/origens?tab=Cadeias")}
                  >
                    <span className="truncate flex-1">{r.referrer_name || "Anônimo"}</span>
                    <Badge variant="secondary" className="text-[10px]">{r.active_count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View Details */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate("/admin/origens")}
        >
          Ver detalhes
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
