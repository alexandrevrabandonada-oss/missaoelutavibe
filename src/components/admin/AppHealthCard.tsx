import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { focusRingClass } from '@/utils/a11y';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Activity, AlertTriangle, Server, Monitor, Database } from 'lucide-react';

interface HealthMetrics {
  period_days: number;
  scope_city: string | null;
  total: number;
  by_day: Array<{ day: string; total: number }>;
  top_codes: Array<{ code: string; total: number }>;
  top_routes: Array<{ route: string; total: number }>;
  by_source: Array<{ source: string; total: number }>;
  error?: string;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  client: <Monitor className="h-3 w-3" />,
  server: <Server className="h-3 w-3" />,
  rpc: <Database className="h-3 w-3" />,
};

const SOURCE_LABELS: Record<string, string> = {
  client: 'Cliente',
  server: 'Servidor',
  rpc: 'RPC',
};

export function AppHealthCard() {
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await (supabase.rpc as any)('get_app_health_metrics', {
        _period_days: days,
        _scope_city: null,
      });
      setData(d as HealthMetrics);
    } catch {
      // Silently fail
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (data?.error === 'forbidden') return null;

  const hasErrors = (data?.total ?? 0) > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Saúde do App</h3>
          {hasErrors && (
            <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
              {data?.total} incidentes
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant={days === 7 ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2 text-xs ${focusRingClass}`}
            onClick={() => setDays(7)}
          >
            7d
          </Button>
          <Button
            variant={days === 30 ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2 text-xs ${focusRingClass}`}
            onClick={() => setDays(30)}
          >
            30d
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${focusRingClass}`}
            onClick={load}
            aria-label="Atualizar"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !hasErrors ? (
        <div className="flex items-center gap-2 text-sm text-green-500">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Nenhum incidente nos últimos {days} dias
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sources breakdown */}
          <div className="flex gap-3">
            {(data?.by_source ?? []).map((item) => (
              <div key={item.source} className="flex items-center gap-1 text-xs text-muted-foreground">
                {SOURCE_ICONS[item.source] || <AlertTriangle className="h-3 w-3" />}
                <span>{SOURCE_LABELS[item.source] || item.source}:</span>
                <span className="font-medium text-foreground">{item.total}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top error codes */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Top códigos de erro</p>
              <ul className="text-sm space-y-1">
                {(data?.top_codes ?? []).slice(0, 5).map((item) => (
                  <li key={item.code} className="flex justify-between items-center">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[160px]">
                      {item.code}
                    </code>
                    <span className="text-muted-foreground text-xs">{item.total}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top routes */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Top rotas afetadas</p>
              <ul className="text-sm space-y-1">
                {(data?.top_routes ?? []).slice(0, 5).map((item) => (
                  <li key={item.route} className="flex justify-between items-center">
                    <span className="truncate max-w-[160px] text-xs">{item.route}</span>
                    <span className="text-muted-foreground text-xs">{item.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trend mini-chart */}
          {data?.by_day && data.by_day.length > 1 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tendência diária</p>
              <div className="flex items-end gap-0.5 h-8">
                {data.by_day.slice(-14).map((item, i) => {
                  const max = Math.max(...data.by_day.map(d => d.total), 1);
                  const height = Math.max((item.total / max) * 100, 8);
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/60 rounded-t hover:bg-primary transition-colors"
                      style={{ height: `${height}%` }}
                      title={`${item.day}: ${item.total}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
