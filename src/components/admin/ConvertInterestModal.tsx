import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useConvertInterest, ConvertInterestResult } from "@/hooks/useConvertInterest";
import { Building2, Calendar, CheckCircle, Users } from "lucide-react";

interface ConvertInterestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interest: {
    id: string;
    user_id: string;
    cidade_nome?: string;
    profile_nickname?: string;
    profile_name?: string;
  };
}

export function ConvertInterestModal({
  open,
  onOpenChange,
  interest,
}: ConvertInterestModalProps) {
  const navigate = useNavigate();
  const { convertInterest, isConverting } = useConvertInterest();

  const [cellName, setCellName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [createCycle, setCreateCycle] = useState(true);
  const [result, setResult] = useState<ConvertInterestResult | null>(null);

  const volunteerName = interest.profile_nickname || interest.profile_name || "Voluntário";

  const handleSubmit = async () => {
    if (!cellName.trim()) return;

    try {
      const res = await convertInterest({
        interestId: interest.id,
        cellName: cellName.trim(),
        cellNeighborhood: neighborhood.trim() || undefined,
        createInitialCycle: createCycle,
      });
      setResult(res);
    } catch {
      // Error already handled by hook
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCellName("");
    setNeighborhood("");
    setCreateCycle(true);
    setResult(null);
  };

  const successTitleId = "convert-success-title";
  const successDescId = "convert-success-desc";
  const formTitleId = "convert-form-title";
  const formDescId = "convert-form-desc";

  // Success state
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="sm:max-w-md"
          aria-labelledby={successTitleId}
          aria-describedby={successDescId}
        >
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center" aria-hidden="true">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <DialogTitle id={successTitleId} className="text-center">Célula Criada!</DialogTitle>
            <DialogDescription id={successDescId} className="text-center space-y-2">
              <p>A célula <strong>{cellName}</strong> foi criada com sucesso.</p>
              <p className="text-sm text-muted-foreground">
                {volunteerName} recebeu uma notificação para aceitar o papel de moderador.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Célula criada</p>
                <p className="text-sm text-muted-foreground">{neighborhood || interest.cidade_nome}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Convite enviado</p>
                <p className="text-sm text-muted-foreground">Papel: Moderador de Célula (expira em 7 dias)</p>
              </div>
            </div>

            {result.cycle_created && (
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Semana inaugural criada</p>
                  <p className="text-sm text-muted-foreground">
                    {result.tasks_created} tarefas no backlog
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {result.cycle_created && result.ciclo_id && (
              <Button
                variant="outline"
                onClick={() => {
                  handleClose();
                  navigate(`/admin/semana/${result.ciclo_id}`);
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Editar Semana
              </Button>
            )}
            <Button onClick={handleClose}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Form state
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md"
        aria-labelledby={formTitleId}
        aria-describedby={formDescId}
      >
        <DialogHeader>
          <DialogTitle id={formTitleId}>Criar Célula</DialogTitle>
          <DialogDescription id={formDescId}>
            Criar célula para <strong>{volunteerName}</strong> em{" "}
            <strong>{interest.cidade_nome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cell-name">Nome da Célula *</Label>
            <Input
              id="cell-name"
              placeholder="Ex: Centro, Zona Sul, Barra..."
              value={cellName}
              onChange={(e) => setCellName(e.target.value)}
              disabled={isConverting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro / Região</Label>
            <Input
              id="neighborhood"
              placeholder="Ex: Copacabana, Tijuca..."
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              disabled={isConverting}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="create-cycle" className="text-base cursor-pointer">
                Criar Semana Inicial
              </Label>
              <p className="text-sm text-muted-foreground">
                Cria ciclo rascunho com metas e tarefas
              </p>
            </div>
            <Switch
              id="create-cycle"
              checked={createCycle}
              onCheckedChange={setCreateCycle}
              disabled={isConverting}
            />
          </div>

          {createCycle && (
            <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg space-y-1">
              <p className="font-medium">Metas da semana inaugural:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>3 convites para novos voluntários</li>
                <li>1 atividade presencial ou online</li>
                <li>5 check-ins no dia</li>
                <li>2 missões concluídas</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isConverting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isConverting || !cellName.trim()}>
            {isConverting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Criar Célula
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
