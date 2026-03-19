/**
 * AceitarConviteRef - Validates signup invite codes (ref=XXXX)
 * 
 * Handles the public invite link flow:
 * - /aceitar-convite?ref=XXXX
 * 
 * Routes:
 * - Valid ref + not logged in → /auth?ref=XXXX&next=/voluntario
 * - Valid ref + logged in → applies invite, redirects based on profile state
 * - Invalid ref → friendly UI with CTAs (WhatsApp, login)
 * - No ref → friendly UI to enter or request invite
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useConvites } from "@/hooks/useConvites";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useProfile } from "@/hooks/useProfile";
import { storeInvite, clearStoredInvite, INVITE_CONFIG } from "@/lib/inviteConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertCircle, UserPlus, LogIn, MessageCircle, Ticket } from "lucide-react";

type ValidationState = "loading" | "valid" | "invalid" | "expired" | "no_ref";

export default function AceitarConviteRef() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { validateInvite, registerUsage } = useConvites();
  const { isApproved, isStatusLoading } = useVolunteerStatus();
  const { profile, isLoading: profileLoading } = useProfile();
  
  const refCode = searchParams.get("ref");
  const nextParam = searchParams.get("next") || "/voluntario/hoje";
  
  const [validationState, setValidationState] = useState<ValidationState>("loading");
  const [isApplying, setIsApplying] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Store ref and next in localStorage for persistence across auth flow
  useEffect(() => {
    if (refCode) {
      storeInvite(refCode, nextParam);
    }
  }, [refCode, nextParam]);

  // Validate the invite code
  useEffect(() => {
    const validate = async () => {
      if (!refCode) {
        setValidationState("no_ref");
        return;
      }

      try {
        const isValid = await validateInvite(refCode);
        setValidationState(isValid ? "valid" : "invalid");
      } catch (err) {
        setValidationState("invalid");
      }
    };

    validate();
  }, [refCode, validateInvite]);

  // Handle logged-in user with valid invite
  useEffect(() => {
    const applyInvite = async () => {
      if (
        validationState !== "valid" ||
        !user ||
        authLoading ||
        isStatusLoading ||
        profileLoading ||
        isApplying
      ) {
        return;
      }

      setIsApplying(true);

      try {
        // Register invite usage
        await registerUsage({ code: refCode!, userId: user.id });
        
        // Clear stored invite data
        clearStoredInvite();
        
        // Smart redirect based on profile state
        redirectBasedOnProfile();
      } catch (err) {
        // Usage might already be registered, still redirect
        clearStoredInvite();
        redirectBasedOnProfile();
      }
    };

    applyInvite();
  }, [validationState, user, authLoading, isStatusLoading, profileLoading, isApproved, profile]);

  const redirectBasedOnProfile = () => {
    if (!isApproved) {
      navigate("/aguardando-aprovacao", { replace: true });
    } else if (!profile?.city_id) {
      // Onboarding incomplete - needs city selection
      navigate("/voluntario/primeiros-passos", { replace: true });
    } else {
      // Fully onboarded
      navigate("/voluntario/hoje", { replace: true });
    }
  };

  // Not logged in + valid invite → redirect to auth
  useEffect(() => {
    if (validationState === "valid" && !authLoading && !user) {
      const authUrl = `/auth?ref=${encodeURIComponent(refCode!)}&next=${encodeURIComponent(nextParam)}&mode=signup`;
      navigate(authUrl, { replace: true });
    }
  }, [validationState, authLoading, user, refCode, nextParam, navigate]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      navigate(`/aceitar-convite?ref=${encodeURIComponent(manualCode.trim())}`);
    }
  };

  const handleRequestInvite = (invalidCode?: string) => {
    window.open(INVITE_CONFIG.getWhatsAppUrl(invalidCode), "_blank");
  };

  // Loading state
  if (authLoading || validationState === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <Logo size="lg" className="mb-8" />
        <div className="text-center space-y-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Verificando convite...</p>
        </div>
      </div>
    );
  }

  // Applying invite (logged in)
  if (isApplying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <Logo size="lg" className="mb-8" />
        <div className="text-center space-y-3">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">Aplicando convite...</p>
        </div>
      </div>
    );
  }

  // No ref provided - show entry form
  if (validationState === "no_ref") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <Logo size="lg" className="mb-8" />
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Ticket className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Entrar com convite</CardTitle>
            <CardDescription>
              Digite o código do seu convite ou peça um para a coordenação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Código do convite"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                className="flex-1 uppercase"
              />
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                Validar
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleRequestInvite()}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Pedir convite
            </Button>
            
            <Button 
              className="w-full" 
              variant="ghost"
              onClick={() => navigate("/auth")}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Já tenho conta
            </Button>
          </CardContent>
        </Card>
        <p className="signature-luta mt-12">#ÉLUTA</p>
      </div>
    );
  }

  // Invalid or expired invite - friendly UI
  if (validationState === "invalid" || validationState === "expired") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <Logo size="lg" className="mb-8" />
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-500/10 rounded-full w-fit">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle>Convite não encontrado</CardTitle>
            <CardDescription>
              Este código pode ter expirado ou não existe mais. Sem problemas — peça um novo!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full btn-luta" 
              onClick={() => handleRequestInvite(refCode || undefined)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Pedir novo convite
            </Button>
            
            <div className="flex gap-2">
              <Input
                placeholder="Tentar outro código"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                className="flex-1 uppercase"
              />
              <Button variant="outline" onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                Tentar
              </Button>
            </div>
            
            <Button 
              className="w-full" 
              variant="ghost"
              onClick={() => navigate("/auth")}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Entrar com conta existente
            </Button>
          </CardContent>
        </Card>
        <p className="signature-luta mt-12">#ÉLUTA</p>
      </div>
    );
  }

  // Valid + waiting for redirect (shouldn't stay here long)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
      <Logo size="lg" className="mb-8" />
      <div className="text-center space-y-3">
        <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
          <Sparkles className="h-4 w-4 mr-2" />
          Convite válido!
        </Badge>
        <p className="text-sm text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}
