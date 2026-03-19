import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ObsSource = 'client' | 'server' | 'rpc';
type ObsSeverity = 'warn' | 'error' | 'fatal';

type ObsMeta = Partial<{
  rpc: string;
  status: string;
  stage: string;
  component: string;
  hint: string;
  mode: string;
}>;

function safeRoute(): string {
  try {
    return window.location?.pathname || 'unknown';
  } catch {
    return 'unknown';
  }
}

function safeSessionId(): string | null {
  try {
    const k = 'obs_session_id';
    let v = localStorage.getItem(k);
    if (!v) {
      v = crypto?.randomUUID?.() ?? String(Math.random()).slice(2);
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return null;
  }
}

export function useObservability() {
  const report = useCallback(
    async (args: {
      code: string;
      source?: ObsSource;
      severity?: ObsSeverity;
      route?: string;
      meta?: ObsMeta;
    }) => {
      try {
        const route = (args.route ?? safeRoute()).slice(0, 120);
        const code = (args.code ?? 'unknown').slice(0, 64);
        const source = args.source ?? 'client';
        const severity = args.severity ?? 'error';
        const meta = args.meta ?? {};
        const sessionId = safeSessionId();

        // Never send message/stack/raw error
        await (supabase.rpc as any)('log_app_error', {
          _route: route,
          _error_code: code,
          _source: source,
          _severity: severity,
          _meta: meta,
          _session_id: sessionId,
        });
      } catch {
        // Silently fail - don't break app for observability
      }
    },
    []
  );

  const reportRpcError = useCallback(
    async (rpc: string, status?: number | string, stage?: string, hint?: string) => {
      await report({
        code: 'RPC_FAILED',
        source: 'rpc',
        severity: 'error',
        meta: {
          rpc,
          status: status ? String(status) : undefined,
          stage,
          hint,
        },
      });
    },
    [report]
  );

  return { report, reportRpcError };
}
