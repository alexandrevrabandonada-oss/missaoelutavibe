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
  useStreetMission,
  StreetAction,
  STREET_ACTION_LABELS,
  STREET_TIME_OPTIONS,
} from "@/hooks/useStreetMission";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { MapPin, Clock, Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface StreetMissionCardProps {
  compact?: boolean;
  className?: string;
}

export function StreetMissionCard({ compact = false, className = "" }: StreetMissionCardProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StreetAction>("panfletar");
  const [selectedTime, setSelectedTime] = useState(10);

  const {
    todaysMission,
    hasGeneratedToday,
    missionInProgress,
    missionCompleted,
    generateMission,
    isGenerating,
    isLoading,
  } = useStreetMission();

  const { profile } = useInviteLoop();

  const handleGenerate = async () => {
    const result = await generateMission({
      acao: selectedAction,
      tempo_estimado: selectedTime,
    });

    if (result?.success && 'mission_id' in result && result.mission_id) {
      setDialogOpen(false);
      navigate(`/voluntario/missao-rua/${result.mission_id}`);
    }
  };

  const handleOpenDialog = () => {
    if (hasGeneratedToday && todaysMission) {
      // Navigate to existing mission
      navigate(`/voluntario/missao-rua/${todaysMission.id}`);
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
              : "border-orange-500/30 bg-orange-500/5"
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
                    : "bg-orange-500/20"
                }`}
              >
                <MapPin
                  className={`h-5 w-5 ${
                    missionInProgress
                      ? "text-primary"
                      : missionCompleted
                      ? "text-green-500"
                      : "text-orange-500"
                  }`}
                />
              </div>
              <div>
                <p className="font-bold text-sm group-hover:text-primary transition-colors">
                  {missionCompleted
                    ? "Missão de Rua Concluída!"
                    : missionInProgress
                    ? "Continuar Missão de Rua"
                    : "Gerar Missão de Rua (10 min)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {missionCompleted
                    ? "Parabéns pela ação!"
                    : missionInProgress
                    ? "Toque para ver seu QR e concluir"
                    : "Ação presencial no território"}
                </p>
              </div>
            </div>
            <Badge
              className={
                missionInProgress
                  ? "bg-primary/10 text-primary"
                  : missionCompleted
                  ? "bg-green-500/10 text-green-600"
                  : "bg-orange-500/10 text-orange-600"
              }
            >
              {missionCompleted ? "✓" : "Rua"}
            </Badge>
          </div>
        </button>

        {/* Generation Dialog */}
        <GenerateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedAction={selectedAction}
          setSelectedAction={setSelectedAction}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        userBairro={(profile as any)?.bairro}
      />
    </>
  );
  }

  // Full version
  return (
    <>
      <div
        className={`card-luta border-orange-500/40 bg-gradient-to-br from-orange-500/10 to-orange-500/5 ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-6 w-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base">Missão de Rua</h3>
              <Sparkles className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Micro-ação presencial no seu território. Use seu QR para convidar pessoas!
            </p>

            {missionCompleted ? (
              <div className="flex items-center gap-2 text-green-500 font-medium">
                <span>✓ Missão concluída hoje</span>
              </div>
            ) : missionInProgress ? (
              <Button
                onClick={() => navigate(`/voluntario/missao-rua/${todaysMission?.id}`)}
                className="gap-1.5"
              >
                Continuar Missão <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setDialogOpen(true)}
                className="gap-1.5 bg-orange-500 hover:bg-orange-600"
              >
                <MapPin className="h-4 w-4" />
                Gerar Missão (10 min)
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Generation Dialog */}
      <GenerateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedAction={selectedAction}
        setSelectedAction={setSelectedAction}
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        userBairro={(profile as any)?.bairro}
      />
    </>
  );
}

// Extracted dialog component
function GenerateDialog({
  open,
  onOpenChange,
  selectedAction,
  setSelectedAction,
  selectedTime,
  setSelectedTime,
  onGenerate,
  isGenerating,
  userBairro,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAction: StreetAction;
  setSelectedAction: (action: StreetAction) => void;
  selectedTime: number;
  setSelectedTime: (time: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  userBairro?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Gerar Missão de Rua
          </DialogTitle>
          <DialogDescription>
            Escolha o tipo de ação e o tempo disponível
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Action Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Ação</Label>
            <RadioGroup
              value={selectedAction}
              onValueChange={(val) => setSelectedAction(val as StreetAction)}
              className="grid gap-2"
            >
              {(Object.keys(STREET_ACTION_LABELS) as StreetAction[]).map((action) => (
                <div
                  key={action}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedAction === action
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedAction(action)}
                >
                  <RadioGroupItem value={action} id={`action-${action}`} />
                  <Label htmlFor={`action-${action}`} className="cursor-pointer flex-1">
                    {STREET_ACTION_LABELS[action]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Time */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Disponível
            </Label>
            <RadioGroup
              value={selectedTime.toString()}
              onValueChange={(val) => setSelectedTime(parseInt(val))}
              className="flex gap-2"
            >
              {STREET_TIME_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedTime === opt.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedTime(opt.value)}
                >
                  <RadioGroupItem value={opt.value.toString()} id={`time-${opt.value}`} />
                  <Label htmlFor={`time-${opt.value}`} className="cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Bairro info */}
          {userBairro && (
            <p className="text-xs text-muted-foreground text-center">
              Bairro: <span className="font-medium">{userBairro}</span>
            </p>
          )}

          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Gerar Missão
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
