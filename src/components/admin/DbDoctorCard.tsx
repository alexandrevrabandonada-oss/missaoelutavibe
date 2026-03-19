import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Stethoscope,
  Play,
  Copy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Database,
  Table,
  Columns3,
  Shield,
  Code,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

interface CheckResult {
  key: string;
  category: "table" | "column" | "rls" | "rpc";
  status: "ok" | "warning" | "missing";
  detail: string;
  fix?: string;
}

interface DoctorResult {
  ok: boolean;
  ts: string;
  summary: { total: number; ok: number; warnings: number; missing: number };
  checks: CheckResult[];
  error?: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  ok: <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />,
  missing: <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />,
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  table: <Table className="h-3.5 w-3.5" />,
  column: <Columns3 className="h-3.5 w-3.5" />,
  rls: <Shield className="h-3.5 w-3.5" />,
  rpc: <Code className="h-3.5 w-3.5" />,
};

const CATEGORY_LABEL: Record<string, string> = {
  table: "Tabelas",
  column: "Colunas",
  rls: "RLS (Segurança)",
  rpc: "RPCs / Functions",
};

export function DbDoctorCard() {
  const [result, setResult] = useState<DoctorResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const runDoctor = async () => {
    setIsRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const resp = await supabase.functions.invoke("db-doctor", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (resp.error) throw resp.error;
      setResult(resp.data as DoctorResult);

      const d = resp.data as DoctorResult;
      if (d.ok) {
        toast.success(`DB Doctor: tudo OK! (${d.summary.total} checks)`);
      } else {
        toast.warning(`DB Doctor: ${d.summary.missing} ausentes, ${d.summary.warnings} alertas`);
      }

      // Expand categories with issues
      const cats = new Set<string>();
      for (const c of (d.checks || [])) {
        if (c.status !== "ok") cats.add(c.category);
      }
      setExpandedCategories(cats);
    } catch (err) {
      console.error("DB Doctor error:", err);
      toast.error("Erro ao executar DB Doctor");
    } finally {
      setIsRunning(false);
    }
  };

  const copyReport = () => {
    if (!result) return;
    const lines = [
      `=== DB Doctor Report ===`,
      `Timestamp: ${result.ts}`,
      `Status: ${result.ok ? "✅ OK" : "⚠️ ISSUES FOUND"}`,
      `Total: ${result.summary.total} | OK: ${result.summary.ok} | Warnings: ${result.summary.warnings} | Missing: ${result.summary.missing}`,
      ``,
    ];

    const categories = ["table", "column", "rls", "rpc"];
    for (const cat of categories) {
      const items = result.checks.filter((c) => c.category === cat);
      if (items.length === 0) continue;
      lines.push(`── ${CATEGORY_LABEL[cat]} ──`);
      for (const c of items) {
        const icon = c.status === "ok" ? "✅" : c.status === "warning" ? "⚠️" : "⛔";
        lines.push(`  ${icon} ${c.detail}`);
        if (c.fix) lines.push(`     💡 ${c.fix}`);
      }
      lines.push(``);
    }

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Relatório copiado!");
  };

  const copyJSON = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    toast.success("JSON copiado!");
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const categories = ["table", "column", "rls", "rpc"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">DB Doctor</CardTitle>
          </div>
          {result && (
            <Badge variant={result.ok ? "outline" : "destructive"} className={result.ok ? "border-green-500/50 text-green-500" : ""}>
              {result.ok ? "Saudável" : `${result.summary.missing + result.summary.warnings} problemas`}
            </Badge>
          )}
        </div>
        <CardDescription>
          Diagnóstico completo do banco de dados: tabelas, colunas, RLS e RPCs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={runDoctor} disabled={isRunning} size="sm">
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? "Analisando…" : "Rodar DB DIAG"}
          </Button>
          {result && (
            <>
              <Button variant="outline" size="sm" onClick={copyReport}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar relatório
              </Button>
              <Button variant="outline" size="sm" onClick={copyJSON}>
                <Database className="h-4 w-4 mr-2" />
                Copiar JSON
              </Button>
            </>
          )}
        </div>

        {/* Summary */}
        {result && (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-md border border-border p-2">
              <p className="text-lg font-bold">{result.summary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-md border border-green-500/30 p-2">
              <p className="text-lg font-bold text-green-500">{result.summary.ok}</p>
              <p className="text-xs text-muted-foreground">OK</p>
            </div>
            <div className="rounded-md border border-yellow-500/30 p-2">
              <p className="text-lg font-bold text-yellow-500">{result.summary.warnings}</p>
              <p className="text-xs text-muted-foreground">Alertas</p>
            </div>
            <div className="rounded-md border border-destructive/30 p-2">
              <p className="text-lg font-bold text-destructive">{result.summary.missing}</p>
              <p className="text-xs text-muted-foreground">Ausentes</p>
            </div>
          </div>
        )}

        {/* Checks by category */}
        {result && (
          <div className="space-y-2">
            {categories.map((cat) => {
              const items = result.checks.filter((c) => c.category === cat);
              if (items.length === 0) return null;

              const issues = items.filter((c) => c.status !== "ok");
              const isOpen = expandedCategories.has(cat);

              return (
                <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCategory(cat)}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {CATEGORY_ICON[cat]}
                      <span className="font-medium text-sm">{CATEGORY_LABEL[cat]}</span>
                      <Badge variant="outline" className="text-xs">
                        {items.length}
                      </Badge>
                      {issues.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {issues.length} problema{issues.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1">
                    <ul className="space-y-1 pl-2 max-h-64 overflow-y-auto">
                      {items.map((check) => (
                        <li key={check.key} className="space-y-1">
                          <div className="flex items-start gap-2 py-1">
                            {STATUS_ICON[check.status]}
                            <span className="text-sm text-muted-foreground flex-1">{check.detail}</span>
                          </div>
                          {check.fix && (
                            <div className="ml-6 rounded-md bg-muted/50 border border-border p-2 flex items-start gap-2">
                              <Lightbulb className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-foreground">Correção sugerida:</p>
                                <p className="text-xs text-muted-foreground">{check.fix}</p>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        {result && (
          <p className="text-xs text-muted-foreground text-right">
            Última análise: {new Date(result.ts).toLocaleString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
