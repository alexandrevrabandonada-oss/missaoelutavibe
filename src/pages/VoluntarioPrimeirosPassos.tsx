import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useOnboardingSteps } from "@/hooks/useOnboardingSteps";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useUserCells } from "@/hooks/useUserCells";
import { useMissions } from "@/hooks/useMissions";
import { useMyCRMMissions } from "@/hooks/useCRMMissions";
import { InviteLoopCard } from "@/components/invite/InviteLoopCard";
import { AccessibilityPreferencesCard } from "@/components/a11y/AccessibilityPreferencesCard";
import { useOnboardingPrefs } from "@/hooks/useOnboardingPrefs";
import { OnboardingPrefsForm } from "@/components/onboarding/OnboardingPrefsForm";
import { RecommendedPathCard } from "@/components/onboarding/RecommendedPathCard";
import { FirstActionCard } from "@/components/activation/FirstActionCard";
import { CityCellWizard } from "@/components/onboarding/CityCellWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import {
  CheckCircle2,
  Circle,
  MapPin,
  CalendarCheck,
  Target,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Users,
  Home,
} from "lucide-react";
import { toast } from "sonner";

interface StepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  isDone: boolean;
  isActive: boolean;
  children?: React.ReactNode;
}

function StepCard({ stepNumber, title, description, isDone, isActive, children }: StepCardProps) {
  return (
    <Card className={`transition-all ${isActive ? "ring-2 ring-primary" : ""} ${isDone ? "bg-muted/30" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          {isDone ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className={`h-6 w-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          )}
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Passo {stepNumber}</span>
              {title}
              {isDone && <Badge variant="secondary" className="text-xs">Concluído</Badge>}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

export default function VoluntarioPrimeirosPassos() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { status, isLoading: onboardingLoading, markStepDone, isMarkingStep } = useOnboardingSteps();
  const { isLoading: approvalLoading, isApproved } = useRequireApproval();
  const { userCells } = useUserCells();
  const { missions } = useMissions();
  const { missions: crmMissions } = useMyCRMMissions();
  const { hasPrefs, savePrefs, isSaving, prefs } = useOnboardingPrefs();
  const [showPrefsForm, setShowPrefsForm] = useState(false);

  // Redirect if not authenticated or not approved
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!approvalLoading && !isApproved && user) {
      navigate("/aguardando-aprovacao");
    }
  }, [approvalLoading, isApproved, user, navigate]);

  const isLoading = authLoading || profileLoading || onboardingLoading || approvalLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  // FIRST: City/Cell selection wizard (if city_id not set)
  if (!profile.city_id) {
    return <CityCellWizard />;
  }

  const stepsCompleted = status?.steps_completed || 0;
  const progressPercent = (stepsCompleted / 4) * 100;

  // Get active step (first incomplete required step)
  const getActiveStep = () => {
    if (!status?.step1_done) return 1;
    if (!status?.step2_done) return 2;
    if (!status?.step3_done) return 3;
    if (!status?.step4_done) return 4;
    return 0;
  };
  const activeStep = getActiveStep();

  // Get available missions for step 3
  const availableMissions = missions?.filter(m => 
    m.status === "publicada" && !m.assigned_to
  ).slice(0, 2) || [];

  const availableCRMMissions = crmMissions?.slice(0, 1) || [];

  // Get first user cell
  const firstCell = userCells?.[0];

  // Step 1: Confirm territory
  const handleConfirmTerritory = async () => {
    if (!profile.city) {
      toast.error("Por favor, confirme sua cidade no cadastro");
      return;
    }
    markStepDone(1);
  };

  // Step 3: Select action
  const handleSelectMission = (missionId: string) => {
    markStepDone(3);
    navigate(`/voluntario/missao/${missionId}`);
  };

  const handleSelectCRMMission = (missionId: string) => {
    markStepDone(3);
    navigate(`/voluntario/missao/${missionId}`);
  };

  // Step 4: Create mural post
  const handleCreatePost = () => {
    if (firstCell?.id) {
      markStepDone(4);
      navigate(`/voluntario/celula/${firstCell.id}/mural/novo?tipo=relato&template=primeiros_passos`);
    } else {
      toast.error("Você precisa estar em uma célula para postar no mural");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <h1 className="font-semibold">Primeiros Passos</h1>
              <p className="text-xs text-muted-foreground">~10 minutos</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/voluntario/hoje">
              <Home className="h-4 w-4 mr-1" />
              Início
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome message */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">
            Bem-vindo(a), {profile.nickname || profile.full_name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground">
            Complete esses passos para entrar na engrenagem do movimento.
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{stepsCompleted} de 4 passos</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
        <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Accessibility Preferences */}
        <AccessibilityPreferencesCard />

        {/* Meu Caminho - Preference-based path */}
        {hasPrefs ? (
          <RecommendedPathCard onEditPrefs={() => setShowPrefsForm(true)} />
        ) : showPrefsForm ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Personalize seu caminho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OnboardingPrefsForm
                initialPrefs={prefs}
                onSave={(p) => {
                  savePrefs(p);
                  setShowPrefsForm(false);
                }}
                onCancel={() => setShowPrefsForm(false)}
                isSaving={isSaving}
                showConforto={true}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Meu Caminho</p>
                  <p className="text-xs text-muted-foreground">
                    Configure suas preferências para receber recomendações personalizadas
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPrefsForm(true)}>
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* First Action Card - Full version */}
        <FirstActionCard />

        {/* Invite Loop Card - Convide 1 pessoa */}
        <InviteLoopCard />

        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1: Confirm Territory */}
          <StepCard
            stepNumber={1}
            title="Confirme seu território"
            description="Verifique sua cidade, bairro e célula para receber conteúdo relevante."
            isDone={status?.step1_done || false}
            isActive={activeStep === 1}
          >
            {!status?.step1_done && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{profile.city || "Cidade não definida"}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.neighborhood || "Bairro não definido"}
                      {firstCell && (
                        <span> • Célula: {firstCell.name}</span>
                      )}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleConfirmTerritory} 
                  disabled={isMarkingStep}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar território
                </Button>
              </div>
            )}
          </StepCard>

          {/* Step 2: Daily Check-in */}
          <StepCard
            stepNumber={2}
            title="Faça seu check-in do dia"
            description="Diga como está sua disponibilidade e no que vai focar hoje."
            isDone={status?.step2_done || false}
            isActive={activeStep === 2}
          >
            {!status?.step2_done && status?.step1_done && (
              <Button 
                onClick={() => {
                  markStepDone(2);
                  navigate("/voluntario/hoje");
                }}
                disabled={isMarkingStep}
                className="w-full"
              >
                <CalendarCheck className="h-4 w-4 mr-2" />
                Fazer check-in
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {!status?.step1_done && (
              <p className="text-xs text-muted-foreground italic">
                Complete o passo anterior primeiro
              </p>
            )}
          </StepCard>

          {/* Step 3: Choose Action */}
          <StepCard
            stepNumber={3}
            title="Escolha sua primeira ação"
            description="Aceite uma missão simples ou uma conversa com apoiador."
            isDone={status?.step3_done || false}
            isActive={activeStep === 3}
          >
            {!status?.step3_done && status?.step2_done && (
              <div className="space-y-3">
                {/* Available missions */}
                {availableMissions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Missões disponíveis
                    </p>
                    {availableMissions.map((mission) => (
                      <button
                        key={mission.id}
                        onClick={() => handleSelectMission(mission.id)}
                        disabled={isMarkingStep}
                        className="w-full p-3 border rounded-lg text-left hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{mission.title}</span>
                        </div>
                        {mission.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {mission.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* CRM missions */}
                {availableCRMMissions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Conversas pendentes
                    </p>
                    {availableCRMMissions.map((mission) => (
                      <button
                        key={mission.mission_id}
                        onClick={() => handleSelectCRMMission(mission.mission_id)}
                        disabled={isMarkingStep}
                        className="w-full p-3 border rounded-lg text-left hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-orange-500" />
                          <span className="font-medium text-sm">{mission.mission_title}</span>
                        </div>
                        {mission.contato_bairro && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {mission.contato_nome} • {mission.contato_bairro}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {availableMissions.length === 0 && availableCRMMissions.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma missão disponível no momento.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        markStepDone(3);
                        navigate("/voluntario/missoes");
                      }}
                      disabled={isMarkingStep}
                    >
                      Ver todas as missões
                    </Button>
                  </div>
                )}
              </div>
            )}
            {!status?.step2_done && (
              <p className="text-xs text-muted-foreground italic">
                Complete o passo anterior primeiro
              </p>
            )}
          </StepCard>

          {/* Step 4: Post on Mural (Optional) */}
          <StepCard
            stepNumber={4}
            title="Poste no mural (opcional)"
            description="Compartilhe um relato ou reflexão com sua célula. Sem dados pessoais."
            isDone={status?.step4_done || false}
            isActive={activeStep === 4}
          >
            {!status?.step4_done && status?.step3_done && (
              <div className="space-y-3">
                <Button 
                  variant="outline"
                  onClick={handleCreatePost}
                  disabled={isMarkingStep || !firstCell}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Criar relato
                </Button>
                {!firstCell && (
                  <p className="text-xs text-muted-foreground text-center">
                    Você precisa estar em uma célula para postar
                  </p>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/voluntario/hoje")}
                  className="w-full text-muted-foreground"
                >
                  Pular por agora
                </Button>
              </div>
            )}
            {!status?.step3_done && (
              <p className="text-xs text-muted-foreground italic">
                Complete o passo anterior primeiro
              </p>
            )}
          </StepCard>
        </div>

        {/* If step 3 is done, show completion CTA */}
        {status?.step3_done && !status?.step4_done && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                <div>
                  <h3 className="font-semibold">Passos obrigatórios concluídos!</h3>
                  <p className="text-sm text-muted-foreground">
                    Você já pode acessar o Hub completo.
                  </p>
                </div>
                <Button onClick={() => navigate("/voluntario/hoje")}>
                  Ir para o Hub
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
