/**
 * WeekHeadlineCard - "Manchete da Semana" block.
 *
 * Shows the active cycle's narrative headline + collective goal counter.
 * Coordinators can inline-edit the headline and goal.
 * Uses metas_json from ciclos_semanais (no new tables).
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Pencil, Check, X } from "lucide-react";
import { useCiclos, type Ciclo } from "@/hooks/useCiclos";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeadlineMeta {
  headline?: string;
  meta_label?: string;
  meta_target?: number;
}

function parseHeadlineMeta(ciclo: Ciclo | null | undefined): HeadlineMeta {
  if (!ciclo) return {};
  const raw = ciclo.metas_json as any;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return {
      headline: raw.headline || undefined,
      meta_label: raw.meta_label || undefined,
      meta_target: typeof raw.meta_target === "number" ? raw.meta_target : undefined,
    };
  }
  return {};
}

interface WeekHeadlineCardProps {
  editable?: boolean;
}

export function WeekHeadlineCard({ editable = false }: WeekHeadlineCardProps) {
  const { activeCycle, isLoadingActive } = useCiclos();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const meta = parseHeadlineMeta(activeCycle);

  const [editHeadline, setEditHeadline] = useState(meta.headline || "");
  const [editLabel, setEditLabel] = useState(meta.meta_label || "");
  const [editTarget, setEditTarget] = useState(meta.meta_target?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  // Count completed missions in this cycle's date range
  const { data: completedCount = 0 } = useQuery({
    queryKey: ["week-headline-count", activeCycle?.id],
    queryFn: async () => {
      if (!activeCycle) return 0;
      const { count, error } = await supabase
        .from("missions")
        .select("id", { count: "exact", head: true })
        .in("status", ["concluida", "enviada", "validada"])
        .gte("updated_at", activeCycle.inicio)
        .lte("updated_at", activeCycle.fim);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeCycle?.id,
    staleTime: 60_000,
  });

  if (isLoadingActive || !activeCycle) return null;

  const headline = meta.headline || activeCycle.titulo;
  const label = meta.meta_label || "ações concluídas";
  const target = meta.meta_target || 0;

  const handleStartEdit = () => {
    setEditHeadline(meta.headline || activeCycle.titulo);
    setEditLabel(meta.meta_label || "ações concluídas");
    setEditTarget((meta.meta_target || 30).toString());
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newMeta: HeadlineMeta = {
        headline: editHeadline.trim(),
        meta_label: editLabel.trim(),
        meta_target: parseInt(editTarget) || 0,
      };
      const { error } = await (supabase.from as any)("ciclos_semanais")
        .update({ metas_json: newMeta })
        .eq("id", activeCycle.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["active-cycle"] });
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
      toast.success("Manchete atualizada!");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Editar Manchete</span>
          </div>
          <Input
            placeholder="Ex: Semana da Escuta"
            value={editHeadline}
            onChange={(e) => setEditHeadline(e.target.value)}
            className="font-bold"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Ex: conversas curtas"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Meta"
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              className="w-20"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="h-4 w-4 mr-1" />
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <Megaphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-base leading-tight">{headline}</h3>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  variant="secondary"
                  className="text-sm font-bold tabular-nums"
                >
                  {completedCount}{target > 0 ? ` / ${target}` : ""}
                </Badge>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            </div>
          </div>
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleStartEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
