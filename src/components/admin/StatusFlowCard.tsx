import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StatusCounts {
  pendente: number;
  ativo: number;
  recusado: number;
}

function detectEnv(): string {
  const host = window.location.host;
  if (host.includes("preview")) return "preview";
  if (host.includes("localhost") || host.includes("127.0.0.1")) return "local";
  return "prod";
}

export function StatusFlowCard() {
  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const appEnv = detectEnv();
  const canSimulate = appEnv !== "prod";

  const fetchCounts = async () => {
    setLoading(true);
    const [pendRes, ativoRes, recRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("volunteer_status", "pendente"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("volunteer_status", "ativo"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("volunteer_status", "recusado"),
    ]);
    setCounts({
      pendente: pendRes.count ?? 0,
      ativo: ativoRes.count ?? 0,
      recusado: recRes.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const handleSimulateApproval = async () => {
    setSimulating(true);
    try {
      // Get first pending volunteer
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("volunteer_status", "pendente")
        .limit(1)
        .single();

      if (error || !data) {
        toast.info("Nenhum voluntário pendente encontrado para simular.");
        return;
      }

      const { error: rpcError } = await supabase.rpc("approve_volunteer", {
        _user_id: data.id,
        _cell_id: null,
      });

      if (rpcError) throw rpcError;

      toast.success(`Voluntário "${data.full_name || data.id.slice(0, 8)}" aprovado com sucesso!`);
      fetchCounts();
    } catch (err: any) {
      toast.error(`Erro ao simular: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Status Flow — Voluntários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Pendentes</span>
              </div>
              <p className="text-lg font-bold">{counts?.pendente ?? 0}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-xs">Ativos</span>
              </div>
              <p className="text-lg font-bold">{counts?.ativo ?? 0}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <XCircle className="h-3.5 w-3.5" />
                <span className="text-xs">Recusados</span>
              </div>
              <p className="text-lg font-bold">{counts?.recusado ?? 0}</p>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold">Simular Aprovação</p>
          {canSimulate ? (
            <>
              <p className="text-xs text-muted-foreground">
                Aprova o primeiro voluntário pendente da fila (apenas em ambientes de teste).
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSimulateApproval}
                disabled={simulating || (counts?.pendente ?? 0) === 0}
              >
                {simulating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                )}
                Simular aprovação
              </Button>
            </>
          ) : (
            <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground space-y-1">
              <p>
                <Badge variant="outline" className="text-[10px]">PRODUÇÃO</Badge>{" "}
                Simulação desabilitada em produção.
              </p>
              <p>
                Para testar: acesse <code>/coordenador/hoje</code> → "Pendências" → Aprovar manualmente.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
