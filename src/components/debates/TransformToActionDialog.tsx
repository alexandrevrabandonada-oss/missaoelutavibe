import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebateToAction } from "@/hooks/useDebateToAction";
import { useCells } from "@/hooks/useCells";
import { Target, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type MissionType = Database["public"]["Enums"]["mission_type"];

const MISSION_TYPES: { value: MissionType; label: string }[] = [
  { value: "escuta", label: "Escuta" },
  { value: "rua", label: "Rua" },
  { value: "mobilizacao", label: "Mobilização" },
  { value: "conteudo", label: "Conteúdo" },
  { value: "dados", label: "Dados" },
  { value: "formacao", label: "Formação" },
];

interface TransformToActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "mission" | "demanda";
  defaultTitle: string;
  defaultDescription: string;
  topicoId?: string;
  postId?: string;
  cellId?: string | null;
}

export function TransformToActionDialog({
  open,
  onOpenChange,
  mode,
  defaultTitle,
  defaultDescription,
  topicoId,
  postId,
  cellId,
}: TransformToActionDialogProps) {
  const navigate = useNavigate();
  const { createMissionFromDebate, isCreatingMission, createDemandaFromDebate, isCreatingDemanda } =
    useDebateToAction();
  const { cells } = useCells();

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [missionType, setMissionType] = useState<MissionType>("escuta");
  const [selectedCellId, setSelectedCellId] = useState<string>(cellId ?? "");
  const [territorio, setTerritorio] = useState("");

  const isSubmitting = isCreatingMission || isCreatingDemanda;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    try {
      if (mode === "mission") {
        const mission = await createMissionFromDebate({
          title: title.trim(),
          description: description.trim(),
          type: missionType,
          cellId: selectedCellId || null,
          topicoId,
          postId,
        });
        toast.success("Missão criada com sucesso!");
        onOpenChange(false);
        navigate(`/admin?tab=missoes`);
      } else {
        const demanda = await createDemandaFromDebate({
          titulo: title.trim(),
          descricao: description.trim(),
          territorio: territorio.trim() || null,
          topicoId,
          postId,
        });
        toast.success("Demanda criada com sucesso!");
        onOpenChange(false);
        navigate(`/admin?tab=demandas`);
      }
    } catch (error) {
      console.error("Erro ao criar:", error);
      toast.error(mode === "mission" ? "Erro ao criar missão" : "Erro ao criar demanda");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "mission" ? (
              <>
                <Target className="h-5 w-5 text-primary" />
                Transformar em Missão
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 text-primary" />
                Transformar em Demanda
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "mission"
              ? "Crie uma missão a partir deste debate para ação prática."
              : "Crie uma demanda para acompanhamento e resolução."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "mission" ? "Título da missão" : "Título da demanda"}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo..."
              rows={4}
            />
          </div>

          {/* Mission-specific fields */}
          {mode === "mission" && (
            <>
              {/* Tipo da Missão */}
              <div className="space-y-2">
                <Label>Tipo de Missão</Label>
                <Select value={missionType} onValueChange={(v) => setMissionType(v as MissionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MISSION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Célula (opcional) */}
              <div className="space-y-2">
                <Label>Célula (opcional)</Label>
                <Select value={selectedCellId || "none"} onValueChange={(v) => setSelectedCellId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma célula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (missão global)</SelectItem>
                    {cells.map((cell) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name} — {cell.city}/{cell.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Demanda-specific fields */}
          {mode === "demanda" && (
            <div className="space-y-2">
              <Label htmlFor="territorio">Território (opcional)</Label>
              <Input
                id="territorio"
                value={territorio}
                onChange={(e) => setTerritorio(e.target.value)}
                placeholder="Ex: Zona Leste, Centro..."
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : mode === "mission" ? (
                "Criar Missão"
              ) : (
                "Criar Demanda"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
