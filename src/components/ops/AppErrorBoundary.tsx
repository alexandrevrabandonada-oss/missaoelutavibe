import React, { useState, useEffect, useCallback } from 'react';
import { focusRingClass } from '@/utils/a11y';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

function logCrash(code: string) {
  try {
    const route = window.location?.pathname || 'unknown';
    const sessionId = safeSessionId();
    
    // Fire and forget - don't await
    (supabase.rpc as any)('log_app_error', {
      _route: route,
      _error_code: code,
      _source: 'client',
      _severity: 'fatal',
      _meta: {},
      _session_id: sessionId,
    }).then(() => {}).catch(() => {});
  } catch {
    // Silently fail
  }
}

interface Props {
  children: React.ReactNode;
}

export function AppErrorBoundary({ children }: Props) {
  const [crashed, setCrashed] = useState(false);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    const onError = () => {
      // No message/stack - just error code
      logCrash('UNHANDLED_ERROR');
      setCrashed(true);
    };
    
    const onRejection = () => {
      logCrash('UNHANDLED_REJECTION');
      setCrashed(true);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (crashed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-bold">O app encontrou um erro</h1>
            <p className="text-sm text-muted-foreground">
              Já registramos o incidente (sem dados pessoais). Você pode recarregar a página para continuar.
            </p>
          </div>
          
          <Button
            onClick={handleReload}
            className={`w-full ${focusRingClass}`}
            aria-label="Recarregar página"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
