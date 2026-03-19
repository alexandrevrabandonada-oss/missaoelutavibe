import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  ArrowLeft,
  Rocket,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Save,
  BookOpen,
  Target,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

// ── Types ──
interface CanonicalMission {
  id: string;
  slug: string;
  title: string;
  porque_importa: string | null;
  como_fazer: string[] | null;
  como_provar: string | null;
  share_message: string | null;
  points: number | null;
  meta_json: Record<string, unknown> | null;
}

interface CanonicalMaterial {
  id: string;
  title: string;
  description: string | null;
  legenda_whatsapp: string | null;
  legenda_instagram: string | null;
  hook: string | null;
  cta: string | null;
  tags: string[] | null;
}

// ── Required fields for validation ──
const MISSION_REQUIRED: (keyof CanonicalMission)[] = ["porque_importa", "como_fazer", "share_message", "como_provar"];
const MATERIAL_REQUIRED: (keyof CanonicalMaterial)[] = ["description", "legenda_whatsapp"];

function getMissionWarnings(m: CanonicalMission): string[] {
  const w: string[] = [];
  if (!m.porque_importa?.trim()) w.push("porque_importa vazio");
  if (!m.como_fazer || m.como_fazer.length === 0 || m.como_fazer.every(s => !s.trim())) w.push("como_fazer vazio");
  if (!m.share_message?.trim()) w.push("share_message vazio");
  if (!m.como_provar?.trim()) w.push("como_provar vazio");
  return w;
}

function getMaterialWarnings(m: CanonicalMaterial): string[] {
  const w: string[] = [];
  if (!m.description?.trim()) w.push("description vazio");
  if (!m.legenda_whatsapp?.trim()) w.push("legenda_whatsapp vazio");
  return w;
}

