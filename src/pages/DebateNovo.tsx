import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTopicos } from "@/hooks/useDebates";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useUserCells } from "@/hooks/useUserCells";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCells } from "@/hooks/useCells";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Globe, Users, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TopicoEscopo = Database["public"]["Enums"]["topico_escopo"];

export default function DebateNovo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createTopico } = useTopicos();
  const { isApproved, isStatusLoading } = useVolunteerStatus();
  const { userCells, isLoading: userCellsLoading, hasCell } = useUserCells();
  const { isCoordinator } = useUserRoles();
  const { cells: allCells, isLoading: allCellsLoading } = useCells();

  const [tema, setTema] = useState("");
  const [descricao, setDescricao] = useState("");
  const [escopo, setEscopo] = useState<TopicoEscopo>("global");
  const [celulaId, setCelulaId] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = isCoordinator();
  const cellsLoading = isAdmin ? allCellsLoading : userCellsLoading;
  
  // Cells available for selection
  const availableCells = isAdmin ? allCells : userCells;

  // Auto-select user's cell if they have only one (for non-admins)
  useEffect(() => {
    if (!isAdmin && escopo === "celula" && userCells.length === 1 && !celulaId) {
      setCelulaId(userCells[0].id);
    }
  }, [isAdmin, escopo, userCells, celulaId]);

  if (isStatusLoading || cellsLoading) {
    return <FullPageLoader />;
  }

  // Redirect if not approved
  if (!isApproved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <h1 className="text-xl font-bold mb-4">Acesso restrito</h1>
        <p className="text-muted-foreground mb-4">
          Aguarde aprovação para criar tópicos.
        </p>
        <Button onClick={() => navigate("/debates")}>Voltar aos Debates</Button>
      </div>
    );
  }

  const handleAddTag = () => {
    const trimmed = tagsInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagsInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCreateTopico = async () => {
    if (!tema.trim()) {
      toast.error("O tema é obrigatório");
      return;
    }

    if (escopo === "celula" && !celulaId) {
      toast.error("Selecione uma célula para tópicos de escopo célula");
      return;
    }

    setIsSubmitting(true);
    try {
      const newTopico = await createTopico({
        tema: tema.trim(),
        descricao: descricao.trim() || null,
        escopo,
        celula_id: escopo === "celula" ? celulaId : null,
        tags: tags.length > 0 ? tags : null,
      });

      toast.success("Tópico criado com sucesso!");
      navigate(`/debates/topico/${newTopico.id}`);
    } catch (error) {
      console.error("Erro ao criar tópico:", error);
      toast.error("Erro ao criar tópico");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user can create cell-scoped topic
  const canCreateCellTopic = isAdmin || hasCell;

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/debates")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <div className="w-10" />
      </div>

      <div className="flex-1 space-y-6 animate-slide-up max-w-xl mx-auto w-full">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">Novo Tópico</h1>
          <p className="text-muted-foreground text-sm">
            Inicie uma discussão com a comunidade
          </p>
        </div>

        {/* Form */}
        <div className="card-luta space-y-5">
          {/* Tema */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Tema <span className="text-destructive">*</span>
            </label>
            <Input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Título do debate"
              maxLength={200}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium mb-2 block">Descrição</label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Contexto, pergunta ou proposta inicial..."
              rows={4}
            />
          </div>

          {/* Escopo */}
          <div>
            <label className="text-sm font-medium mb-2 block">Escopo</label>
            <Select
              value={escopo}
              onValueChange={(v) => {
                setEscopo(v as TopicoEscopo);
                if (v === "global") setCelulaId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Global — visível para todos
                  </div>
                </SelectItem>
                <SelectItem value="celula" disabled={!canCreateCellTopic}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Célula — visível apenas para membros
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Célula (conditional) */}
          {escopo === "celula" && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Célula <span className="text-destructive">*</span>
              </label>
              {canCreateCellTopic ? (
                <>
                  {/* For non-admin with single cell, show as locked */}
                  {!isAdmin && userCells.length === 1 ? (
                    <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">{userCells[0].name}</span>
                      <span className="text-muted-foreground text-sm">
                        — {userCells[0].city}/{userCells[0].state}
                      </span>
                    </div>
                  ) : (
                    <Select value={celulaId} onValueChange={setCelulaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma célula" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCells.map((cell) => (
                          <SelectItem key={cell.id} value={cell.id}>
                            {cell.name} — {cell.city}/{cell.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md border border-warning/30 bg-warning/10 text-warning-foreground text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Você ainda não está em uma célula. Peça vinculação à coordenação.</span>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={handleAddTag}
                placeholder="Digite e pressione Enter"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagsInput.trim()}
              >
                Adicionar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    #{tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleCreateTopico}
            disabled={isSubmitting || !tema.trim() || (escopo === "celula" && !celulaId)}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Criando..." : "Criar Tópico"}
          </Button>
        </div>
      </div>

      {/* Signature */}
      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}
