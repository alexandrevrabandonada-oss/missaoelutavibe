import { useState, useEffect } from "react";
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
  HelpCircle,
} from "lucide-react";
import {
  usePlaybookTracking,
  DEFAULT_OBJECTIONS,
  PlaybookObjection,
} from "@/hooks/usePlaybookConversa";
import { useRoteirosAprovados } from "@/hooks/useRoteiros";
import { useInviteLoop } from "@/hooks/useInviteLoop";

interface PlaybookMiniCardProps {
  onCopyMessage?: (text: string) => void;
  onOpenWhatsApp?: () => void;
  onScheduleFollowup?: (days: number) => void;
  objective?: string;
  className?: string;
}

export function PlaybookMiniCard({
  onCopyMessage,
  onOpenWhatsApp,
  onScheduleFollowup,
  objective = "convidar",
  className = "",
}: PlaybookMiniCardProps) {
  const { data: roteiros } = useRoteirosAprovados(objective as any);
  const tracking = usePlaybookTracking();
  const { inviteLink } = useInviteLoop();

  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Get first approved roteiro - use type assertion for new columns
  const roteiro = roteiros?.[0] as any;
  const roteiroObjections = Array.isArray(roteiro?.objections) ? roteiro.objections : [];
  const objections: PlaybookObjection[] = 
    roteiroObjections.length > 0
      ? (roteiroObjections as PlaybookObjection[])
      : DEFAULT_OBJECTIONS;

  // Track opened when expanded
  useEffect(() => {
    if (isOpen && roteiro) {
      tracking.trackOpened("crm", objective);
    }
  }, [isOpen, roteiro]);

  const handleCopy = async (text: string, type: "message" | "reply", objectionKey?: string) => {
    try {
      const textWithLink = type === "message" && inviteLink
        ? `${text}\n\n${inviteLink}`
        : text;

      await navigator.clipboard.writeText(textWithLink);
      setCopiedId(type === "message" ? "message" : objectionKey || null);
      setTimeout(() => setCopiedId(null), 2000);

      if (type === "message") {
        tracking.trackOpeningCopied(objective);
        onCopyMessage?.(textWithLink);
      } else if (objectionKey) {
        tracking.trackReplyCopied(objective, objectionKey);
      }

      toast.success(type === "message" ? "Mensagem copiada!" : "Resposta copiada!");
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

  const handleScheduleFollowup = (days: number) => {
    tracking.trackNextStepClicked("schedule_followup");
    onScheduleFollowup?.(days);
    toast.success(`Follow-up agendado para ${days} dias`);
  };

  const handleWhatsApp = () => {
    tracking.trackNextStepClicked("whatsapp");
    onOpenWhatsApp?.();
  };

  if (!roteiro) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border border-primary/30 rounded-lg bg-primary/5 ${className}`}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between text-left hover:bg-primary/10 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sugestão de mensagem</span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Message Preview */}
            <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
              {roteiro.texto_base}
            </p>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(roteiro.texto_base, "message")}
                className="flex-1 gap-1"
              >
                {copiedId === "message" ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copiar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleWhatsApp}
                className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </Button>
            </div>

            {/* Objections (compact) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <HelpCircle className="h-3 w-3" />
                Objeções comuns:
              </div>
              <div className="flex flex-wrap gap-1">
                {objections.slice(0, 3).map((obj) => (
                  <Badge
                    key={obj.key}
                    variant={selectedObjection === obj.key ? "default" : "outline"}
                    className="cursor-pointer text-xs transition-colors"
                    onClick={() => handleObjectionClick(obj.key)}
                  >
                    {obj.label}
                  </Badge>
                ))}
              </div>

              {/* Selected Reply */}
              {selectedObjection && (
                <div className="space-y-1 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Resposta:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const obj = objections.find((o) => o.key === selectedObjection);
                        if (obj) handleCopy(obj.reply_text, "reply", obj.key);
                      }}
                      className="h-5 text-xs gap-1 px-1"
                    >
                      {copiedId === selectedObjection ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs bg-green-500/10 border border-green-500/20 p-2 rounded">
                    {objections.find((o) => o.key === selectedObjection)?.reply_text}
                  </p>
                </div>
              )}
            </div>

            {/* Follow-up Scheduling */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Agendar follow-up:
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleScheduleFollowup(7)}
                  className="flex-1 text-xs h-7"
                >
                  7 dias
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleScheduleFollowup(14)}
                  className="flex-1 text-xs h-7"
                >
                  14 dias
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleScheduleFollowup(30)}
                  className="flex-1 text-xs h-7"
                >
                  30 dias
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
