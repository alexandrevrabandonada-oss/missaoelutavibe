import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  useConversationMission,
  ConversationObjective,
  OBJECTIVE_LABELS,
  OBJECTIVE_COLORS,
} from "@/hooks/useConversationMission";
import { MessageCircle, Clock, Sparkles, ArrowRight, Loader2, Users } from "lucide-react";

interface ConversationMissionCardProps {
  compact?: boolean;
  className?: string;
}

const OBJECTIVES: ConversationObjective[] = ['convidar', 'explicar', 'objecao', 'fechamento'];

export function ConversationMissionCard({ compact = false, className = "" }: ConversationMissionCardProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<ConversationObjective>("convidar");

  const {
    todaysMission,
    hasGeneratedToday,
    missionInProgress,
    missionCompleted,
    generateMission,
    isGenerating,
    isLoading,
  } = useConversationMission();

  const handleGenerate = async () => {
    // IMPORTANT: never allow an unhandled rejection here, otherwise AppErrorBoundary
    // will catch it via window.unhandledrejection and show the fatal error screen.
    try {
      const result = await generateMission({
        objective: selectedObjective,
        channel: 'whatsapp',
        targetCount: 3,
      });

      // Rate limited - toast already shown by hook
      if ((result as any)?.rate_limited) return;

      if ((result.success || result.ok) && result.mission_id) {
        setDialogOpen(false);
        navigate(`/voluntario/missao-conversa/${result.mission_id}`);
      } else if (result.already_exists && result.mission_id) {
        setDialogOpen(false);
        navigate(`/voluntario/missao-conversa/${result.mission_id}`);
      }
    } catch {
      // toast is handled by the hook; swallow to avoid crashing the app
    }
  };

  const handleOpenDialog = () => {
    if (hasGeneratedToday && todaysMission) {
      navigate(`/voluntario/missao-conversa/${todaysMission.id}`);
    } else {
      setDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className={`card-luta animate-pulse ${className}`}>
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <button
          onClick={handleOpenDialog}
          className={`card-luta w-full text-left hover:bg-secondary/80 transition-colors group ${
            missionInProgress
              ? "border-primary/50 bg-primary/10"
              : missionCompleted
              ? "border-green-500/30 bg-green-500/5"
              : "border-purple-500/30 bg-purple-500/5"
          } ${className}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  missionInProgress
                    ? "bg-primary/20"
                    : missionCompleted
                    ? "bg-green-500/20"
                    : "bg-purple-500/20"
                }`}
              >
                <MessageCircle
                  className={`h-5 w-5 ${
                    missionInProgress
                      ? "text-primary"
                      : missionCompleted
                      ? "text-green-500"
                      : "text-purple-500"
                  }`}
                />
              </div>
              <div>
                <p className="font-bold text-sm group-hover:text-primary transition-colors">
                  {missionCompleted
                    ? "Conversas Concluídas!"
                    : missionInProgress
                    ? "Continuar Conversas"
                    : "Missão de Conversa (10 min)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {missionCompleted
                    ? "Ótimo trabalho hoje!"
                    : missionInProgress
                    ? `${(todaysMission?.meta_json?.actual_count || 3)} contatos aguardando`
                    : "3 conversas usando roteiro aprovado"}
                </p>
              </div>
            </div>
            <Badge
              className={
                missionInProgress
                  ? "bg-primary/10 text-primary"
                  : missionCompleted
                  ? "bg-green-500/10 text-green-600"
                  : "bg-purple-500/10 text-purple-600"
              }
            >
              {missionCompleted ? "✓" : <Users className="h-3 w-3" />}
            </Badge>
          </div>
        </button>

        <GenerateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedObjective={selectedObjective}
          setSelectedObjective={setSelectedObjective}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </>
    );
  }

  // Full version
  return (
    <>
      <div
        className={`card-luta border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-purple-500/5 ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-6 w-6 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base">Missão de Conversa</h3>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              3 conversas usando roteiro aprovado. Registre resultados sem expor dados.
            </p>

            {missionCompleted ? (
              <div className="flex items-center gap-2 text-green-500 font-medium">
                <span>✓ Missão concluída hoje</span>
              </div>
            ) : missionInProgress ? (
              <Button
                onClick={() => navigate(`/voluntario/missao-conversa/${todaysMission?.id}`)}
                className="gap-1.5"
              >
                Continuar Conversas <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setDialogOpen(true)}
                className="gap-1.5 bg-purple-500 hover:bg-purple-600"
              >
                <MessageCircle className="h-4 w-4" />
                Gerar Missão (10 min)
              </Button>
            )}
          </div>
        </div>
      </div>

      <GenerateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedObjective={selectedObjective}
        setSelectedObjective={setSelectedObjective}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </>
  );
}

// Extracted dialog component
function GenerateDialog({
  open,
  onOpenChange,
  selectedObjective,
  setSelectedObjective,
  onGenerate,
  isGenerating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedObjective: ConversationObjective;
  setSelectedObjective: (obj: ConversationObjective) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-500" />
            Gerar Missão de Conversa
          </DialogTitle>
          <DialogDescription>
            Escolha o objetivo da conversa. Selecionaremos um roteiro aprovado e 3 contatos do seu CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Objective Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Objetivo da Conversa</Label>
            <RadioGroup
              value={selectedObjective}
              onValueChange={(val) => setSelectedObjective(val as ConversationObjective)}
              className="grid gap-2"
            >
              {OBJECTIVES.map((objective) => (
                <div
                  key={objective}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedObjective === objective
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedObjective(objective)}
                >
                  <RadioGroupItem value={objective} id={`obj-${objective}`} />
                  <Label htmlFor={`obj-${objective}`} className="cursor-pointer flex-1 flex items-center gap-2">
                    <span>{OBJECTIVE_LABELS[objective]}</span>
                    <Badge className={OBJECTIVE_COLORS[objective]} variant="secondary">
                      {objective === 'convidar' && '🎯'}
                      {objective === 'explicar' && '💬'}
                      {objective === 'objecao' && '🤔'}
                      {objective === 'fechamento' && '✅'}
                    </Badge>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
            <Clock className="h-4 w-4" />
            <span>~10 minutos • 3 contatos • Roteiro automático</span>
          </div>

          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full bg-purple-500 hover:bg-purple-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Gerar Missão
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
