/**
 * CRM Apoio/Voto v0 - Support Level Section for Contact Drawer
 * 
 * One-tap support level chips + quick scripts.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useSetSupportLevel,
  getSupportLevelOptions,
  getSupportScripts,
  useTrackSupportScript,
  type SupportLevel,
} from "@/hooks/useContactSupport";
import { useAppMode } from "@/hooks/useAppMode";
import { toast } from "sonner";
import { Copy, MessageCircle, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactSupportSectionProps {
  contactId: string;
  currentLevel: SupportLevel;
  onLevelChanged?: () => void;
}

export function ContactSupportSection({
  contactId,
  currentLevel,
  onLevelChanged,
}: ContactSupportSectionProps) {
  const { mode } = useAppMode();
  const { mutate: setLevel, isPending } = useSetSupportLevel();
  const trackScript = useTrackSupportScript();

  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingLevel, setPendingLevel] = useState<SupportLevel | null>(null);

  const options = getSupportLevelOptions(mode);
  const scripts = getSupportScripts(mode);
  const isCampaign = mode === 'campanha';

  const handleSelectLevel = (level: SupportLevel) => {
    // For negative/neutral, show reason input first
    if ((level === 'negative' || level === 'neutral') && level !== currentLevel) {
      setPendingLevel(level);
      setShowReasonInput(true);
      return;
    }

    // Direct save for other levels
    saveLevel(level);
  };

  const saveLevel = (level: SupportLevel, reasonText?: string) => {
    setLevel(
      { contactId, level, reason: reasonText },
      {
        onSuccess: () => {
          setShowReasonInput(false);
          setReason("");
          setPendingLevel(null);
          onLevelChanged?.();
        },
      }
    );
  };

  const handleConfirmReason = () => {
    if (pendingLevel) {
      saveLevel(pendingLevel, reason.trim() || undefined);
    }
  };

  const handleCopyScript = (type: keyof typeof scripts) => {
    const text = scripts[type];
    navigator.clipboard.writeText(text);
    trackScript(type);
    toast.success("Texto copiado!");
  };

  return (
    <div className="space-y-4">
      {/* Support Level Label */}
      <div>
        <Label className="text-sm font-medium">
          {isCampaign ? "🗳️ Voto" : "🤝 Apoio"}
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Toque para atualizar o nível de {isCampaign ? "voto" : "apoio"}
        </p>
      </div>

      {/* Support Level Chips */}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Badge
            key={opt.value}
            variant="outline"
            className={cn(
              "cursor-pointer transition-all px-3 py-1.5 text-sm border",
              currentLevel === opt.value
                ? opt.color + " ring-2 ring-offset-1 ring-primary/50"
                : "hover:bg-muted/50",
              isPending && "opacity-50 pointer-events-none"
            )}
            onClick={() => handleSelectLevel(opt.value)}
          >
            <span className="mr-1">{opt.emoji}</span>
            {opt.label}
            {isPending && pendingLevel === opt.value && (
              <Loader2 className="h-3 w-3 ml-1 animate-spin" />
            )}
          </Badge>
        ))}
      </div>

      {/* Reason Input (for negative/neutral) */}
      {showReasonInput && pendingLevel && (
        <div className="p-3 border border-border rounded-lg bg-muted/30 space-y-3">
          <div>
            <Label className="text-sm">Motivo (opcional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Sem nomes, sem detalhes pessoais..."
              maxLength={140}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/140 caracteres
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirmReason}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowReasonInput(false);
                setPendingLevel(null);
                setReason("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <Separator />

      {/* Quick Scripts Section */}
      <div>
        <Label className="text-sm font-medium">📝 Próximo passo</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
          Copie e envie pelo WhatsApp
        </p>

        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-left h-auto py-2"
            onClick={() => handleCopyScript('ask_support')}
          >
            <Copy className="h-4 w-4 mr-2 shrink-0" />
            <span className="line-clamp-2">
              {isCampaign ? "Pedir voto" : "Pedir apoio"}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-left h-auto py-2"
            onClick={() => handleCopyScript('ask_referral')}
          >
            <MessageCircle className="h-4 w-4 mr-2 shrink-0" />
            <span className="line-clamp-2">
              Pedir indicação (+1)
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-left h-auto py-2"
            onClick={() => handleCopyScript('invite_event')}
          >
            <Calendar className="h-4 w-4 mr-2 shrink-0" />
            <span className="line-clamp-2">
              Convidar pra atividade
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
