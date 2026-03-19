/**
 * PilotTrackCard - 4-step funnel card for /voluntario/hoje
 *
 * Always shows ONE dominant CTA based on current step:
 * 1) Check-in  2) Missão do dia  3) Compartilhar material  4) Convite +1
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Rocket,
  CalendarCheck,
  Target,
  Share2,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { usePilotMode } from "@/hooks/usePilotMode";
import { useTodayMission } from "@/hooks/useTodayMission";
import { usePersonalInviteCode } from "@/hooks/usePersonalInviteCode";

export function PilotTrackCard() {
  const navigate = useNavigate();
  const {
    showPilotTrack,
    currentStep,
    step1Done,
    step2Done,
    step3Done,
    step4Done,
    stepsCompleted,
    markInviteSent,
  } = usePilotMode();

  const { recommendedMission } = useTodayMission();
  const { inviteLink } = usePersonalInviteCode();

  if (!showPilotTrack) return null;

  const progressPercent = (stepsCompleted / 4) * 100;

  const steps = [
    { num: 1, label: "Check-in", done: step1Done, icon: CalendarCheck },
    { num: 2, label: "Missão do dia", done: step2Done, icon: Target },
    { num: 3, label: "Compartilhar", done: step3Done, icon: Share2 },
    { num: 4, label: "Convide +1", done: step4Done, icon: UserPlus },
  ] as const;

  const handleCTA = () => {
    if (currentStep === 1) {
      const el = document.getElementById("checkin-form");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (currentStep === 2) {
      if (recommendedMission) {
        navigate(`/voluntario/runner/${recommendedMission.id}`);
      } else {
        navigate("/voluntario/missoes");
      }
    } else if (currentStep === 3) {
      // Navigate to base with auto-share flag
      navigate("/voluntario/base?pilot_share=1");
    } else {
      // Step 4: open WhatsApp with invite
      if (inviteLink) {
        import("@/lib/shareUtils").then(({ openWhatsAppShare }) => {
          const msg = `🔥 Entre no movimento! ${inviteLink}`;
          openWhatsAppShare(msg);
        });
        markInviteSent();
      } else {
        navigate("/voluntario/convite");
      }
    }
  };

  const ctaLabels: Record<number, string> = {
    1: "Fazer check-in",
    2: "Começar missão do dia",
    3: "Compartilhar 1 material",
    4: "Convidar +1 pessoa",
  };

  const ctaIcons: Record<number, React.ReactNode> = {
    1: <CalendarCheck className="h-5 w-5 mr-2" />,
    2: <Target className="h-5 w-5 mr-2" />,
    3: <Share2 className="h-5 w-5 mr-2" />,
    4: <ExternalLink className="h-5 w-5 mr-2" />,
  };

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-transparent shadow-md">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm">Trilha do Piloto</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {stepsCompleted}/4
          </span>
        </div>

        {/* Progress */}
        <Progress value={progressPercent} className="h-2" />

        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((s) => {
            const Icon = s.done ? CheckCircle2 : Circle;
            const isActive = s.num === currentStep;
            return (
              <div
                key={s.num}
                className={`flex flex-col items-center gap-1 flex-1 ${
                  s.done
                    ? "text-primary"
                    : isActive
                    ? "text-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    s.done ? "fill-primary/20" : ""
                  }`}
                />
                <span className="text-[11px] font-medium text-center leading-tight">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Dominant CTA */}
        <Button
          size="lg"
          className="w-full text-base font-bold"
          onClick={handleCTA}
        >
          {ctaIcons[currentStep]}
          {ctaLabels[currentStep]}
        </Button>
      </CardContent>
    </Card>
  );
}
