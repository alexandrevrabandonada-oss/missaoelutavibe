import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Fingerprint, Globe, Database, Users, Mail, MapPin, Loader2, Search, FlaskConical } from "lucide-react";

interface RecentCounts {
  volunteers: number;
  convites: number;
  allocations: number;
}

interface InviteTestResult {
  ok: boolean;
  reason: string;
  code: string;
  channel: string | null;
  campaign_tag: string | null;
}

interface SchemaProbeResult {
  success: boolean;
  error?: string;
  keys?: string[];
  sample?: Record<string, unknown>;
}

function maskProjectRef(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const parts = host.split(".");
    if (parts.length >= 3) {
      const ref = parts[0];
      const masked = ref.slice(0, 4) + "••••" + ref.slice(-4);
      return masked + "." + parts.slice(1).join(".");
    }
    return host;
  } catch {
    return "(inválido)";
  }
}

function detectEnv(): string {
  const host = window.location.host;
  if (host.includes("preview")) return "preview";
  if (host.includes("localhost") || host.includes("127.0.0.1")) return "local";
  return "prod";
}

export function EnvironmentFingerprintCard() {
  const [counts, setCounts] = useState<RecentCounts | null>(null);
  const [loading, setLoading] = useState(true);

  // Invite test state
  const [testCode, setTestCode] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<InviteTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Schema probe state
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<SchemaProbeResult | null>(null);

  const host = window.location.host;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const maskedRef = maskProjectRef(supabaseUrl);
  const appEnv = detectEnv();
  const currentSearch = window.location.search;

  useEffect(() => {
    async function fetch2hCounts() {
      setLoading(true);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const [volRes, convRes, allocRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", twoHoursAgo),
        supabase
          .from("convites")
          .select("id", { count: "exact", head: true })
          .gte("criado_em", twoHoursAgo),
        supabase
          .from("cell_assignment_requests")
          .select("id", { count: "exact", head: true })
          .gte("created_at", twoHoursAgo),
      ]);

      setCounts({
        volunteers: volRes.count ?? 0,
        convites: convRes.count ?? 0,
        allocations: allocRes.count ?? 0,
      });
      setLoading(false);
    }

    fetch2hCounts();
  }, []);

  const handleTestInvite = async () => {
    const code = testCode.trim().toUpperCase();
    if (!code) return;
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    try {
      const { data, error } = await (supabase.rpc as any)("public_validate_invite", {
        p_code: code,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setTestResult(row as InviteTestResult);
    } catch (err: any) {
      setTestError(err.message || "Erro ao chamar RPC");
    } finally {
      setTestLoading(false);
    }
  };

  const handleSchemaProbe = async () => {
    setProbeLoading(true);
    setProbeResult(null);
    try {
      const { data, error } = await (supabase as any)
        .from("invites")
        .select("*")
        .limit(1);

      if (error) {
        setProbeResult({
          success: false,
          error: error.message || "Erro desconhecido",
        });
      } else if (!data || data.length === 0) {
        setProbeResult({
          success: true,
          keys: [],
          sample: undefined,
        });
      } else {
        const row = data[0];
        const keys = Object.keys(row);
        const safe: Record<string, unknown> = {};
        if ("code" in row) safe.code = row.code;
        if ("is_active" in row) safe.is_active = row.is_active;
        if ("active" in row) safe.active = row.active;
        if ("expires_at" in row) safe.expires_at = row.expires_at;
        if ("expires_on" in row) safe.expires_on = row.expires_on;
        setProbeResult({ success: true, keys, sample: safe });
      }
    } catch (err: any) {
      setProbeResult({
        success: false,
        error: err.message || "Erro desconhecido",
      });
    } finally {
      setProbeLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Fingerprint className="h-5 w-5 text-primary" />
          Fingerprint do Ambiente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Host:</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">{host}</code>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">DB:</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">{maskedRef}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">ENV:</span>
            <Badge variant={appEnv === "prod" ? "default" : "secondary"}>
              {appEnv}
            </Badge>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2">Criados nas últimas 2h:</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">Voluntários</span>
                </div>
                <p className="text-lg font-bold">{counts?.volunteers ?? 0}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="text-xs">Convites</span>
                </div>
                <p className="text-lg font-bold">{counts?.convites ?? 0}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-xs">Alocações</span>
                </div>
                <p className="text-lg font-bold">{counts?.allocations ?? 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* Debug de Convite / Banco */}
        <div className="border-t border-border pt-3 space-y-4">
          <p className="text-sm font-semibold">Debug de Convite / Banco</p>

          <div className="text-xs">
            <span className="text-muted-foreground">Parâmetro ref recebido: </span>
            <code className="bg-muted px-1.5 py-0.5 rounded">
              {currentSearch || "(nenhum)"}
            </code>
          </div>

          {/* Testar Convite */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Testar Convite (RPC)</p>
            <div className="flex gap-2">
              <Input
                placeholder="Código do convite"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                className="h-8 text-sm bg-muted"
                onKeyDown={(e) => e.key === "Enter" && handleTestInvite()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestInvite}
                disabled={testLoading || !testCode.trim()}
                className="shrink-0"
              >
                {testLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                Testar
              </Button>
            </div>
            {testError && (
              <p className="text-xs text-destructive">Erro: {testError}</p>
            )}
            {testResult && (
              <div className="bg-muted rounded p-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={testResult.ok
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                    }
                  >
                    {testResult.ok ? "OK" : "INVÁLIDO"}
                  </Badge>
                  <span className="text-muted-foreground">reason: <strong>{testResult.reason}</strong></span>
                </div>
                <p>code: <code>{testResult.code}</code></p>
                {testResult.channel && <p>channel: {testResult.channel}</p>}
                {testResult.campaign_tag && <p>campaign_tag: #{testResult.campaign_tag}</p>}
              </div>
            )}
          </div>

          {/* Redirect Simulation */}
          {testResult && (
            <div className="bg-muted/50 rounded p-2 text-xs space-y-1 border border-border/50">
              <p className="font-medium text-muted-foreground">Simulação de redirecionamento:</p>
              {testResult.ok ? (
                <>
                  <p>
                    URL destino:{" "}
                    <code className="bg-background/50 px-1 py-0.5 rounded">
                      /auth?ref={testCode.trim().toUpperCase()}&next=%2Fvoluntario&mode=signup
                    </code>
                  </p>
                  <p className="text-primary">→ Abrirá em modo <strong>CRIAR CONTA</strong> (convite válido)</p>
                </>
              ) : (
                <>
                  <p>
                    URL destino:{" "}
                    <code className="bg-background/50 px-1 py-0.5 rounded">
                      /auth?ref={testCode.trim().toUpperCase()}&next=%2Fvoluntario
                    </code>
                  </p>
                  <p className="text-amber-600">→ Abrirá em modo <strong>LOGIN</strong> (convite inválido: {testResult.reason}). Signup bloqueado com CTA WhatsApp.</p>
                </>
              )}
            </div>
          )}

          {/* Schema Probe */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Probe de Schema</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSchemaProbe}
              disabled={probeLoading}
            >
              {probeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FlaskConical className="h-3.5 w-3.5 mr-1" />}
              Provar tabela de convites
            </Button>
            {probeResult && (
              <div className="bg-muted rounded p-2 text-xs space-y-1">
                {probeResult.success ? (
                  <>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Tabela acessível
                    </Badge>
                    {probeResult.keys && probeResult.keys.length > 0 ? (
                      <>
                        <p className="text-muted-foreground">Campos detectados:</p>
                        <code className="block bg-background/50 p-1 rounded break-all">
                          {probeResult.keys.join(", ")}
                        </code>
                        {probeResult.sample && Object.keys(probeResult.sample).length > 0 && (
                          <>
                            <p className="text-muted-foreground mt-1">Valores (amostra segura):</p>
                            <code className="block bg-background/50 p-1 rounded break-all whitespace-pre-wrap">
                              {JSON.stringify(probeResult.sample, null, 2)}
                            </code>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">Tabela existe mas está vazia.</p>
                    )}
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                      Tabela inacessível
                    </Badge>
                    <p className="text-muted-foreground">{probeResult.error}</p>
                    <p className="text-muted-foreground italic">
                      Tabela "invites" inacessível via RLS (esperado para anon).
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}