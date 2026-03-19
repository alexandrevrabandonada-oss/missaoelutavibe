/**
 * MissionRunner - Focused execution screen for a mission.
 *
 * Type-aware CTA logic:
 *   - mobilizacao/conversa → No evidence, primary CTA = "Abrir WhatsApp" with ready message
 *   - rua/dados           → Evidence required
 *   - others              → Evidence optional (light complete + evidence option)
 *
 * Always shows "Como fazer" bullets.
 * Shows "Mensagem pronta" section when share_message exists.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  Camera,
  Clock,
  ListChecks,
  Target,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { resolveTemplate } from "@/lib/missionTemplate";
import { useDailyCheckin } from "@/hooks/useCadencia";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalInviteCode } from "@/hooks/usePersonalInviteCode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

const TYPE_LABELS: Record<string, string> = {
  escuta: "Escuta",
  rua: "Rua",
  mobilizacao: "Mobilização",
  conteudo: "Conteúdo",
  dados: "Dados",
  formacao: "Formação",
  conversa: "Conversa",
  crm: "CRM",
  geral: "Geral",
};

// Types that never require evidence and use WhatsApp CTA
const WHATSAPP_TYPES = new Set(["mobilizacao", "conversa"]);
// Types that always require evidence
const EVIDENCE_REQUIRED_TYPES = new Set(["rua", "dados"]);

interface MissionRunnerProps {
  mission: Mission;
  onComplete: (note?: string) => void;
  onCancel: () => void;
}

export function MissionRunner({ mission, onComplete, onCancel }: MissionRunnerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { todayCheckin } = useDailyCheckin();
  const { inviteLink } = usePersonalInviteCode();
  const [quickNote, setQuickNote] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const template = useMemo(
    () => resolveTemplate(mission, todayCheckin?.disponibilidade ?? null),
    [mission, todayCheckin],
  );

  const meta = mission.meta_json as {
    estimated_min?: number;
    evidence?: { required?: boolean };
    [k: string]: unknown;
  } | null;

  const estimatedMin = template.resolved_minutes ?? meta?.estimated_min ?? null;

  // Type-based CTA logic
  const isWhatsAppType = WHATSAPP_TYPES.has(mission.type);
  const isEvidenceRequired = EVIDENCE_REQUIRED_TYPES.has(mission.type) || 
    (!isWhatsAppType && meta?.evidence?.required === true);

  // Build the WhatsApp message
  const whatsAppMessage = useMemo(() => {
    if (template.share_message) return template.share_message;
    // Fallback: mission title + invite link
    return `🔥 ${mission.title}${inviteLink ? `\n\n👉 ${inviteLink}` : ""}`;
  }, [template.share_message, mission.title, inviteLink]);

  // Append invite link if not already in message
  const whatsAppMessageWithLink = useMemo(() => {
    if (!inviteLink || whatsAppMessage.includes(inviteLink)) return whatsAppMessage;
    return `${whatsAppMessage}\n\n👉 ${inviteLink}`;
  }, [whatsAppMessage, inviteLink]);

  const handleCopyMessage = async () => {
    const { copyToClipboard } = await import("@/lib/shareUtils");
    const ok = await copyToClipboard(whatsAppMessageWithLink);
    if (ok) {
      setCopied(true);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Erro ao copiar");
    }
  };

  const handleOpenWhatsApp = () => {
    import("@/lib/shareUtils").then(({ openWhatsAppShare }) =>
      openWhatsAppShare(whatsAppMessageWithLink)
    );
  };

  // Complete without evidence
  const handleLightComplete = async () => {
    if (!user?.id) return;
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("missions")
        .update({
          assigned_to: user.id,
          status: "concluida" as any,
        })
        .eq("id", mission.id);
      if (error) throw error;
      toast.success("Missão concluída!");
      onComplete(quickNote.trim() || undefined);
    } catch (err) {
      console.error("Error completing mission:", err);
      toast.error("Erro ao concluir missão");
    } finally {
      setIsCompleting(false);
    }
  };

  // Complete via WhatsApp (open WA + mark complete)
  const handleWhatsAppComplete = async () => {
    handleOpenWhatsApp();
    await handleLightComplete();
  };

  // Navigate to evidence page
  const handleWithEvidence = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from("missions")
        .update({ assigned_to: user.id, status: "em_andamento" as any })
        .eq("id", mission.id);
    } catch {
      // best-effort
    }
    navigate(`/voluntario/evidencia/${mission.id}`, {
      state: { prefillNote: quickNote.trim() },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{mission.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs">
              {TYPE_LABELS[mission.type] || mission.type}
            </Badge>
            {estimatedMin && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />~{estimatedMin}min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-5">
        {/* Como fazer — always shown */}
        {template.como_fazer.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Como fazer
              </h2>
            </div>
            <ul className="space-y-2.5">
              {template.como_fazer.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <span className="font-bold text-primary shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Fallback: description if no como_fazer */}
        {template.como_fazer.length === 0 && mission.description && (
          <section className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {mission.description}
            </p>
          </section>
        )}

        {/* Mensagem pronta — shown for WhatsApp types or when share_message exists */}
        {(isWhatsAppType || template.share_message) && (
          <ReadyMessageSection
            message={whatsAppMessageWithLink}
            copied={copied}
            onCopy={handleCopyMessage}
            onWhatsApp={handleOpenWhatsApp}
          />
        )}

        {/* Quick Note */}
        <section>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">
            Registro rápido (opcional)
          </label>
          <Textarea
            placeholder="O que você fez / aprendeu — 1 frase"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </section>
      </div>

      {/* Footer CTAs — type-aware hierarchy */}
      <div className="p-4 border-t space-y-3 bg-background safe-bottom">
        {isWhatsAppType ? (
          /* Mobilização/Convite: WhatsApp is primary, no evidence */
          <>
            <Button
              size="lg"
              onClick={handleWhatsAppComplete}
              disabled={isCompleting}
              className="w-full text-base font-bold"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              {isCompleting ? "Concluindo…" : "ABRIR WHATSAPP E CONCLUIR"}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={handleLightComplete}
              disabled={isCompleting}
              className="w-full text-sm text-muted-foreground"
            >
              Já fiz por conta própria
            </Button>
          </>
        ) : isEvidenceRequired ? (
          /* Rua/Dados: Evidence is primary */
          <>
            <Button
              size="lg"
              onClick={handleWithEvidence}
              className="w-full text-base font-bold"
            >
              <Camera className="h-5 w-5 mr-2" />
              CONCLUIR COM EVIDÊNCIA
            </Button>
          </>
        ) : (
          /* Others: Light complete primary, evidence secondary */
          <>
            <Button
              size="lg"
              onClick={handleLightComplete}
              disabled={isCompleting}
              className="w-full text-base font-bold"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {isCompleting ? "Concluindo…" : "CONCLUIR"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleWithEvidence}
              className="w-full text-sm"
            >
              <Camera className="h-5 w-5 mr-2" />
              Concluir com evidência
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** "Mensagem pronta" inline section with copy + WhatsApp buttons */
function ReadyMessageSection({
  message,
  copied,
  onCopy,
  onWhatsApp,
}: {
  message: string;
  copied: boolean;
  onCopy: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Mensagem pronta
        </h2>
      </div>
      <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
        <p className="text-sm whitespace-pre-wrap">{message}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            className="flex-1"
          >
            {copied ? (
              <Check className="h-4 w-4 mr-1" />
            ) : (
              <Copy className="h-4 w-4 mr-1" />
            )}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onWhatsApp}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
}
