import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useLogGrowthEvent, storeOrigin } from "@/hooks/useGrowth";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Target, Users } from "lucide-react";

/**
 * Universal redirect handler for territory/invite/UTM links
 * Routes:
 *   /r/:code - where code can be an invite ref, city slug, or campaign tag
 * 
 * Query params:
 *   ?direct=1 - skip mini-landing, redirect immediately
 *   ?ref=     - invite code (stored for attribution)
 *   ?cidade=  - pre-fill city on signup
 *   ?utm_source, ?utm_medium, ?utm_campaign - tracking params
 */
export default function Redirect() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const logGrowthEvent = useLogGrowthEvent();
  
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [countdown, setCountdown] = useState(4);
  const [hasTracked, setHasTracked] = useState(false);

  // Extract tracking params
  const directMode = searchParams.get("direct") === "1";
  const ref = searchParams.get("ref") || code;
  const cidade = searchParams.get("cidade");
  const utmSource = searchParams.get("utm_source");
  const utmMedium = searchParams.get("utm_medium");
  const utmCampaign = searchParams.get("utm_campaign");

  // Build destination URLs with params
  const buildUrl = (basePath: string) => {
    const params = new URLSearchParams();
    if (ref) params.set("ref", ref);
    if (cidade) params.set("cidade", cidade);
    if (utmSource) params.set("utm_source", utmSource);
    if (utmMedium) params.set("utm_medium", utmMedium);
    if (utmCampaign) params.set("utm_campaign", utmCampaign);
    const queryString = params.toString();
    return `${basePath}${queryString ? `?${queryString}` : ""}`;
  };

  // Canonical destination: /aceitar-convite for all /r/:code links
  const aceitarConviteUrl = buildUrl("/aceitar-convite");
  const conviteUrl = buildUrl("/convite-mini");
  const missoesUrl = "/missao";

  // Store origin data and log event once
  useEffect(() => {
    if (hasTracked) return;
    
    // Store origin data for attribution
    if (ref || cidade || utmSource) {
      storeOrigin({
        inviteCode: ref || undefined,
        utmSource: utmSource || undefined,
      });
    }

    // Store city for pre-fill in signup/onboarding
    if (cidade) {
      sessionStorage.setItem("prefill_cidade", cidade);
    }

    // Store UTM params for later use
    if (utmSource || utmMedium || utmCampaign) {
      sessionStorage.setItem("utm_params", JSON.stringify({
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      }));
    }

    // Log territory link open event (anonymous)
    logGrowthEvent.mutate({
      eventType: "territory_link_open",
      inviteCode: ref || undefined,
      meta: {
        cidade,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        path_code: code,
        direct_mode: directMode,
      },
    });
    
    setHasTracked(true);
  }, [code, searchParams, logGrowthEvent, hasTracked, ref, cidade, utmSource, utmMedium, utmCampaign, directMode]);

  // Direct mode: immediate redirect to aceitar-convite (canonical)
  useEffect(() => {
    if (directMode && hasTracked) {
      navigate(aceitarConviteUrl, { replace: true });
    }
  }, [directMode, hasTracked, navigate, aceitarConviteUrl]);

  // Auto-redirect countdown - redirect to aceitar-convite (canonical)
  useEffect(() => {
    if (directMode || !autoRedirect || !hasTracked) return;
    
    if (countdown <= 0) {
      navigate(aceitarConviteUrl, { replace: true });
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(c => c - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, autoRedirect, directMode, hasTracked, navigate, aceitarConviteUrl]);

  const handleConvite = () => {
    logGrowthEvent.mutate({
      eventType: "invite_form_open",
      inviteCode: ref || undefined,
      meta: { source: "mini_landing", cidade },
    });
    navigate(aceitarConviteUrl, { replace: true });
  };

  const handleMissoes = () => {
    logGrowthEvent.mutate({
      eventType: "missions_view",
      inviteCode: ref || undefined,
      meta: { source: "mini_landing", cidade },
    });
    navigate(missoesUrl, { replace: true });
  };

  // Show loader for direct mode
  if (directMode) {
    return <FullPageLoader text="Redirecionando..." />;
  }

  return (
    <>
      {/* OG Meta Tags via Helmet would go here in production */}
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        {/* Main Container */}
        <div className="w-full max-w-md space-y-8 text-center animate-in-up">
          
          {/* Logo/Brand Block */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
              <Target className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase mb-2">
                Pré-campanha
              </p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                #ÉLUTA
              </h1>
              <p className="text-sm font-medium tracking-widest text-primary mt-1">
                ESCUTAR • CUIDAR • ORGANIZAR
              </p>
            </div>
          </div>

          {/* Value Proposition Block */}
          <div className="space-y-2 py-4">
            <p className="text-lg font-semibold text-foreground">
              Entre pra receber sua primeira missão
            </p>
            <p className="text-sm text-muted-foreground">
              Sem WhatsApp. Tudo aqui.
            </p>
          </div>

          {/* CTA Buttons Block */}
          <div className="space-y-3">
            <Button 
              onClick={handleConvite}
              size="lg"
              className="w-full btn-luta text-base font-bold"
            >
              <Users className="w-5 h-5 mr-2" />
              Pedir convite
            </Button>
            
            <Button 
              onClick={handleMissoes}
              variant="outline"
              size="lg"
              className="w-full text-base font-medium"
            >
              Ver missões
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Auto-redirect Toggle */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {autoRedirect 
                  ? `Continuando em ${countdown}s...` 
                  : "Redirecionamento automático desligado"
                }
              </span>
              <Switch 
                checked={autoRedirect} 
                onCheckedChange={setAutoRedirect}
                aria-label="Auto-redirecionar"
              />
            </div>
          </div>
          
          {/* Footer Note */}
          <p className="text-xs text-muted-foreground/60 pt-4">
            {cidade && `Cidade: ${cidade} • `}
            Seus dados estão protegidos
          </p>
        </div>
      </div>
    </>
  );
}
