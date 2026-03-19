/**
 * PostCompletionCTAs - CTAs shown after completing an action
 * 
 * "CONVIDAR +1" and "SALVAR 1 CONTATO"
 * Transforms completion into further engagement.
 * ALL links use shareUtils for consistent ref= tracking.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  UserPlus,
  Phone,
  Copy,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { focusRingClass } from "@/utils/a11y";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { usePersonalInviteCode } from "@/hooks/usePersonalInviteCode";
import { useQuickAddContact } from "@/hooks/useQuickAddContact";
import { QuickAddContactModal } from "@/components/crm/QuickAddContactModal";
import { useDailyAction } from "@/hooks/useDailyAction";
import {
  buildInviteMessage,
  openWhatsAppShare,
  copyToClipboard,
} from "@/lib/shareUtils";

interface PostCompletionCTAsProps {
  onReset: () => void;
}

export function PostCompletionCTAs({ onReset }: PostCompletionCTAsProps) {
  const { copyLink } = useInviteLoop();
  const { inviteCode: personalCode, inviteLink: personalLink } = usePersonalInviteCode();
  const quickAdd = useQuickAddContact();
  const { trackInviteClicked, trackInviteShared, trackContactAdded } = useDailyAction();
  const [copied, setCopied] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const effectiveCode = personalCode || null;
  const hasLink = !!personalLink;
  const inviteText = buildInviteMessage(effectiveCode);

  const handleCopyInvite = async () => {
    if (!hasLink) return;
    const ok = await copyToClipboard(inviteText);
    if (ok) {
      setCopied(true);
      toast.success("Texto copiado!");
      trackInviteClicked();
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error("Não foi possível copiar");
    }
  };

  const handleShareWhatsApp = () => {
    if (!hasLink) return;
    openWhatsAppShare(inviteText);
    trackInviteShared();
  };

  const handleOpenQuickAdd = () => {
    setIsQuickAddOpen(true);
    trackContactAdded();
  };

  return (
    <>
      <Card className="border-green-500/50 bg-gradient-to-br from-green-500/10 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
            Ação concluída!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Excelente trabalho! Agora, que tal ampliar seu impacto?
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Invite CTA */}
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <UserPlus className="h-5 w-5" />
                  <span className="font-semibold">CONVIDAR +1</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Traga mais uma pessoa para o movimento
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyInvite}
                    className={`flex-1 ${focusRingClass()}`}
                    disabled={!hasLink}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleShareWhatsApp}
                    className={`flex-1 ${focusRingClass()}`}
                    disabled={!hasLink}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contact CTA */}
            <Card className="border-green-500/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Phone className="h-5 w-5" />
                  <span className="font-semibold">SALVAR 1 CONTATO</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cadastre alguém que conheceu hoje
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleOpenQuickAdd}
                  className={`w-full ${focusRingClass()}`}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Cadastrar contato
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Continue button */}
          <Button
            variant="ghost"
            onClick={onReset}
            className={`w-full ${focusRingClass()}`}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Fazer outra ação
          </Button>
        </CardContent>
      </Card>

      {/* Quick Add Contact Modal */}
      <QuickAddContactModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        origem="manual"
        context={{}}
      />
    </>
  );
}
