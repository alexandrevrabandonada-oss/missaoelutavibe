import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminSectionWrapper } from "@/components/admin/AdminSubNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";

interface SessionTestResult {
  ok: boolean;
  role: string | null;
  expiresAt: string | null;
  email_masked: string | null;
  error?: string;
}

export default function AdminAjuda() {
  const { user, session } = useAuth();
  const { isAdmin, isCoordinator } = useUserRoles();
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<SessionTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestSession = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setTestResult({ ok: false, role: null, expiresAt: null, email_masked: null, error: "Sem sessão ativa" });
        return;
      }

      const expiresAt = currentSession.expires_at
        ? new Date(currentSession.expires_at * 1000).toISOString()
        : null;

      const email = currentSession.user?.email ?? "";
      const emailMasked = email
        ? email.replace(/^(.{2})(.*)(@.*)$/, (_m, a, b, c) => a + "*".repeat(b.length) + c)
        : null;

      setTestResult({
        ok: true,
        role: isAdmin() ? "admin" : isCoordinator() ? "coordenador" : "voluntário",
        expiresAt,
        email_masked: emailMasked,
      });
    } catch (e: any) {
      setTestResult({ ok: false, role: null, expiresAt: null, email_masked: null, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const configChecklist = [
    {
      key: "ADMIN_PASSWORD",
      label: "Senha de admin",
      tip: "Use uma senha forte (mín. 12 caracteres). Nunca inclua em URLs ou parâmetros de query string.",
      example: "Ex: MinhaSenhaF0rte!2025",
      badExample: "Não: https://site.com?pass=123",
    },
    {
      key: "ALLOWED_ORIGIN",
      label: "Origens permitidas (CORS)",
      tip: "Lista de domínios separados por vírgula, sem espaço, sem barra final.",
      example: "Ex: https://missaoeluta.lovable.app,https://meusite.com.br",
      badExample: "Não: https://missaoeluta.lovable.app/ (sem barra final)",
    },
  ];

  if (!isAdmin() && !isCoordinator()) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Acesso restrito a administradores e coordenadores.
      </div>
    );
  }

  return (
    <AdminSectionWrapper
      title="Central de Ajuda — Admin"
      subtitle="Checklist de configuração, diagnóstico e teste de sessão"
      breadcrumbs={[{ label: "Ajuda" }]}
    >
      <div className="space-y-6">
        {/* Config Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Checklist de Configuração
            </CardTitle>
            <CardDescription>
              Variáveis de ambiente essenciais. Os valores não são exibidos por segurança.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configChecklist.map((item) => (
              <div key={item.key} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <code className="text-sm font-mono font-semibold">{item.key}</code>
                  </div>
                  <Badge variant="outline" className="text-xs">{item.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.tip}</p>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-primary">✓ {item.example}</span>
                  <span className="text-destructive">✗ {item.badExample}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Session Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5 text-primary" />
              Testar Sessão
            </CardTitle>
            <CardDescription>
              Verifica se sua sessão está ativa e qual papel está atribuído.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleTestSession} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando…
                </>
              ) : (
                "Testar sessão"
              )}
            </Button>

            {testResult && (
              <div className={`rounded-lg border p-4 space-y-2 ${testResult.ok ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                <div className="flex items-center gap-2">
                  {testResult.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-semibold text-sm">
                    {testResult.ok ? "Sessão ativa" : "Falha na sessão"}
                  </span>
                </div>

                {testResult.ok ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Papel:</dt>
                    <dd><Badge variant="secondary">{testResult.role}</Badge></dd>
                    <dt className="text-muted-foreground">E-mail:</dt>
                    <dd className="font-mono text-xs">{testResult.email_masked}</dd>
                    <dt className="text-muted-foreground">Expira em:</dt>
                    <dd className="font-mono text-xs">{testResult.expiresAt ?? "—"}</dd>
                  </dl>
                ) : (
                  <p className="text-sm text-destructive">{testResult.error}</p>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const text = JSON.stringify({ ok: testResult.ok, role: testResult.role, expiresAt: testResult.expiresAt }, null, 2);
                    navigator.clipboard.writeText(text);
                    toast({ title: "Copiado!" });
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" /> Copiar resultado
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Links Rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/admin/diagnostico">
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir DB Doctor / Diagnóstico
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminSectionWrapper>
  );
}
