import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useLogGrowthEvent, storeOrigin } from "@/hooks/useGrowth";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isPending, isRejected, isApproved, isStatusLoading } = useVolunteerStatus();
  const navigate = useNavigate();
  const logGrowthEvent = useLogGrowthEvent();

  // Capture growth tracking params and log visit
  useEffect(() => {
    const templateId = searchParams.get("t");
    const inviteCode = searchParams.get("ref");
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");

    // Store origin data for later signup attribution
    if (templateId || inviteCode || utmSource) {
      storeOrigin({
        templateId: templateId || undefined,
        inviteCode: inviteCode || undefined,
        utmSource: utmSource || undefined,
      });
    }

    // Log visit event (deduped by RPC)
    logGrowthEvent.mutate({
      eventType: "visit_comecar",
      templateId: templateId || undefined,
      inviteCode: inviteCode || undefined,
      meta: {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      },
    });
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || (user && (profileLoading || isStatusLoading))) {
    return <FullPageLoader />;
  }

  // Redirect authenticated users based on volunteer status
  if (user) {
    // Pending or rejected users go to approval page
    if (isPending || isRejected) {
      navigate("/aguardando-aprovacao");
      return null;
    }
    
    // Only approved users can proceed
    if (isApproved) {
      if (profile?.onboarding_status === "concluido") {
        navigate("/voluntario");
      } else {
        navigate("/onboarding");
      }
    }
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
      <div className="text-center space-y-8 animate-slide-up max-w-md">
        <Logo size="lg" />
        
        <div className="space-y-4">
          <h2 className="text-xl text-muted-foreground">
            Sua primeira missão em <span className="text-primary font-bold">10 minutos</span>
          </h2>
          <p className="text-muted-foreground">
            Plataforma de organização política e social.<br />
            Escale voluntariado. Faça a diferença.
          </p>
        </div>

        <Button 
          onClick={() => navigate("/auth")} 
          className="btn-luta animate-pulse-action text-lg px-12 py-6"
        >
          Começar Agora
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <p className="text-xs text-muted-foreground">
          Já tem conta?{" "}
          <button onClick={() => navigate("/auth")} className="text-primary hover:underline">
            Fazer login
          </button>
        </p>
      </div>

      <p className="signature-luta mt-16">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
};

export default Index;
