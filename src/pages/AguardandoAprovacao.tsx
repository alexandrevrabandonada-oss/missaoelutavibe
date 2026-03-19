/**
 * AguardandoAprovacao — Pilot Mini-Funnel
 *
 * While waiting for approval, users can:
 *  Step A: Compartilhar 1 material (WhatsApp ready text)
 *  Step B: Convidar +1 (WhatsApp with invite link)
 *
 * Polling every 20s. On approval → redirect to /voluntario/hoje?open_checkin=1
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import {
  Clock,
  AlertCircle,
  RefreshCw,
  LogOut,
  Share2,
  UserPlus,
  CheckCircle2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { INVITE_CONFIG } from "@/lib/inviteConfig";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 20_000;
import { PUBLISHED_URL } from "@/lib/shareUtils";

// localStorage keys scoped to user
const WAITING_KEY = "waiting_funnel_v1";

interface WaitingState {
  date: string;
  materialShared: boolean;
  inviteSent: boolean;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function readWaitingState(userId: string): WaitingState {
  try {
    const raw = localStorage.getItem(`${WAITING_KEY}:${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as WaitingState;
      if (parsed.date === todayStr()) return parsed;
    }
  } catch {}
  return { date: todayStr(), materialShared: false, inviteSent: false };
}

function writeWaitingState(userId: string, state: WaitingState) {
  localStorage.setItem(`${WAITING_KEY}:${userId}`, JSON.stringify(state));
}

// ─── Ready-to-share material text ───
const SHARE_MATERIAL_TEXT = `📢 Conheça o Missão ÉLuta!

Plataforma de organização política e social — voluntariado com missões práticas em 10 min.

👉 Saiba mais: ${PUBLISHED_URL}

#ÉLUTA — Escutar • Cuidar • Organizar`;

export default function AguardandoAprovacao() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { volunteerStatus, isStatusLoading, rejectionReason } = useVolunteerStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [secondsSinceCheck, setSecondsSinceCheck] = useState(0);

  // Funnel state
  const [materialShared, setMaterialShared] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Load persisted state
  useEffect(() => {
    if (!user?.id) return;
    const s = readWaitingState(user.id);
    setMaterialShared(s.materialShared);
    setInviteSent(s.inviteSent);
  }, [user?.id]);

  // Timer for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceCheck(Math.floor((Date.now() - lastCheck.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastCheck]);

  // Polling every 20s
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["volunteer-status", user.id] });
      setLastCheck(new Date());
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.id, queryClient]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["volunteer-status", user?.id] });
    setLastCheck(new Date());
  }, [queryClient, user?.id]);

  // Redirect logic
  useEffect(() => {
    if (authLoading || isStatusLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (volunteerStatus === "ativo") {
      navigate("/voluntario/hoje?open_checkin=1", { replace: true });
    }
  }, [user, volunteerStatus, authLoading, isStatusLoading, navigate]);

  // ─── Actions ───

  const handleShareMaterial = useCallback(() => {
    import("@/lib/shareUtils").then(({ openWhatsAppShare }) => {
      openWhatsAppShare(SHARE_MATERIAL_TEXT);
    });

    if (user?.id) {
      const s = readWaitingState(user.id);
      s.materialShared = true;
      writeWaitingState(user.id, s);
      setMaterialShared(true);
    }
    toast.success("Material compartilhado! 🎉");
  }, [user?.id]);

  const handleCopyMaterial = useCallback(async () => {
    const { copyToClipboard } = await import("@/lib/shareUtils");
    await copyToClipboard(SHARE_MATERIAL_TEXT);

    if (user?.id) {
      const s = readWaitingState(user.id);
      s.materialShared = true;
      writeWaitingState(user.id, s);
      setMaterialShared(true);
    }
    toast.success("Texto copiado! Cole no WhatsApp 📋");
  }, [user?.id]);

  const handleInvite = useCallback(() => {
    import("@/lib/shareUtils").then(({ buildInviteMessage, openWhatsAppShare }) => {
      openWhatsAppShare(buildInviteMessage(null));
    });

    if (user?.id) {
      const s = readWaitingState(user.id);
      s.inviteSent = true;
      writeWaitingState(user.id, s);
      setInviteSent(true);
    }
    toast.success("Convite enviado! 💪");
  }, [user?.id]);

  // ─── Derived ───

  const isPending = volunteerStatus === "pendente";
  const isRejected = volunteerStatus === "recusado";

  const stepsCompleted = (materialShared ? 1 : 0) + (inviteSent ? 1 : 0);

  // Determine dominant CTA phase
  const dominantPhase: "share" | "invite" | "done" = useMemo(() => {
    if (!materialShared) return "share";
    if (!inviteSent) return "invite";
    return "done";
  }, [materialShared, inviteSent]);

  // ─── Loading / Guards ───

  if (authLoading || isStatusLoading) {
    return <FullPageLoader text="Verificando status..." />;
  }
  if (!user) {
    return <FullPageLoader text="Redirecionando..." />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <Logo size="lg" className="mb-6" />

      <Card className="max-w-md w-full border-border/60">
        <CardContent className="pt-6 space-y-5">
          {/* Status badge */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              {isPending ? (
                <Clock className="h-7 w-7 text-primary animate-pulse" />
              ) : (
                <AlertCircle className="h-7 w-7 text-destructive" />
              )}
            </div>

            <Badge
              variant="outline"
              className={
                isPending
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 px-4 py-1"
                  : "bg-destructive/10 text-destructive border-destructive/20 px-4 py-1"
              }
            >
              {isPending ? "Pendente" : "Recusado"}
            </Badge>

            <p className="text-sm text-muted-foreground">
              {isPending
                ? "A coordenação está analisando seu cadastro. Tempo estimado: até 48h."
                : "Seu cadastro não foi aprovado."}
            </p>

            {isRejected && rejectionReason && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-left">
                <p className="text-sm text-destructive">
                  <strong>Motivo:</strong> {rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Mini-funnel — only for pending users */}
          {isPending && (
            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(stepsCompleted / 2) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {stepsCompleted}/2
                </span>
              </div>

              {dominantPhase === "done" ? (
                /* All done — celebration */
                <div className="text-center py-4 space-y-2">
                  <Sparkles className="h-8 w-8 text-primary mx-auto" />
                  <p className="font-bold text-foreground">Você já está fazendo a diferença!</p>
                  <p className="text-sm text-muted-foreground">
                    Continue aguardando a aprovação. Quando ativado, você será redirecionado automaticamente.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground text-center">
                    Enquanto aguarda, comece a fazer a diferença:
                  </p>

                  {/* Step A — Compartilhar material */}
                  <div
                    className={`rounded-lg border p-4 space-y-3 transition-all ${
                      dominantPhase === "share"
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/40 bg-muted/30 opacity-80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {materialShared ? (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <Share2 className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm">
                        {materialShared ? "Material compartilhado ✓" : "Compartilhar 1 material"}
                      </span>
                    </div>

                    {!materialShared && (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleShareMaterial}
                          className="flex-1"
                          size="sm"
                        >
                          <MessageCircle className="h-4 w-4 mr-1.5" />
                          WhatsApp
                        </Button>
                        <Button
                          onClick={handleCopyMaterial}
                          variant="outline"
                          size="sm"
                        >
                          Copiar
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Step B — Convidar +1 */}
                  <div
                    className={`rounded-lg border p-4 space-y-3 transition-all ${
                      dominantPhase === "invite"
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/40 bg-muted/30 opacity-80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {inviteSent ? (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <UserPlus className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm">
                        {inviteSent ? "Convite enviado ✓" : "Convidar +1 pessoa"}
                      </span>
                    </div>

                    {!inviteSent && (
                      <Button
                        onClick={handleInvite}
                        className="w-full"
                        size="sm"
                        variant={dominantPhase === "invite" ? "default" : "outline"}
                      >
                        <MessageCircle className="h-4 w-4 mr-1.5" />
                        Enviar convite pelo WhatsApp
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Polling info */}
          <div className="bg-muted/40 rounded-lg p-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Próxima verificação: {Math.max(0, 20 - secondsSinceCheck)}s</span>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-7 px-2">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Verificar agora
            </Button>
          </div>

          {/* Secondary actions */}
          <div className="flex flex-col gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(INVITE_CONFIG.getWhatsAppUrl(), "_blank")}
              className="w-full text-muted-foreground"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com a coordenação
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="w-full text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="signature-luta mt-10">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}
