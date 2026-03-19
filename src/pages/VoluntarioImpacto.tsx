/**
 * VoluntarioImpacto - Impact metrics page for volunteers
 * 
 * Shows 3 key metrics, weekly goal, info sheet, and 2 CTAs.
 * Keeps it simple to avoid "analytics dashboard" syndrome.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { VoluntarioNavBar } from "@/components/navigation/VoluntarioNavBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useImpactMetrics } from "@/hooks/useImpactMetrics";
import { ImpactShareModal } from "@/components/impact/ImpactShareModal";
import { ImpactInfoSheet } from "@/components/impact/ImpactInfoSheet";
import {
  Zap,
  Users,
  Share2,
  TrendingUp,
  ArrowLeft,
  Info,
  Download,
  Flame,
  UserPlus,
} from "lucide-react";

export default function VoluntarioImpacto() {
  const navigate = useNavigate();
  const {
    metrics,
    isLoading,
    trackShareOpened,
    trackShared,
    trackCtaClicked,
    trackInfoOpened,
  } = useImpactMetrics(7);

  const [shareOpen, setShareOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const handleAgirAgora = () => {
    trackCtaClicked("agir_agora");
    navigate("/voluntario/hoje");
  };

  const handleConvidar = () => {
    trackCtaClicked("convidar");
    navigate("/voluntario/convite");
  };

  const handleInfoOpen = () => {
    trackInfoOpened();
    setInfoOpen(true);
  };

  // Goal progress dots
  const renderGoalDots = () => {
    const dots = [];
    for (let i = 0; i < metrics.goal_target; i++) {
      dots.push(
        <span
          key={i}
          className={`inline-block w-3 h-3 rounded-full mr-1 ${
            i < metrics.goal_progress ? "bg-primary" : "bg-muted"
          }`}
        />
      );
    }
    return dots;
  };

  const getGoalMessage = () => {
    const remaining = metrics.goal_target - metrics.goal_progress;
    if (remaining <= 0) {
      return "🎉 Meta batida! Continua assim!";
    }
    if (remaining === 1) {
      return "Falta 1 ação pra bater a meta";
    }
    return `Faltam ${remaining} ações pra bater a meta`;
  };

  return (
    <>
      <AppShell>
        <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/voluntario/eu">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">Meu Impacto</h1>
              <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : (
              <>
                {/* Actions */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-3xl font-black">{metrics.actions_completed}</p>
                        <p className="text-sm text-muted-foreground">ações concluídas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contacts */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-3xl font-black">{metrics.contacts_added}</p>
                        <p className="text-sm text-muted-foreground">contatos salvos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Invites */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Share2 className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-3xl font-black">{metrics.invites_shared}</p>
                        <p className="text-sm text-muted-foreground">convites enviados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Weekly Goal */}
          {!isLoading && (
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Flame className="h-5 w-5 text-primary" />
                  <p className="font-bold text-sm">{metrics.goal_label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex">{renderGoalDots()}</div>
                  <p className="text-sm text-muted-foreground">{getGoalMessage()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Button */}
          <button
            onClick={handleInfoOpen}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Info className="h-4 w-4" />
            <span>Como isso vira voto? Entenda em 20s</span>
          </button>

          {/* CTAs */}
          <div className="space-y-3 pt-4">
            <Button onClick={handleAgirAgora} className="w-full" size="lg">
              <TrendingUp className="h-5 w-5 mr-2" />
              AGIR AGORA
            </Button>
            <Button onClick={handleConvidar} variant="outline" className="w-full" size="lg">
              <UserPlus className="h-5 w-5 mr-2" />
              CONVIDAR +1
            </Button>
          </div>

          {/* Share Button */}
          <div className="pt-2">
            <Button
              variant="ghost"
              onClick={() => setShareOpen(true)}
              className="w-full text-muted-foreground"
            >
              <Download className="h-4 w-4 mr-2" />
              Compartilhar meu Impacto
            </Button>
          </div>
        </div>
      </AppShell>
      <VoluntarioNavBar />

      {/* Share Modal */}
      <ImpactShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        data={{
          actionsCompleted: metrics.actions_completed,
          contactsAdded: metrics.contacts_added,
          invitesShared: metrics.invites_shared,
          windowDays: metrics.window_days,
        }}
        onShareOpened={trackShareOpened}
        onShared={trackShared}
      />

      {/* Info Sheet */}
      <ImpactInfoSheet open={infoOpen} onOpenChange={setInfoOpen} />
    </>
  );
}
