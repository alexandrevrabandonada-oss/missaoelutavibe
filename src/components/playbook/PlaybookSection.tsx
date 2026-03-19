import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Calendar,
  UserPlus,
  Bookmark,
  Home,
  HelpCircle,
} from "lucide-react";
import {
  usePlaybookConversa,
  usePlaybookTracking,
  PlaybookNextStep,
  DEFAULT_OBJECTIONS,
  DEFAULT_NEXT_STEPS,
} from "@/hooks/usePlaybookConversa";
import { useInviteLoop } from "@/hooks/useInviteLoop";

interface PlaybookSectionProps {
  roteiroId?: string;
  objective?: string;
  onScheduleFollowup?: () => void;
  onInvitePlus1?: () => void;
  onSaveContact?: () => void;
  onOpenWhatsApp?: (text: string) => void;
  showNextSteps?: boolean;
  className?: string;
}

export function PlaybookSection({
  roteiroId,
  objective = "convidar",
  onScheduleFollowup,
  onInvitePlus1,
  onSaveContact,
  onOpenWhatsApp,
  showNextSteps = true,
  className = "",
}: PlaybookSectionProps) {
  const navigate = useNavigate();
  const { data: playbook, isLoading } = usePlaybookConversa(roteiroId);
  const tracking = usePlaybookTracking();
  const { inviteLink } = useInviteLoop();

  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [objectionsOpen, setObjectionsOpen] = useState(false);

  // Use defaults if no playbook data
  const objections = playbook?.objections ?? DEFAULT_OBJECTIONS;
  const nextSteps = playbook?.next_steps ?? DEFAULT_NEXT_STEPS;

  // Track opened on mount
  useEffect(() => {
    if (roteiroId) {
      tracking.trackOpened("mission", objective);
    }
  }, [roteiroId]);

  const handleCopy = async (text: string, type: "opening" | "reply", objectionKey?: string) => {
    try {
      // Append invite link if opening
      const textWithLink = type === "opening" && inviteLink 
        ? `${text}\n\n${inviteLink}`
        : text;
      
      await navigator.clipboard.writeText(textWithLink);
      setCopiedId(type === "opening" ? "opening" : objectionKey || null);
      setTimeout(() => setCopiedId(null), 2000);

      if (type === "opening") {
        tracking.trackOpeningCopied(objective);
      } else if (objectionKey) {
        tracking.trackReplyCopied(objective, objectionKey);
      }

      toast.success(type === "opening" ? "Abertura copiada!" : "Resposta copiada!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleObjectionClick = (key: string) => {
    if (selectedObjection === key) {
      setSelectedObjection(null);
    } else {
      setSelectedObjection(key);
      tracking.trackObjectionClicked(objective, key);
    }
  };

  const handleNextStep = (step: PlaybookNextStep) => {
    tracking.trackNextStepClicked(step.action);

    switch (step.action) {
      case "schedule_followup":
        onScheduleFollowup?.();
        break;
      case "invite_plus1":
        onInvitePlus1?.();
        break;
      case "save_contact":
        onSaveContact?.();
        break;
      case "whatsapp":
        if (playbook?.texto_base) {
          onOpenWhatsApp?.(playbook.texto_base);
        }
        break;
      case "open_today":
        navigate("/voluntario/hoje");
        break;
      case "open_mission":
        navigate("/voluntario/missoes");
        break;
    }
  };

  const getStepIcon = (action: string) => {
    switch (action) {
      case "schedule_followup":
        return <Calendar className="h-4 w-4" />;
      case "invite_plus1":
        return <UserPlus className="h-4 w-4" />;
      case "save_contact":
        return <Bookmark className="h-4 w-4" />;
      case "whatsapp":
        return <MessageCircle className="h-4 w-4" />;
      case "open_today":
        return <Home className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="py-4">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-primary/30 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Roteiro + Objeções
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Opening Script with Copy */}
        {playbook?.texto_base && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Abertura</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(playbook.texto_base, "opening")}
                className="h-7 gap-1"
              >
                {copiedId === "opening" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedId === "opening" ? "Copiado!" : "Copiar abertura"}
              </Button>
            </div>
            <p className="text-sm bg-muted/50 p-3 rounded-lg line-clamp-3">
              {playbook.texto_base}
            </p>
          </div>
        )}

        {/* Objections Chips */}
        <Collapsible open={objectionsOpen} onOpenChange={setObjectionsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-9 px-2">
              <span className="flex items-center gap-2 text-sm">
                <HelpCircle className="h-4 w-4" />
                Objeções comuns ({objections.length})
              </span>
              {objectionsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {objections.map((obj) => (
                <Badge
                  key={obj.key}
                  variant={selectedObjection === obj.key ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleObjectionClick(obj.key)}
                >
                  {obj.label}
                </Badge>
              ))}
            </div>

            {/* Selected Objection Reply */}
            {selectedObjection && (
              <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Resposta sugerida</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const obj = objections.find((o) => o.key === selectedObjection);
                      if (obj) handleCopy(obj.reply_text, "reply", obj.key);
                    }}
                    className="h-6 text-xs gap-1"
                  >
                    {copiedId === selectedObjection ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copiar
                  </Button>
                </div>
                <p className="text-sm bg-green-500/10 border border-green-500/30 p-3 rounded-lg">
                  {objections.find((o) => o.key === selectedObjection)?.reply_text}
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Next Steps */}
        {showNextSteps && nextSteps.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-medium text-muted-foreground">Próximo passo (1 toque)</span>
            <div className="grid grid-cols-3 gap-2">
              {nextSteps.slice(0, 3).map((step) => (
                <Button
                  key={step.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleNextStep(step)}
                  className="h-auto py-2 flex-col gap-1 text-xs"
                >
                  {getStepIcon(step.action)}
                  <span className="leading-tight text-center">{step.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
