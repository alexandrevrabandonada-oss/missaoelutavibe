/**
 * PostMissionImpact - Pilot-mode auto-funnel after mission completion.
 *
 * Phases:
 *  1. "share" — Share a material (opens inline share UI)
 *  2. "invite" — Invite +1 (WhatsApp with invite code)
 *  3. "done"   — Day closed, no more big CTAs
 *
 * Non-pilot fallback: shows all CTAs at once (legacy).
 *
 * ALL links use buildShareUrl/buildInviteShareUrl for consistent ref= tracking.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  UserPlus,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
  PartyPopper,
  ArrowRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { usePersonalInviteCode } from "@/hooks/usePersonalInviteCode";
import { useAuth } from "@/hooks/useAuth";
import { usePilotMode, markMaterialSharedToday } from "@/hooks/usePilotMode";
import {
  buildInviteShareUrl,
  buildMissionShareMessage,
  buildInviteMessage,
  openWhatsAppShare,
  copyToClipboard,
} from "@/lib/shareUtils";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

type PilotPhase = "share" | "invite" | "done";

interface PostMissionImpactProps {
  mission: Mission;
  onReset: () => void;
}

export function PostMissionImpact({ mission, onReset }: PostMissionImpactProps) {
  const navigate = useNavigate();
  const { inviteLink, copyLink } = useInviteLoop();
  const { inviteCode: personalCode, inviteLink: personalLink } = usePersonalInviteCode();
  const { user } = useAuth();
  const { isPilotMode, step3Done, step4Done, markInviteSent } = usePilotMode();

  // Use personal code for ref; fallback to invite loop
  const effectiveCode = personalCode || null;
  const effectiveLink = personalLink || inviteLink;

  // Determine initial phase based on already-completed steps
  const getInitialPhase = (): PilotPhase => {
    if (!isPilotMode) return "share";
    if (!step3Done) return "share";
    if (!step4Done) return "invite";
    return "done";
  };

  const [phase, setPhase] = useState<PilotPhase>(getInitialPhase);
  const [inviteSentLocal, setInviteSentLocal] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Share Material phase handlers ---
  const handleShareMaterialWhatsApp = useCallback(() => {
    const metaMsg = (mission as any).meta_json?.share_message as string | undefined;
    const shareText = buildMissionShareMessage(metaMsg, effectiveCode);
    openWhatsAppShare(shareText);
    if (user?.id) markMaterialSharedToday(user.id);
    setTimeout(() => setPhase("invite"), 500);
  }, [mission, effectiveCode, user?.id]);

  const handleCopyMaterial = useCallback(async () => {
    const metaMsg = (mission as any).meta_json?.share_message as string | undefined;
    const shareText = buildMissionShareMessage(metaMsg, effectiveCode);
    const ok = await copyToClipboard(shareText);
    if (ok) {
      toast.success("Copiado!");
      if (user?.id) markMaterialSharedToday(user.id);
      setTimeout(() => setPhase("invite"), 800);
    } else {
      toast.error("Não foi possível copiar");
    }
  }, [mission, effectiveCode, user?.id]);

  // --- Invite phase handlers ---
  const handleInviteWhatsApp = useCallback(() => {
    const msg = buildInviteMessage(effectiveCode);
    openWhatsAppShare(msg);
    markInviteSent();
    setInviteSentLocal(true);
    setTimeout(() => setPhase("done"), 500);
  }, [effectiveCode, markInviteSent]);

  const handleAlreadySent = useCallback(() => {
    markInviteSent();
    setInviteSentLocal(true);
    setPhase("done");
  }, [markInviteSent]);

  // ============ PHASE: SHARE MATERIAL ============
  if (isPilotMode && phase === "share") {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-background">
        <div className="flex-1 flex flex-col items-center animate-slide-up">
          <div className="h-20 w-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 mt-8">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">Missão concluída!</h1>
          <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
            Agora compartilhe com sua rede para multiplicar o impacto
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground font-bold">1</span>
            <span className="font-medium text-foreground">Compartilhar</span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 rounded-full bg-muted">2</span>
            <span>Convidar</span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 rounded-full bg-muted">3</span>
            <span>Fechar dia</span>
          </div>

          <div className="w-full max-w-md">
            <Card className="border-primary/30">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Share2 className="h-5 w-5" />
                  <span className="font-bold text-lg">Compartilhar material</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Envie para 1 pessoa ou grupo no WhatsApp
                </p>
                <Button onClick={handleShareMaterialWhatsApp} className="w-full" size="lg">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Enviar pelo WhatsApp
                </Button>
                <Button variant="outline" onClick={handleCopyMaterial} className="w-full">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar texto
                </Button>
              </CardContent>
            </Card>
          </div>

          <Button variant="ghost" onClick={() => setPhase("invite")} className="mt-4 text-muted-foreground">
            Pular →
          </Button>
        </div>
      </div>
    );
  }

  // ============ PHASE: INVITE +1 ============
  if (isPilotMode && phase === "invite") {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-background">
        <div className="flex-1 flex flex-col items-center animate-slide-up">
          <div className="h-20 w-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 mt-8">
            <UserPlus className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">Convide +1 pessoa</h1>
          <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
            Cada convite multiplica o impacto do movimento
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-full bg-primary/20 text-primary">
              <Check className="h-3 w-3" />
            </span>
            <span>Compartilhar</span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground font-bold">2</span>
            <span className="font-medium text-foreground">Convidar</span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 rounded-full bg-muted">3</span>
            <span>Fechar dia</span>
          </div>

          <div className="w-full max-w-md">
            <Card className="border-primary/30">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <UserPlus className="h-5 w-5" />
                  <span className="font-bold text-lg">CONVIDAR +1</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Envie seu link pessoal para alguém que pode somar
                </p>
                <Button onClick={handleInviteWhatsApp} className="w-full" size="lg">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Enviar convite pelo WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    copyLink();
                  }}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar link do convite
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleAlreadySent}
                  className="w-full text-muted-foreground"
                >
                  Já enviei →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ============ PHASE: DAY DONE ============
  if (isPilotMode && phase === "done") {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-background">
        <div className="flex-1 flex flex-col items-center justify-center animate-slide-up">
          <div className="h-24 w-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-6">
            <PartyPopper className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Dia fechado! 🎉</h1>
          <p className="text-muted-foreground text-center text-sm mb-8 max-w-xs">
            Você completou missão, compartilhou e convidou. Impacto real, todo dia.
          </p>

          {/* Step indicator - all done */}
          <div className="flex items-center gap-2 mb-8 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-full bg-primary/20 text-primary">
              <Check className="h-3 w-3" />
            </span>
            <span>Missão</span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 rounded-full bg-primary/20 text-primary">
              <Check className="h-3 w-3" />
            </span>
            <span>Compartilhar</span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 rounded-full bg-primary/20 text-primary">
              <Check className="h-3 w-3" />
            </span>
            <span>Convidar</span>
          </div>

          <Button onClick={onReset} size="lg">
            <Sparkles className="h-5 w-5 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  // ============ NON-PILOT FALLBACK (legacy) ============

  const shareMessage = buildMissionShareMessage(null, effectiveCode);
  const inviteMsg = buildInviteMessage(effectiveCode);

  const handleCopyLegenda = async () => {
    const ok = await copyToClipboard(shareMessage);
    if (ok) {
      setCopied(true);
      toast.success("Legenda copiada!");
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error("Não foi possível copiar");
    }
  };

  const handleShareWhatsApp = () => {
    openWhatsAppShare(shareMessage);
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background">
      <div className="flex-1 flex flex-col items-center animate-slide-up">
        <div className="h-20 w-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 mt-8">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">Ação concluída!</h1>
        <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
          Excelente trabalho com "{mission.title}". Agora amplie seu impacto:
        </p>

        <div className="w-full max-w-md space-y-4">
          {/* Share */}
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Share2 className="h-5 w-5" />
                <span className="font-semibold">Compartilhar seu impacto</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={handleShareWhatsApp} className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={handleCopyLegenda} className="flex-1">
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? "Copiado!" : "Legenda"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invite */}
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <UserPlus className="h-5 w-5" />
                <span className="font-semibold">CONVIDAR +1</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyLink()} className="flex-1">
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar convite
                </Button>
                <Button
                  size="sm"
                  onClick={() => openWhatsAppShare(inviteMsg)}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button variant="ghost" onClick={onReset} className="mt-6">
          <Sparkles className="h-4 w-4 mr-2" />
          Fazer outra ação
        </Button>
      </div>
    </div>
  );
}
