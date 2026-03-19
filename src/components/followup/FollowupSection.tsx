import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  CheckCircle2,
  Clock,
  MessageCircle,
  Copy,
  ExternalLink,
  MapPin,
  CalendarCheck,
  Heart,
  Inbox,
} from "lucide-react";
import {
  useDueFollowups,
  useFollowupTracking,
  FOLLOWUP_KIND_LABELS,
  FOLLOWUP_KIND_COLORS,
  FollowupItem,
} from "@/hooks/useFollowups";
import { useConvites } from "@/hooks/useConvites";
import { useRoteirosAprovados, Roteiro, RoteiroVersoes } from "@/hooks/useRoteiros";
import { toast } from "sonner";

interface FollowupSectionProps {
  compact?: boolean;
  maxItems?: number;
}

// Helper to extract versoes from JSON
function getVersoes(roteiro: Roteiro): RoteiroVersoes | null {
  if (!roteiro.versoes_json) return null;
  if (typeof roteiro.versoes_json === 'object' && !Array.isArray(roteiro.versoes_json)) {
    const v = roteiro.versoes_json as Record<string, unknown>;
    return {
      curta: (v.curta as string) || '',
      media: (v.media as string) || '',
      longa: (v.longa as string) || '',
    };
  }
  return null;
}

export function FollowupSection({ compact = false, maxItems = 5 }: FollowupSectionProps) {
  const { followups, isLoading, hasFollowups, markDone, isMarkingDone, snooze, isSnoozing } =
    useDueFollowups(maxItems);
  const { logWhatsAppOpened } = useFollowupTracking();
  const { convites } = useConvites();
  const { data: roteirosAprovados } = useRoteirosAprovados();

  // Get user's invite code for WhatsApp links
  const myInviteCode = convites?.[0]?.code;

  // Find recommended roteiro based on context objective
  const findRoteiro = (objective?: string): Roteiro | undefined => {
    if (!objective || !roteirosAprovados?.length) return roteirosAprovados?.[0];
    return (
      roteirosAprovados.find((r) => r.objetivo === objective) || roteirosAprovados[0]
    );
  };

  // Get text from roteiro (prefer short version)
  const getRoteiroText = (roteiro: Roteiro | undefined): string => {
    if (!roteiro) return "Olá! Tudo bem?";
    const versoes = getVersoes(roteiro);
    return versoes?.curta || versoes?.media || roteiro.texto_base || "Olá! Tudo bem?";
  };

  // Build WhatsApp link
  const buildWhatsAppLink = (item: FollowupItem): string => {
    const roteiro = findRoteiro(item.context?.objective);
    const text = getRoteiroText(roteiro);
    const inviteLink = myInviteCode
      ? `\n\nSaiba mais: ${window.location.origin}/r/${myInviteCode}?utm_source=followup&utm_medium=whatsapp`
      : "";
    const fullText = encodeURIComponent(text + inviteLink);
    return `https://wa.me/?text=${fullText}`;
  };

  // Copy roteiro text
  const handleCopyRoteiro = (item: FollowupItem) => {
    const roteiro = findRoteiro(item.context?.objective);
    const text = getRoteiroText(roteiro);
    if (text && text !== "Olá! Tudo bem?") {
      navigator.clipboard.writeText(text);
      toast.success("Roteiro copiado!");
    } else {
      toast.error("Nenhum roteiro disponível");
    }
  };

  // Handle WhatsApp click
  const handleWhatsAppClick = (item: FollowupItem) => {
    logWhatsAppOpened(item.kind, item.context?.objective, item.cidade);
    window.open(buildWhatsAppLink(item), "_blank");
  };

  // Get kind icon
  const getKindIcon = (kind: string) => {
    switch (kind) {
      case "agendar":
        return <CalendarCheck className="h-4 w-4" />;
      case "nutrir":
        return <Heart className="h-4 w-4" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!hasFollowups) {
    return (
      <Card className="border-muted">
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className="text-lg flex items-center gap-2">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            Follow-ups do dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Sem pendências hoje. Você está em dia! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Follow-ups do dia
          <Badge variant="secondary" className="ml-auto">
            {followups.length}
          </Badge>
        </CardTitle>
        <CardDescription>Contatos aguardando seu retorno</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {followups.map((item) => (
          <FollowupCard
            key={item.id}
            item={item}
            onDone={() => markDone(item.id)}
            onSnooze={() => snooze({ contactId: item.id, hours: 24 })}
            onCopyRoteiro={() => handleCopyRoteiro(item)}
            onWhatsApp={() => handleWhatsAppClick(item)}
            isLoading={isMarkingDone || isSnoozing}
            getKindIcon={getKindIcon}
          />
        ))}

        {followups.length >= maxItems && (
          <Button variant="outline" className="w-full" asChild>
            <Link to="/voluntario/crm">
              Ver todos os contatos
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface FollowupCardProps {
  item: FollowupItem;
  onDone: () => void;
  onSnooze: () => void;
  onCopyRoteiro: () => void;
  onWhatsApp: () => void;
  isLoading: boolean;
  getKindIcon: (kind: string) => React.ReactNode;
}

function FollowupCard({
  item,
  onDone,
  onSnooze,
  onCopyRoteiro,
  onWhatsApp,
  isLoading,
  getKindIcon,
}: FollowupCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className={`p-1.5 rounded-full ${
            FOLLOWUP_KIND_COLORS[item.kind] || FOLLOWUP_KIND_COLORS.followup
          }`}
        >
          {getKindIcon(item.kind)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.nome_curto}</p>
          {item.bairro && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.bairro}
            </p>
          )}
        </div>
        <Badge className={FOLLOWUP_KIND_COLORS[item.kind] || FOLLOWUP_KIND_COLORS.followup}>
          {FOLLOWUP_KIND_LABELS[item.kind] || "Follow-up"}
        </Badge>
      </div>

      {/* Context info (collapsed by default) */}
      {item.context?.outcome && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "▼" : "▶"} Última interação: {item.context.outcome}
        </button>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onCopyRoteiro}
          disabled={isLoading}
          className="flex-1"
        >
          <Copy className="h-4 w-4 mr-1" />
          Copiar roteiro
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onWhatsApp}
          disabled={isLoading}
          className="flex-1 text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onSnooze}
          disabled={isLoading}
          className="flex-1"
        >
          <Clock className="h-4 w-4 mr-1" />
          Adiar 24h
        </Button>
        <Button size="sm" onClick={onDone} disabled={isLoading} className="flex-1">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Concluído
        </Button>
      </div>
    </div>
  );
}
