import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCiclos } from "@/hooks/useCiclos";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  Factory, 
  FileJson, 
  Plus, 
  Check, 
  AlertTriangle, 
  X,
  Upload,
  Eye,
  Save,
  TestTube,
  Copy,
  Info,
  ArrowRight,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import {
  VALID_MISSION_TYPES,
  normalizeMissionType,
  extractMissionType,
  generateTemplatePack,
  type MissionType as NormMissionType,
  type NormalizationResult,
} from "@/lib/missionTypeNormalizer";

type MissionType = Database["public"]["Enums"]["mission_type"];

const MISSION_TYPES: { value: MissionType; label: string }[] = [
  { value: "escuta", label: "Escuta" },
  { value: "rua", label: "Rua" },
  { value: "mobilizacao", label: "Mobilização" },
  { value: "conteudo", label: "Conteúdo" },
  { value: "dados", label: "Dados" },
  { value: "formacao", label: "Formação" },
  { value: "conversa", label: "Conversa" },
];

interface SingleMissionForm {
  type: MissionType;
  title: string;
  description: string;
  tags: string;
  estimated_min: number;
  status: "rascunho" | "publicada";
  assigned_to: string;
  ciclo_id: string;
  meta_json: string;
}

interface ImportError {
  index: number;
  reason: string;
  sqlstate?: string;
  detail?: string;
  hint?: string;
  context?: string;
  item?: unknown;
}

interface ImportResult {
  ok: boolean;
  created: { id: string; type: string; title: string }[];
  errors: ImportError[];
  total_processed: number;
  total_created: number;
  total_errors: number;
}

interface PreviewMission {
  type: string;
  title: string;
  tagsLabel: string;
  estimated_min: number;
  normalization: NormalizationResult;
  usedDefault: boolean;
  sourceField: string;
}

interface ParsedMission {
  type: string;
  title: string;
  description?: string;
  tags?: string[];
  status?: string;
  estimated_min?: number;
  meta?: Record<string, unknown>;
}