// ── Main Component ──
export default function AdminPilotPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoading: rolesLoading, isCoordinator } = useUserRoles();

  // ── Fetch canonical missions ──
  const { data: missions, isLoading: missionsLoading } = useQuery({
    queryKey: ["pilot-panel-missions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("id, slug, title, porque_importa, como_fazer, como_provar, share_message, points, meta_json")
        .eq("status", "publicada")
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Filter canonical in JS since meta_json is JSONB
      return (data as CanonicalMission[]).filter(m => {
        const meta = m.meta_json as Record<string, unknown> | null;
        return meta?.canonical === true;
      }).sort((a, b) => {
        const ra = (a.meta_json as any)?.canonical_rank ?? 99;
        const rb = (b.meta_json as any)?.canonical_rank ?? 99;
        return ra - rb;
      });
    },
  });

  // ── Fetch canonical materials ──
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ["pilot-panel-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("id, title, description, legenda_whatsapp, legenda_instagram, hook, cta, tags")
        .eq("status", "PUBLISHED")
        .contains("tags", ["canonical"]);
      if (error) throw error;
      return data as CanonicalMaterial[];
    },
  });

  // ── Local edit state ──
  const [missionEdits, setMissionEdits] = useState<Record<string, Partial<CanonicalMission>>>({});
  const [materialEdits, setMaterialEdits] = useState<Record<string, Partial<CanonicalMaterial>>>({});
  const [openMissions, setOpenMissions] = useState<Set<string>>(new Set());
  const [openMaterials, setOpenMaterials] = useState<Set<string>>(new Set());

  const getMissionValue = (m: CanonicalMission, field: keyof CanonicalMission) => {
    return missionEdits[m.id]?.[field] ?? m[field];
  };

  const getMaterialValue = (m: CanonicalMaterial, field: keyof CanonicalMaterial) => {
    return materialEdits[m.id]?.[field] ?? m[field];
  };

  const updateMissionField = (id: string, field: string, value: unknown) => {
    setMissionEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const updateMaterialField = (id: string, field: string, value: unknown) => {
    setMaterialEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const toggleMission = (id: string) => {
    setOpenMissions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleMaterial = (id: string) => {
    setOpenMaterials(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Validation ──
  const allWarnings = useMemo(() => {
    const w: string[] = [];
    (missions ?? []).forEach(m => {
      const merged = { ...m, ...missionEdits[m.id] } as CanonicalMission;
      const mw = getMissionWarnings(merged);
      if (mw.length) w.push(`Missão "${m.title}": ${mw.join(", ")}`);
    });
    (materials ?? []).forEach(m => {
      const merged = { ...m, ...materialEdits[m.id] } as CanonicalMaterial;
      const mw = getMaterialWarnings(merged);
      if (mw.length) w.push(`Material "${m.title}": ${mw.join(", ")}`);
    });
    return w;
  }, [missions, materials, missionEdits, materialEdits]);

  const hasEdits = Object.keys(missionEdits).length > 0 || Object.keys(materialEdits).length > 0;
  const canPublish = hasEdits && allWarnings.length === 0;

  // ── Publish mutation ──
  const publishMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<unknown>[] = [];

      // Update missions
      for (const [id, edits] of Object.entries(missionEdits)) {
        const original = missions?.find(m => m.id === id);
        if (!original) continue;

        const updatePayload: Record<string, unknown> = {};
        if (edits.porque_importa !== undefined) updatePayload.porque_importa = edits.porque_importa;
        if (edits.como_fazer !== undefined) updatePayload.como_fazer = edits.como_fazer;
        if (edits.como_provar !== undefined) updatePayload.como_provar = edits.como_provar;
        if (edits.share_message !== undefined) updatePayload.share_message = edits.share_message;

        if (Object.keys(updatePayload).length > 0) {
          // Ensure canonical stays true in meta_json
          const currentMeta = (original.meta_json ?? {}) as Record<string, unknown>;
          updatePayload.meta_json = { ...currentMeta, canonical: true } as unknown as Json;

          promises.push(
            supabase.from("missions").update(updatePayload).eq("id", id).then(({ error }) => {
              if (error) throw error;
            }) as unknown as Promise<unknown>
          );
        }
      }

      // Update materials
      for (const [id, edits] of Object.entries(materialEdits)) {
        const updatePayload: Record<string, unknown> = {};
        if (edits.description !== undefined) updatePayload.description = edits.description;
        if (edits.legenda_whatsapp !== undefined) updatePayload.legenda_whatsapp = edits.legenda_whatsapp;
        if (edits.legenda_instagram !== undefined) updatePayload.legenda_instagram = edits.legenda_instagram;
        if (edits.hook !== undefined) updatePayload.hook = edits.hook;
        if (edits.cta !== undefined) updatePayload.cta = edits.cta;

        if (Object.keys(updatePayload).length > 0) {
          promises.push(
            supabase.from("content_items").update(updatePayload).eq("id", id).then(({ error }) => {
              if (error) throw error;
            }) as unknown as Promise<unknown>
          );
        }
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      setMissionEdits({});
      setMaterialEdits({});
      queryClient.invalidateQueries({ queryKey: ["pilot-panel-missions"] });
      queryClient.invalidateQueries({ queryKey: ["pilot-panel-materials"] });
      toast.success("Conjunto canônico publicado com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao publicar: ${err.message}`);
    },
  });

  // ── Loading ──
  if (rolesLoading || missionsLoading || materialsLoading) return <FullPageLoader />;
  if (!isCoordinator) {
    navigate("/admin");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/semana")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <div className="w-10" />
      </div>

      <div className="flex-1 space-y-6 animate-slide-up max-w-2xl mx-auto w-full">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Rocket className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Painel do Piloto</span>
          </div>
          <h1 className="text-2xl font-bold">Conjunto Canônico</h1>
          <p className="text-muted-foreground text-sm">
            Edite as {missions?.length ?? 0} missões e {materials?.length ?? 0} materiais do piloto
          </p>
        </div>

        {/* Warnings banner */}
        {allWarnings.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-3 space-y-1">
              <div className="flex items-center gap-2 text-yellow-600 font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                {allWarnings.length} campo(s) incompleto(s) — publicação bloqueada
              </div>
              {allWarnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-6">• {w}</p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── MISSIONS ── */}
        <section>
          <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Missões Canônicas ({missions?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {(missions ?? []).map((m, idx) => {
              const merged = { ...m, ...missionEdits[m.id] } as CanonicalMission;
              const warnings = getMissionWarnings(merged);
              const isOpen = openMissions.has(m.id);

              return (
                <Card key={m.id} className={warnings.length ? "border-yellow-500/40" : ""}>
                  <button
                    onClick={() => toggleMission(m.id)}
                    className="w-full text-left p-4 flex items-center gap-3"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">#{idx + 1}</Badge>
                        <span className="font-medium text-sm truncate">{m.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">{m.slug}</p>
                    </div>
                    {warnings.length > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <CardContent className="pt-0 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Por que importa</label>
                        <Textarea
                          value={(getMissionValue(m, "porque_importa") as string) || ""}
                          onChange={e => updateMissionField(m.id, "porque_importa", e.target.value)}
                          placeholder="Explicação do impacto desta missão..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Como fazer (bullets, um por linha)</label>
                        <Textarea
                          value={((getMissionValue(m, "como_fazer") as string[]) || []).join("\n")}
                          onChange={e => updateMissionField(m.id, "como_fazer", e.target.value.split("\n").filter(Boolean))}
                          placeholder="Passo 1&#10;Passo 2&#10;Passo 3"
                          className="mt-1 font-mono text-xs"
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Como provar (evidência)</label>
                        <Input
                          value={(getMissionValue(m, "como_provar") as string) || ""}
                          onChange={e => updateMissionField(m.id, "como_provar", e.target.value)}
                          placeholder="Print da conversa, foto do registro..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Mensagem de compartilhamento</label>
                        <Textarea
                          value={(getMissionValue(m, "share_message") as string) || ""}
                          onChange={e => updateMissionField(m.id, "share_message", e.target.value)}
                          placeholder="Texto pronto para WhatsApp..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── MATERIALS ── */}
        <section>
          <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Materiais Canônicos ({materials?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {(materials ?? []).map((m, idx) => {
              const merged = { ...m, ...materialEdits[m.id] } as CanonicalMaterial;
              const warnings = getMaterialWarnings(merged);
              const isOpen = openMaterials.has(m.id);

              return (
                <Card key={m.id} className={warnings.length ? "border-yellow-500/40" : ""}>
                  <button
                    onClick={() => toggleMaterial(m.id)}
                    className="w-full text-left p-4 flex items-center gap-3"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">#{idx + 1}</Badge>
                        <span className="font-medium text-sm truncate">{m.title}</span>
                      </div>
                      {m.tags && (
                        <p className="text-xs text-muted-foreground truncate">
                          {m.tags.filter(t => t !== "canonical").join(", ")}
                        </p>
                      )}
                    </div>
                    {warnings.length > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <CardContent className="pt-0 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Texto (description)</label>
                        <Textarea
                          value={(getMaterialValue(m, "description") as string) || ""}
                          onChange={e => updateMaterialField(m.id, "description", e.target.value)}
                          placeholder="Corpo do material..."
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Legenda WhatsApp</label>
                        <Textarea
                          value={(getMaterialValue(m, "legenda_whatsapp") as string) || ""}
                          onChange={e => updateMaterialField(m.id, "legenda_whatsapp", e.target.value)}
                          placeholder="Texto pronto para WhatsApp..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Legenda Instagram</label>
                        <Textarea
                          value={(getMaterialValue(m, "legenda_instagram") as string) || ""}
                          onChange={e => updateMaterialField(m.id, "legenda_instagram", e.target.value)}
                          placeholder="Legenda para Instagram..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Hook</label>
                          <Input
                            value={(getMaterialValue(m, "hook") as string) || ""}
                            onChange={e => updateMaterialField(m.id, "hook", e.target.value)}
                            placeholder="Frase de atenção"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">CTA</label>
                          <Input
                            value={(getMaterialValue(m, "cta") as string) || ""}
                            onChange={e => updateMaterialField(m.id, "cta", e.target.value)}
                            placeholder="Call to action"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── Publish bar ── */}
        <div className="sticky bottom-4 z-10">
          <Card className="shadow-lg">
            <CardContent className="py-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                {!hasEdits ? (
                  <span className="text-muted-foreground">Nenhuma alteração</span>
                ) : allWarnings.length > 0 ? (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {allWarnings.length} campo(s) incompleto(s)
                  </span>
                ) : (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Pronto para publicar
                  </span>
                )}
              </div>
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={!canPublish || publishMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {publishMutation.isPending ? "Salvando..." : "Publicar conjunto canônico"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
