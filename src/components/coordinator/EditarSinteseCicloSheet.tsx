/**
 * EditarSinteseCicloSheet - Edit synopsis of a closed cycle
 * F8.2: Lean sheet with textarea, disclaimer, RPC save
 */

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEditarSintese } from "@/hooks/useEditarSintese";
import { FileText, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CicloParaEditar {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  resumoAtual: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ciclo: CicloParaEditar | null;
  cellId: string;
}

export function EditarSinteseCicloSheet({ open, onOpenChange, ciclo, cellId }: Props) {
  const [resumo, setResumo] = useState("");
  const mutation = useEditarSintese(cellId);

  useEffect(() => {
    if (open && ciclo) {
      setResumo(ciclo.resumoAtual);
    }
  }, [open, ciclo]);

  if (!ciclo) return null;

  const handleSave = async () => {
    await mutation.mutateAsync({ cicloId: ciclo.id, resumo });
    onOpenChange(false);
  };

  const trimmed = resumo.trim();
  const unchanged = trimmed === ciclo.resumoAtual.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="heading-luta text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Editar síntese
          </SheetTitle>
          <SheetDescription className="text-xs">
            {ciclo.titulo} · {format(new Date(ciclo.inicio), "dd MMM", { locale: ptBR })} — {format(new Date(ciclo.fim), "dd MMM yyyy", { locale: ptBR })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="editar-sintese"
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block"
            >
              Síntese do ciclo
            </label>
            <Textarea
              id="editar-sintese"
              placeholder="O que marcou essa semana? Conquistas, desafios, próximos passos..."
              value={resumo}
              onChange={(e) => setResumo(e.target.value.slice(0, 500))}
              rows={4}
              className="resize-none text-sm"
              disabled={mutation.isPending}
            />
            <p className="text-[10px] text-muted-foreground/50 text-right mt-1">
              {resumo.length}/500
            </p>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Esta edição atualiza a Memória da célula, não o recibo já publicado no mural.
            </p>
          </div>

          <Button
            onClick={handleSave}
            className="w-full"
            disabled={mutation.isPending || unchanged || trimmed.length === 0}
          >
            {mutation.isPending ? "Salvando..." : "Salvar síntese"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