export default function MissionFactoryTab() {
  const { user } = useAuth();
  const { ciclos, activeCycle } = useCiclos();
  const { toast } = useToast();

  // Single mission form state
  const [form, setForm] = useState<SingleMissionForm>({
    type: "escuta",
    title: "",
    description: "",
    tags: "",
    estimated_min: 15,
    status: "rascunho",
    assigned_to: "all",
    ciclo_id: activeCycle?.id ?? "",
    meta_json: "{}",
  });
  const [isCreating, setIsCreating] = useState(false);

  // Import JSON state
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [packCanonical, setPackCanonical] = useState<Record<string, unknown> | null>(null);
  const [previewMissions, setPreviewMissions] = useState<PreviewMission[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [expandedErrorIndex, setExpandedErrorIndex] = useState<number | null>(null);

  // Handle single mission creation
  const handleCreateMission = async (publish: boolean) => {
    if (!user?.id || !form.title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }

    // Validate meta_json
    let metaObj = {};
    try {
      metaObj = JSON.parse(form.meta_json || "{}");
    } catch {
      toast({ title: "meta_json inválido", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const tagsArray = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase.from("missions").insert({
        type: form.type,
        title: form.title,
        description: form.description || null,
        status: publish ? "publicada" : form.status,
        created_by: user.id,
        ciclo_id: form.ciclo_id || null,
        points: 10,
        requires_validation: true,
        meta_json: {
          title: form.title,
          description: form.description,
          tags: tagsArray,
          estimated_min: form.estimated_min,
          assigned_to: form.assigned_to,
          _factory: {
            createdBy: user.id,
            createdAt: new Date().toISOString(),
            mode: publish ? "publish" : "draft",
          },
          ...metaObj,
        },
      });

      if (error) throw error;

      toast({ title: publish ? "Missão publicada!" : "Rascunho salvo!" });
      setForm({
        type: "escuta",
        title: "",
        description: "",
        tags: "",
        estimated_min: 15,
        status: "rascunho",
        assigned_to: "all",
        ciclo_id: activeCycle?.id ?? "",
        meta_json: "{}",
      });
    } catch (error) {
      console.error("Create mission error:", error);
      toast({ title: "Erro ao criar missão", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  // Sanitize JSON input (remove BOM, normalize line endings, trim)
  const sanitizeJsonInput = (raw: string): string => {
    return raw
      .replace(/\uFEFF/g, "")      // Remove BOM
      .replace(/\r\n/g, "\n")      // Normalize CRLF to LF
      .trim();
  };

  // Test pack for debugging
  const TEST_PACK = {
    pack: {
      id: "pack_test_ui",
      title: "TEST UI",
      defaults: { assigned_to: "all", status: "publicada", estimated_min: 10 }
    },
    missions: [
      {
        type: "escuta",
        title: "TESTE: Missão mínima",
        description: "Teste do importador.",
        tags: ["teste"],
        estimated_min: 10,
        meta: {}
      }
    ]
  };

  const handleLoadTestPack = () => {
    setJsonInput(JSON.stringify(TEST_PACK, null, 2));
    setJsonError(null);
    setPackCanonical(null);
    setPreviewMissions([]);
    setImportResult(null);
    toast({ title: "Pack de teste carregado" });
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(generateTemplatePack());
    toast({ title: "Template copiado para a área de transferência!" });
  };

  // Handle JSON validation - creates canonical pack with type normalization
  const handleValidateJson = () => {
    setJsonError(null);
    setPackCanonical(null);
    setPreviewMissions([]);
    setImportResult(null);
    setExpandedErrorIndex(null);

    if (!jsonInput.trim()) {
      setJsonError("Cole o JSON do pack aqui");
      return;
    }

    try {
      const sanitized = sanitizeJsonInput(jsonInput);
      const parsed = JSON.parse(sanitized);
      
      const canonical = typeof structuredClone === 'function' 
        ? structuredClone(parsed) 
        : JSON.parse(JSON.stringify(parsed));
      
      if (!canonical.missions || !Array.isArray(canonical.missions)) {
        setJsonError("O JSON deve ter um array 'missions'");
        return;
      }

      const missions = canonical.missions as Record<string, unknown>[];
      const defaults = canonical.pack?.defaults || {};
      const defaultType = (defaults.type as string) || null;
      const preview: PreviewMission[] = [];
      const errors: string[] = [];

      for (let i = 0; i < missions.length; i++) {
        const m = missions[i];
        
        if (!m.title || typeof m.title !== "string") {
          errors.push(`Missão ${i + 1}: campo 'title' é obrigatório.`);
          continue;
        }

        // Extract type from type/kind/category fields
        const extracted = extractMissionType(m);
        let rawValue = extracted?.rawValue || (defaultType as string) || "";
        let sourceField = extracted?.field || "default";
        let usedDefault = !extracted;

        if (!rawValue) {
          errors.push(`Missão ${i + 1} ("${m.title}"): sem type/kind/category. Defina um tipo.`);
          continue;
        }

        const norm = normalizeMissionType(rawValue);

        if (norm.normalized) {
          // Successful normalization — apply to canonical
          (m as Record<string, unknown>).type = norm.normalized;
          preview.push({
            type: norm.normalized,
            title: m.title as string,
            tagsLabel: Array.isArray(m.tags) ? (m.tags as string[]).join(", ") : String(m.tags ?? ""),
            estimated_min: (m.estimated_min as number) ?? (defaults.estimated_min as number) ?? 15,
            normalization: norm,
            usedDefault,
            sourceField,
          });
        } else {
          // Failed normalization
          const accepted = VALID_MISSION_TYPES.map(t => t.value).join(", ");
          const suggestion = norm.suggestion ? ` Sugestão: mude para "${norm.suggestion}".` : "";
          errors.push(`Missão ${i + 1} ("${m.title}"): tipo inválido "${rawValue}". Aceitos: [${accepted}].${suggestion}`);
        }
      }

      if (errors.length > 0) {
        setJsonError(errors.join("\n"));
      }

      // Still store canonical and preview even if some items failed (partial import is OK)
      if (preview.length > 0) {
        setPackCanonical(canonical);
        setPreviewMissions(preview);
      }

      toast({ title: `${preview.length} missões válidas de ${missions.length} no pack` });
    } catch (e) {
      setJsonError("JSON inválido: " + (e as Error).message);
    }
  };

  // Handle import - ALWAYS uses packCanonical, never preview
  const handleImport = async (mode: "draft" | "publish") => {
    if (!user?.id || !packCanonical) {
      toast({ title: "Valide o JSON antes de importar", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setExpandedErrorIndex(null);

    try {
      // Log the exact payload being sent (tags should be arrays)
      console.log("[MissionFactory] Importing pack:", { 
        mode, 
        packCanonical,
        tagsAreArrays: (packCanonical.missions as ParsedMission[])?.map(m => ({
          title: m.title,
          tagsType: Array.isArray(m.tags) ? 'array' : typeof m.tags,
          tags: m.tags
        }))
      });
      
      const { data, error } = await supabase.rpc("import_mission_pack", {
        _pack_json: packCanonical as unknown as Parameters<typeof supabase.rpc<"import_mission_pack">>[1]["_pack_json"],
        _actor_user_id: user.id,
        _mode: mode,
      });

      if (error) throw error;

      const result = data as unknown as ImportResult;
      setImportResult(result);

      if (result.ok) {
        toast({
          title: `${result.total_created} missões importadas!`,
          description: result.total_errors > 0 
            ? `${result.total_errors} erro(s) encontrado(s)` 
            : undefined,
        });
        
        if (result.total_errors === 0) {
          setJsonInput("");
          setPackCanonical(null);
          setPreviewMissions([]);
        }
      } else {
        toast({ title: "Erro na importação", variant: "destructive" });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({ title: "Erro ao importar pack", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="card-luta space-y-4">
      <div className="flex items-center gap-2 text-primary mb-4">
        <Factory className="h-5 w-5" />
        <span className="text-sm uppercase tracking-wider font-bold">Fábrica de Missões</span>
      </div>

      <Tabs defaultValue="create-one" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create-one" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Criar 1 missão
          </TabsTrigger>
          <TabsTrigger value="import-json" className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Importar pack (JSON)
          </TabsTrigger>
        </TabsList>

        {/* CREATE ONE MISSION */}
        <TabsContent value="create-one" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as MissionType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MISSION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tempo estimado (min)</Label>
              <Input
                type="number"
                value={form.estimated_min}
                onChange={(e) => setForm({ ...form, estimated_min: parseInt(e.target.value) || 15 })}
                min={5}
                max={240}
              />
            </div>
          </div>

          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Mini-escuta no bairro (2 perguntas)"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o objetivo e contexto da missão..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="campo, escuta, agora"
              />
            </div>

            <div>
              <Label>Atribuição</Label>
              <Select
                value={form.assigned_to}
                onValueChange={(v) => setForm({ ...form, assigned_to: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value={`user:${user?.id}`}>Apenas eu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Ciclo (opcional)</Label>
            <Select
              value={form.ciclo_id || "_none"}
              onValueChange={(v) => setForm({ ...form, ciclo_id: v === "_none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem ciclo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem ciclo</SelectItem>
                {ciclos
                  .filter((c) => c.status === "ativo" || c.status === "rascunho")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo} ({c.status})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>meta_json (avançado)</Label>
            <Textarea
              value={form.meta_json}
              onChange={(e) => setForm({ ...form, meta_json: e.target.value })}
              placeholder="{}"
              className="font-mono text-xs min-h-[60px]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleCreateMission(false)}
              disabled={isCreating || !form.title.trim()}
              className="flex-1"
            >
              {isCreating ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar como rascunho
            </Button>
            <Button
              onClick={() => handleCreateMission(true)}
              disabled={isCreating || !form.title.trim()}
              className="flex-1"
            >
              {isCreating ? <LoadingSpinner size="sm" /> : <Check className="h-4 w-4 mr-2" />}
              Publicar
            </Button>
          </div>
        </TabsContent>

        {/* IMPORT JSON PACK */}
        <TabsContent value="import-json" className="space-y-4 mt-4">
          {/* Accepted Types Reference */}
          <details className="text-sm border rounded-lg p-3">
            <summary className="cursor-pointer font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Tipos aceitos (fonte: enum do app)
            </summary>
            <div className="mt-2 space-y-1">
              {VALID_MISSION_TYPES.map((t) => (
                <div key={t.value} className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="font-mono">{t.value}</Badge>
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="text-muted-foreground/60">
                    (aliases: {t.aliases.slice(0, 4).join(", ")}{t.aliases.length > 4 ? "…" : ""})
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                O importador aceita os campos <code className="bg-muted px-1 rounded">type</code>, <code className="bg-muted px-1 rounded">kind</code> ou <code className="bg-muted px-1 rounded">category</code> e normaliza automaticamente case, acentos e aliases em EN/PT.
              </p>
            </div>
          </details>

          <div>
            <Label>Cole o JSON do pack aqui</Label>
            <Textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setJsonError(null);
                setPackCanonical(null);
                setPreviewMissions([]);
                setImportResult(null);
                setExpandedErrorIndex(null);
              }}
              placeholder={`{\n  "missions": [\n    { "type": "rua", "title": "Mini-escuta no bairro" }\n  ]\n}`}
              className="font-mono text-xs min-h-[200px]"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTemplate}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar template de Pack
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadTestPack}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Carregar pack de teste
            </Button>
          </div>

          {jsonError && (
            <div className="border border-destructive/30 rounded-lg p-3 space-y-1">
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <pre className="whitespace-pre-wrap text-xs">{jsonError}</pre>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleValidateJson}
            disabled={!jsonInput.trim()}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Validar JSON
          </Button>

          {/* Smart Preview */}
          {previewMissions.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Preview ({previewMissions.length} missões válidas)</span>
                <Badge variant="outline">{previewMissions.length} itens</Badge>
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {previewMissions.map((m, i) => (
                  <div key={i} className="text-sm bg-secondary/50 p-2 rounded space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {m.type}
                      </Badge>
                      <span className="truncate flex-1">{m.title}</span>
                      <span className="text-xs text-muted-foreground">{m.estimated_min}min</span>
                    </div>
                    {/* Normalization info */}
                    {m.normalization.wasChanged && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-mono">{m.normalization.original}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-mono font-bold">{m.type}</span>
                        <span className="text-muted-foreground">(normalizado)</span>
                      </div>
                    )}
                    {m.usedDefault && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>sem type → aplicado tipo padrão "{m.type}" do defaults</span>
                      </div>
                    )}
                    {m.sourceField !== "type" && m.sourceField !== "default" && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>lido de "{m.sourceField}" (→ type)</span>
                      </div>
                    )}
                    {m.tagsLabel && (
                      <div className="text-xs text-muted-foreground">tags: {m.tagsLabel}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleImport("draft")}
                  disabled={isImporting || !packCanonical}
                  className="flex-1"
                >
                  {isImporting ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4 mr-2" />}
                  Importar como rascunho
                </Button>
                <Button
                  onClick={() => handleImport("publish")}
                  disabled={isImporting || !packCanonical}
                  className="flex-1"
                >
                  {isImporting ? <LoadingSpinner size="sm" /> : <Check className="h-4 w-4 mr-2" />}
                  Importar e publicar
                </Button>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className={`border rounded-lg p-4 space-y-3 ${
              importResult.total_errors > 0 ? "border-destructive/30" : "border-primary/30"
            }`}>
              <div className="flex items-center gap-2">
                {importResult.total_errors > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <Check className="h-5 w-5 text-primary" />
                )}
                <span className="font-medium">
                  {importResult.total_created} missões criadas
                  {importResult.total_errors > 0 && `, ${importResult.total_errors} erro(s)`}
                </span>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="border border-destructive/30 rounded p-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <X className="h-3 w-3 flex-shrink-0" />
                        <span className="font-medium">Item {e.index}:</span>
                        <span>{e.reason}</span>
                        {e.sqlstate && (
                          <Badge variant="outline" className="text-xs">{e.sqlstate}</Badge>
                        )}
                      </div>
                      {e.detail && (
                        <div className="text-xs text-muted-foreground pl-5">
                          <strong>Detail:</strong> {e.detail}
                        </div>
                      )}
                      {e.hint && (
                        <div className="text-xs text-muted-foreground pl-5">
                          <strong>Hint:</strong> {e.hint}
                        </div>
                      )}
                      {e.item && (
                        <div className="pl-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => setExpandedErrorIndex(expandedErrorIndex === i ? null : i)}
                          >
                            {expandedErrorIndex === i ? "Ocultar item" : "Ver item"}
                          </Button>
                          {expandedErrorIndex === i && (
                            <pre className="mt-1 text-xs bg-secondary/50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(e.item, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {importResult.created.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  IDs criados: {importResult.created.map((c) => c.id.slice(0, 8)).join(", ")}...
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
