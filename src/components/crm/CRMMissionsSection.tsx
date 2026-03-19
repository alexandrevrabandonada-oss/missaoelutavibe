import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Phone, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  ChevronRight,
  CalendarIcon,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useMyCRMMissions, CRM_MISSION_OUTCOMES, CRMMission } from "@/hooks/useCRMMissions";
import { cn } from "@/lib/utils";

interface CRMMissionsSectionProps {
  onSelectFocus?: (missionId: string) => void;
  selectedFocusId?: string | null;
  compact?: boolean;
}

export function CRMMissionsSection({ 
  onSelectFocus, 
  selectedFocusId,
  compact = false 
}: CRMMissionsSectionProps) {
  const { 
    missions, 
    isLoading, 
    generateMissions, 
    completeMission,
    isOptedIn 
  } = useMyCRMMissions();

  const [completingMission, setCompletingMission] = useState<CRMMission | null>(null);
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [nextActionDate, setNextActionDate] = useState<Date | undefined>();

  const handleComplete = () => {
    if (!completingMission || !outcome) return;

    completeMission.mutate(
      {
        mission_id: completingMission.mission_id,
        outcome,
        note,
        next_action_date: nextActionDate?.toISOString().split("T")[0],
      },
      {
        onSuccess: () => {
          setCompletingMission(null);
          setOutcome("");
          setNote("");
          setNextActionDate(undefined);
        },
      }
    );
  };

  if (!isOptedIn) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-500" />
            Conversas do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                Conversas do Dia
              </CardTitle>
              {!compact && (
                <CardDescription>
                  Contatos que precisam do seu acompanhamento
                </CardDescription>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMissions.mutate()}
              disabled={generateMissions.isPending}
            >
              {generateMissions.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Gerar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {missions.length === 0 ? (
            <div className="text-center py-4">
              <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conversa pendente.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em "Gerar" para criar missões a partir dos seus contatos CRM.
              </p>
            </div>
          ) : (
            missions.map((mission) => (
              <div
                key={mission.mission_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  selectedFocusId === mission.mission_id 
                    ? "border-primary bg-primary/5" 
                    : "hover:bg-accent"
                )}
              >
                <Phone className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{mission.contato_nome}</p>
                  {mission.contato_bairro && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {mission.contato_bairro}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {mission.proxima_acao_em && (
                    <Badge 
                      variant={new Date(mission.proxima_acao_em) < new Date() ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {format(new Date(mission.proxima_acao_em), "dd/MM")}
                    </Badge>
                  )}
                  {onSelectFocus && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectFocus(mission.mission_id)}
                    >
                      {selectedFocusId === mission.mission_id ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        "Focar"
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCompletingMission(mission)}
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            ))
          )}

          {missions.length > 0 && !compact && (
            <Button variant="ghost" className="w-full mt-2" asChild>
              <Link to="/voluntario/crm">
                Ver todos os contatos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Complete Mission Dialog */}
      <Dialog open={!!completingMission} onOpenChange={(open) => !open && setCompletingMission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir conversa</DialogTitle>
            <DialogDescription>
              Como foi o contato com {completingMission?.contato_nome}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Outcome */}
            <div className="space-y-2">
              <Label>Resultado</Label>
              <RadioGroup value={outcome} onValueChange={setOutcome}>
                {CRM_MISSION_OUTCOMES.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <Label htmlFor={opt.value} className="cursor-pointer">
                      {opt.emoji} {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                placeholder="Como foi a conversa? O que foi discutido?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>

            {/* Next Action Date (for reagendado) */}
            {(outcome === "reagendado" || outcome === "nao_atendeu") && (
              <div className="space-y-2">
                <Label>Próximo contato</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !nextActionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextActionDate 
                        ? format(nextActionDate, "PPP", { locale: ptBR }) 
                        : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={nextActionDate}
                      onSelect={setNextActionDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingMission(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={!outcome || completeMission.isPending}
            >
              {completeMission.isPending ? "Salvando..." : "Concluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
