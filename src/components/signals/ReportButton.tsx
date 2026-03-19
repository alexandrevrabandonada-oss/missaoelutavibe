import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag } from "lucide-react";
import { useMuralReport } from "@/hooks/useUtilitySignals";
import { REPORT_CATEGORIES } from "@/hooks/useModeracao";

interface ReportButtonProps {
  postId: string;
  size?: "sm" | "default";
}

export function ReportButton({ postId, size = "default" }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [categoria, setCategoria] = useState("outro");
  const report = useMuralReport();

  const handleSubmit = () => {
    if (!motivo.trim()) return;
    report.mutate(
      { postId, motivo, categoria },
      {
        onSuccess: () => {
          setOpen(false);
          setMotivo("");
          setCategoria("outro");
        },
      }
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size={size === "sm" ? "sm" : "default"}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Flag className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        <span className="sr-only">Precisa revisar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar conteúdo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Descreva brevemente o problema..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!motivo.trim() || report.isPending}
            >
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
