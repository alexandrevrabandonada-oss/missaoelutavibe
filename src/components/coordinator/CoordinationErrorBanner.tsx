import { AlertTriangle, ChevronDown, Construction, Copy, RefreshCw, Stethoscope, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MetricSource } from "@/hooks/useCoordMetrics7d";
import { useState } from "react";

interface ErrorSource {
  name: string;
  error: Error | null;
  isLoading: boolean;
}

interface CoordinationErrorBannerProps {
  sources: ErrorSource[];
  scopeCidade: string | null;
  onRetry?: () => void;
  failedMetricSources?: MetricSource[];
}

/**
 * Production-ready error banner:
 * - Only visible to admin/coordinator
 * - Shows a short human message, no technical jargon
 * - Technical details hidden inside a collapsible "Diagnóstico (dev)" section
 */
export function CoordinationErrorBanner({
  sources,
  scopeCidade,
  onRetry,
  failedMetricSources = [],
}: CoordinationErrorBannerProps) {
  const { isAdmin, isCoordinator } = useUserRoles();
  const [devOpen, setDevOpen] = useState(false);

  // Only show to admin/coordinator
  if (!isAdmin() && !isCoordinator()) return null;

  const failedSources = sources.filter((s) => s.error && !s.isLoading);
  const isAnyLoading = sources.some((s) => s.isLoading);
  const totalIssues = failedSources.length + failedMetricSources.length;

  if (totalIssues === 0) return null;

  const isMissingCityLikely =
    !scopeCidade &&
    failedSources.some(
      (s) =>
        s.error?.message?.includes("city") ||
        s.error?.message?.includes("p_city_id") ||
        s.error?.message?.includes("null"),
    );

  const allErrorLines = [
    ...failedSources.map((s) => `RPC ${s.name}: ${s.error?.message || "Erro desconhecido"}`),
    ...failedMetricSources.map((s) => `Tabela ${s.table} (${s.label}): ${s.error || "indisponível"}`),
  ];

  const handleCopyErrors = () => {
    navigator.clipboard.writeText(allErrorLines.join("\n"));
    toast.success("Erros copiados para área de transferência");
  };

  return (
    <Card className="border-muted bg-muted/30">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Construction className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            {/* Human-friendly message */}
            <p className="text-sm text-muted-foreground">
              {totalIssues === 1
                ? "Uma métrica está em ajuste — valores exibidos como 0."
                : `${totalIssues} métricas em ajuste — valores exibidos como 0.`}
            </p>

            {isMissingCityLikely && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Selecione uma cidade para dados completos.</span>
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center gap-2 flex-wrap">
              {onRetry && (
                <Button size="sm" variant="ghost" onClick={onRetry} disabled={isAnyLoading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${isAnyLoading ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              )}
            </div>

            {/* Collapsible technical details — dev only */}
            <Collapsible open={devOpen} onOpenChange={setDevOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground px-0 h-auto py-1">
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${devOpen ? "rotate-180" : ""}`} />
                  Diagnóstico (dev)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {failedSources.map((source) => (
                    <li key={source.name} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>{source.name}</strong>: {source.error?.message?.slice(0, 120) || "Erro desconhecido"}
                      </span>
                    </li>
                  ))}
                  {failedMetricSources.map((source) => (
                    <li key={source.key} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>{source.label}</strong> (<code className="text-[10px]">{source.table}</code>):{" "}
                        {source.error?.slice(0, 120) || "Indisponível"}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleCopyErrors}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar erros
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                    <Link to="/admin/diagnostico">
                      <Stethoscope className="h-3 w-3 mr-1" />
                      DB Doctor
                    </Link>
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
