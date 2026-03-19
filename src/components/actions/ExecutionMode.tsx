/**
 * ExecutionMode - Focused execution screen for daily action
 * 
 * Shows checklist/roteiro, optional timer, and completion buttons.
 * Supports "light done" (1 tap) and "done with evidence".
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  MessageCircle,
  ListTodo,
  ScrollText,
  Camera,
  ArrowLeft,
  Play,
  Pause,
  X,
  CalendarClock,
} from "lucide-react";
import { focusRingClass } from "@/utils/a11y";
import type { ActionItem, ActionKind } from "@/hooks/useActionQueue";

const KIND_ICONS: Record<ActionKind, React.ReactNode> = {
  followup: <Phone className="h-6 w-6" />,
  event_followup: <CalendarClock className="h-6 w-6" />,
  mission_rua: <MapPin className="h-6 w-6" />,
  mission_conversa: <MessageCircle className="h-6 w-6" />,
  talento_task: <ListTodo className="h-6 w-6" />,
  roteiro_sugerido: <ScrollText className="h-6 w-6" />,
};

const KIND_TIPS: Record<ActionKind, string[]> = {
  followup: [
    "Abra o WhatsApp e mande uma mensagem",
    "Use um roteiro se precisar de ajuda",
    "Registre o resultado da conversa",
  ],
  event_followup: [
    "Agradeça pela presença no evento",
    "Pergunte sobre a experiência",
    "Convide para próximas atividades",
  ],
  mission_rua: [
    "Vá até o local indicado",
    "Distribua materiais ou aborde pessoas",
    "Cadastre contatos interessados",
  ],
  mission_conversa: [
    "Entre em contato com os apoiadores",
    "Use o roteiro sugerido",
    "Registre o resultado de cada conversa",
  ],
  talento_task: [
    "Leia a descrição da tarefa",
    "Execute conforme instruções",
    "Marque como concluída quando terminar",
  ],
  roteiro_sugerido: [
    "Copie o roteiro para WhatsApp",
    "Envie para seus contatos",
    "Adapte conforme necessário",
  ],
};

interface ExecutionModeProps {
  action: ActionItem;
  startedAt: Date;
  onComplete: (options: { note?: string; withEvidence?: boolean }) => void;
  onCancel: () => void;
}

export function ExecutionMode({ 
  action, 
  startedAt, 
  onComplete, 
  onCancel 
}: ExecutionModeProps) {
  const navigate = useNavigate();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(KIND_TIPS[action.kind].length).fill(false)
  );

  // Timer
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleItem = (index: number) => {
    const newChecked = [...checkedItems];
    newChecked[index] = !newChecked[index];
    setCheckedItems(newChecked);
  };

  const completedCount = checkedItems.filter(Boolean).length;
  const progress = (completedCount / checkedItems.length) * 100;

  const handleLightDone = () => {
    if (showNoteInput) {
      onComplete({ note: note.trim() || undefined });
    } else {
      onComplete({});
    }
  };

  const handleDoneWithEvidence = () => {
    // Navigate to evidence page
    if (action.kind === "mission_rua" && action.meta?.mission_id) {
      navigate(`/voluntario/missao-rua/${action.meta.mission_id}`);
    } else if (action.kind === "mission_conversa" && action.meta?.mission_id) {
      navigate(`/voluntario/missao-conversa/${action.meta.mission_id}`);
    } else {
      onComplete({ note: note.trim() || undefined, withEvidence: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          className={focusRingClass()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sair
        </Button>
        
        {/* Timer */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPaused(!isPaused)}
            className={focusRingClass()}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Badge variant="secondary" className="text-lg font-mono px-3 py-1">
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(elapsedSeconds)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Action Header */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                {KIND_ICONS[action.kind]}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{action.title}</CardTitle>
                {action.subtitle && (
                  <p className="text-muted-foreground">{action.subtitle}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{completedCount}/{checkedItems.length}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {KIND_TIPS[action.kind].map((tip, index) => (
              <button
                key={index}
                onClick={() => handleToggleItem(index)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  checkedItems[index]
                    ? "bg-primary/5 border-primary text-primary"
                    : "hover:bg-muted"
                } ${focusRingClass()}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  checkedItems[index]
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground"
                }`}>
                  {checkedItems[index] && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <span className={checkedItems[index] ? "line-through opacity-70" : ""}>
                  {tip}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Quick Access Link */}
        {action.href && (
          <Button 
            asChild 
            variant="outline" 
            className={`w-full ${focusRingClass()}`}
          >
            <Link to={action.href} target="_blank">
              Abrir detalhes da ação
            </Link>
          </Button>
        )}

        {/* Optional Note */}
        {showNoteInput && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Observação (opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Conversei com 3 pessoas, 1 se interessou..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer CTAs */}
      <div className="p-4 border-t space-y-3 bg-background">
        {!showNoteInput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNoteInput(true)}
            className={`w-full ${focusRingClass()}`}
          >
            + Adicionar observação
          </Button>
        )}
        
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            size="lg"
            onClick={handleLightDone}
            className={`text-lg font-bold ${focusRingClass()}`}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            CONCLUIR
          </Button>
          
          {(action.kind === "mission_rua" || action.kind === "mission_conversa") && (
            <Button
              size="lg"
              variant="secondary"
              onClick={handleDoneWithEvidence}
              className={`text-lg font-bold ${focusRingClass()}`}
            >
              <Camera className="h-5 w-5 mr-2" />
              COM EVIDÊNCIA
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
