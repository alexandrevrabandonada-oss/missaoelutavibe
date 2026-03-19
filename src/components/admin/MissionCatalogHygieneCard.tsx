import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, RefreshCw, Package, Archive, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const CANONICAL_SLUGS = [
  "celula-checkin-semanal-2min",
  "convite-1-pessoa-para-sua-celula",
  "playbook-1-acao-rodar-agora",
  "mural-1-relato-1-pergunta",
  "trio-15min-acao-da-semana",
  "debate-1-comentario-modelo-3-linhas",
  "beta-1-bug-1-atricao-1-ideia",
];

interface CatalogStats {
  ok: boolean;
  total_missions: number;
  canonical_count: number;
  canonical_slugs: string[];
  missing_canonical_slugs: string[];
  duplicates_top: Array<{ norm_title: string; cnt: number; slugs: string[] }>;
  newest_10: Array<{ slug: string; title: string; created_at: string; archived?: boolean }>;
  archived_count?: number;
  ts: string;
  error?: string;
}

interface MarkResult {
  ok: boolean;
  marked: number;
  found_slugs: string[];
  missing_slugs: string[];
  error?: string;
}

export function MissionCatalogHygieneCard() {
  const [showNewest, setShowNewest] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["mission-catalog-stats"],
    queryFn: async (): Promise<CatalogStats> => {
      const { data, error } = await (supabase.rpc as any)("get_mission_catalog_stats");
      if (error) throw error;
      // Count archived missions
      const { count } = await supabase
        .from("missions")
        .select("id", { count: "exact", head: true })
        .filter("meta_json->archived", "eq", "true");
      return { ...data, archived_count: count ?? 0 } as CatalogStats;
    },
    staleTime: 5 * 60 * 1000,
  });

  const markMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)("mark_canonical_missions", {
        p_slugs: CANONICAL_SLUGS,
      });
      if (error) throw error;
      return data as MarkResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mission-catalog-stats"] });
      if (result.ok) {
        toast.success(`${result.marked} missões marcadas como canônicas`);
      } else {
        toast.warning(`${result.marked} marcadas, ${result.missing_slugs.length} não encontradas: ${result.missing_slugs.join(", ")}`);
      }
    },
    onError: () => toast.error("Erro ao marcar missões canônicas"),
  });

  // Archive duplicates + auto-reapply canonical
  const archiveDuplicatesMutation = useMutation({
    mutationFn: async () => {
      if (!stats?.duplicates_top?.length) throw new Error("Sem duplicatas");
      let archivedCount = 0;
      for (const group of stats.duplicates_top) {
        if (group.slugs.length < 2) continue;
        const { data: groupMissions, error } = await supabase
          .from("missions")
          .select("id, slug, meta_json, created_at")
          .in("slug", group.slugs);
        if (error) throw error;
        if (!groupMissions || groupMissions.length < 2) continue;
        // Pick the best: prefer canonical=true, then most recent
        const sorted = [...groupMissions].sort((a, b) => {
          const aMeta = a.meta_json as { canonical?: boolean } | null;
          const bMeta = b.meta_json as { canonical?: boolean } | null;
          if (aMeta?.canonical && !bMeta?.canonical) return -1;
          if (!aMeta?.canonical && bMeta?.canonical) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        const archiveIds = sorted.slice(1).map(m => m.id);
        for (const id of archiveIds) {
          const mission = groupMissions.find(m => m.id === id);
          const existingMeta = (mission?.meta_json as Record<string, unknown>) || {};
          const { error: updateErr } = await supabase
            .from("missions")
            .update({ meta_json: { ...existingMeta, archived: true, canonical: false } as any })
            .eq("id", id);
          if (updateErr) throw updateErr;
          archivedCount++;
        }
      }
      return archivedCount;
    },
    onSuccess: async (count) => {
      // Auto-reapply canonical after archiving
      try {
        await markMutation.mutateAsync();
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["mission-catalog-stats"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      toast.success(`${count} duplicata(s) arquivada(s) + canônicas reaplicadas`);
    },
    onError: (e) => toast.error(`Erro ao arquivar: ${(e as Error).message}`),
  });

  // Delete duplicates (secondary, behind confirm)
  const deleteDuplicatesMutation = useMutation({
    mutationFn: async () => {
      if (!stats?.duplicates_top?.length) throw new Error("Sem duplicatas");
      let deletedCount = 0;
      for (const group of stats.duplicates_top) {
        if (group.slugs.length < 2) continue;
        const { data: groupMissions, error } = await supabase
          .from("missions")
          .select("id, slug, meta_json, created_at")
          .in("slug", group.slugs);
        if (error) throw error;
        if (!groupMissions || groupMissions.length < 2) continue;
        const sorted = [...groupMissions].sort((a, b) => {
          const aMeta = a.meta_json as { canonical?: boolean } | null;
          const bMeta = b.meta_json as { canonical?: boolean } | null;
          if (aMeta?.canonical && !bMeta?.canonical) return -1;
          if (!aMeta?.canonical && bMeta?.canonical) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        const deleteIds = sorted.slice(1).map(m => m.id);
        const { error: delErr } = await supabase
          .from("missions")
          .delete()
          .in("id", deleteIds);
        if (delErr) throw delErr;
        deletedCount += deleteIds.length;
      }
      return deletedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["mission-catalog-stats"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      toast.success(`${count} missão(ões) duplicada(s) deletada(s)`);
    },
    onError: (e) => toast.error(`Erro ao deletar: ${(e as Error).message}`),
  });

  const warnings: string[] = [];
  if (stats && !stats.error) {
    if (stats.canonical_count < 5) warnings.push(`Apenas ${stats.canonical_count} canônicas (mínimo: 5)`);
    if (stats.missing_canonical_slugs.length > 0) warnings.push(`${stats.missing_canonical_slugs.length} slug(s) canônico(s) sem marcação`);
    if (stats.duplicates_top.length > 0) warnings.push(`${stats.duplicates_top.length} possível(is) duplicata(s) detectada(s)`);
  }

  const statusBadge = stats?.error
    ? <Badge variant="destructive">Erro</Badge>
    : warnings.length === 0
      ? <Badge className="bg-green-600 text-white">OK</Badge>
      : <Badge variant="outline" className="border-yellow-500 text-yellow-600">{warnings.length} aviso(s)</Badge>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Catálogo de Missões (Higiene)</CardTitle>
          </div>
          {statusBadge}
        </div>
        <CardDescription>Curadoria do conjunto canônico Beta e detecção de duplicatas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : stats?.error ? (
          <p className="text-sm text-destructive">Erro ao carregar stats: {stats.error}</p>
        ) : stats ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.total_missions}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{stats.canonical_count}</p>
                <p className="text-xs text-muted-foreground">Canônicas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.duplicates_top.length}</p>
                <p className="text-xs text-muted-foreground">Duplicatas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-muted-foreground">{stats.archived_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Arquivadas</p>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-yellow-600">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Missing slugs */}
            {stats.missing_canonical_slugs.length > 0 && (
              <div className="text-xs space-y-1">
                <p className="font-medium text-muted-foreground">Slugs canônicos sem marcação:</p>
                {stats.missing_canonical_slugs.map(s => (
                  <code key={s} className="block text-destructive bg-muted px-2 py-1 rounded">{s}</code>
                ))}
              </div>
            )}

            {/* Duplicates */}
            {stats.duplicates_top.length > 0 && (
              <div className="text-xs space-y-1">
                <p className="font-medium text-muted-foreground">Possíveis duplicatas:</p>
                {stats.duplicates_top.map((d, i) => (
                  <div key={i} className="bg-muted px-2 py-1 rounded">
                    <span className="font-mono">"{d.norm_title}"</span>
                    <span className="text-muted-foreground"> — {d.cnt}x: {d.slugs.join(", ")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Newest 10 with archived toggle */}
            <Collapsible open={showNewest} onOpenChange={setShowNewest}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  {showNewest ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  10 missões mais recentes
                </CollapsibleTrigger>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showArchived ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showArchived ? "Ocultar arquivadas" : "Mostrar arquivadas"}
                </button>
              </div>
              <CollapsibleContent className="mt-2 space-y-1">
                {stats.newest_10
                  .filter(m => showArchived || !m.archived)
                  .map((m, i) => (
                  <div key={i} className={`text-xs bg-muted px-2 py-1 rounded flex justify-between ${m.archived ? "opacity-50" : ""}`}>
                    <span className="truncate">
                      {m.archived && <span className="text-muted-foreground mr-1">[arquivada]</span>}
                      {m.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Actions — Arquivar is PRIMARY, delete is secondary */}
            <div className="flex flex-wrap gap-2 pt-2">
              {stats.duplicates_top.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => archiveDuplicatesMutation.mutate()}
                  disabled={archiveDuplicatesMutation.isPending}
                >
                  <Archive className={`h-4 w-4 mr-2 ${archiveDuplicatesMutation.isPending ? "animate-spin" : ""}`} />
                  Arquivar duplicatas + reaplicar canônicas
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => markMutation.mutate()}
                disabled={markMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${markMutation.isPending ? "animate-spin" : ""}`} />
                Reaplicar canônicas
              </Button>

              {stats.duplicates_top.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Deletar permanentemente as missões duplicadas? Esta ação não pode ser desfeita.")) {
                      deleteDuplicatesMutation.mutate();
                    }
                  }}
                  disabled={deleteDuplicatesMutation.isPending}
                >
                  <Trash2 className={`h-4 w-4 mr-2 ${deleteDuplicatesMutation.isPending ? "animate-spin" : ""}`} />
                  Deletar duplicatas
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Atualizar
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
