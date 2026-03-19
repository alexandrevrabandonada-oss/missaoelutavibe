/**
 * CoordAuditSection - Recent audit log for coordination (no PII)
 * 
 * Shows last 10 coordination events. Only visible for COORD_GLOBAL/Admin Master.
 * Graceful degradation if RPC fails.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  History, 
  AlertTriangle, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { useCoordAudit, AUDIT_ACTION_LABELS, AUDIT_ACTION_ICONS, type CoordAuditAction } from "@/hooks/useCoordAudit";

interface CoordAuditSectionProps {
  limit?: number;
  cityId?: string | null;
}

export function CoordAuditSection({ limit = 10, cityId }: CoordAuditSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const { entries, isLoading, isError, error, refetch, generateUserCode } = useCoordAudit(14, cityId);
  
  const displayEntries = expanded ? entries.slice(0, 20) : entries.slice(0, limit);

  if (isError) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Auditoria recente</CardTitle>
            </div>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            <span>Auditoria indisponível</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {(error as Error)?.message?.includes("Acesso negado") 
              ? "Requer permissão de coordenação"
              : "Erro ao carregar dados"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Auditoria recente</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {entries.length} evento(s)
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Últimas operações de coordenação (sem PII)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Nenhum evento nos últimos 14 dias
          </p>
        ) : (
          <>
            {displayEntries.map((entry) => (
              <AuditEntryRow 
                key={entry.id} 
                entry={entry} 
                generateUserCode={generateUserCode}
              />
            ))}
            
            {entries.length > limit && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver mais ({entries.length - limit})
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface AuditEntryRowProps {
  entry: {
    id: string;
    created_at: string;
    actor_profile_id: string;
    action: CoordAuditAction;
    scope_type: string;
    target_profile_id: string | null;
    meta_json: Record<string, unknown>;
  };
  generateUserCode: (id: string) => string;
}

function AuditEntryRow({ entry, generateUserCode }: AuditEntryRowProps) {
  const icon = AUDIT_ACTION_ICONS[entry.action] || "📋";
  const label = AUDIT_ACTION_LABELS[entry.action] || entry.action;
  
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  // Extract extra info from meta_json
  const meta = entry.meta_json || {};
  const extraInfo: string[] = [];
  
  if (meta.role) extraInfo.push(`Papel: ${meta.role}`);
  if (meta.operation) extraInfo.push(meta.operation === "CREATE" ? "Novo" : "Editado");
  if (meta.cell_name) extraInfo.push(`Célula: ${meta.cell_name}`);
  if (meta.promoted_to_coordinator) extraInfo.push("+ Coord");

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
      <span className="text-sm" title={entry.action}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium">{label}</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {entry.scope_type}
          </Badge>
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
          <span>Por: {generateUserCode(entry.actor_profile_id)}</span>
          {entry.target_profile_id && (
            <span>→ {generateUserCode(entry.target_profile_id)}</span>
          )}
          {extraInfo.length > 0 && (
            <span className="text-primary">• {extraInfo.join(" • ")}</span>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {timeAgo}
      </span>
    </div>
  );
}
