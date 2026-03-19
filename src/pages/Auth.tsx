import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAppMode } from "@/hooks/useAppMode";
import { useConvites } from "@/hooks/useConvites";
import { useLogGrowthEvent, getStoredOrigin, clearStoredOrigin } from "@/hooks/useGrowth";
import { getPrefillCidade } from "@/hooks/useDistribution";
import { getStoredInvite, clearStoredInvite, hasValidStoredInvite, INVITE_CONFIG } from "@/lib/inviteConfig";
import { InviteRequiredCard } from "@/components/auth/InviteRequiredCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles, MapPin, Loader2, Eye, EyeOff, ArrowLeft, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuthView = "login" | "signup" | "forgot";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // App mode for pre-campaign restrictions
  const { mode, isLoading: modeLoading } = useAppMode();
  const isPreCampaign = mode === "pre";
  
  // Get ref from URL (accept ref, invite, code) or stored invite
  const urlRef = searchParams.get("ref") || searchParams.get("invite") || searchParams.get("code");
  const modeParam = searchParams.get("mode");
  const storedInvite = getStoredInvite();
  const rawRefCode = urlRef || storedInvite?.ref || null;
  const refCode = rawRefCode ? rawRefCode.trim().toUpperCase() : null;
  
  const hasInviteRef = !!refCode || hasValidStoredInvite();
  
  const cidadeParam = searchParams.get("cidade");
  const nextParam = searchParams.get("next") || storedInvite?.next || "/voluntario/hoje";
  
  const { registerUsage } = useConvites();
  const [authView, setAuthView] = useState<AuthView>(modeParam === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("remember_me") === "true";
  });
  const [loading, setLoading] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  
  // Invite validation state via RPC
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteReason, setInviteReason] = useState<string | null>(null);
  const [inviteChannel, setInviteChannel] = useState<string | null>(null);
  const [inviteCampaignTag, setInviteCampaignTag] = useState<string | null>(null);
  const [inviteChecked, setInviteChecked] = useState(false);
  
  const [prefillCidade, setPrefillCidade] = useState<string | null>(null);
  const { signIn, signUp, user } = useAuth();
  const queryClient = useQueryClient();
  const { isPending, isRejected, isApproved, isStatusLoading } = useVolunteerStatus();
  const { isCoordinator, isLoading: rolesLoading } = useUserRoles();
  const logGrowthEvent = useLogGrowthEvent();
  
  // Get mini lead data if coming from mini convite
  const miniLeadData = (() => {
    try {
      const stored = sessionStorage.getItem("mini_lead_data");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();
  
  // Pre-fill name from mini lead data
  useEffect(() => {
    if (miniLeadData?.firstName && !fullName) {
      setFullName(miniLeadData.firstName);
    }
  }, [miniLeadData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get prefill cidade from sessionStorage or URL
  useEffect(() => {
    const storedCidade = getPrefillCidade();
    const cidade = cidadeParam || storedCidade;
    if (cidade) {
      setPrefillCidade(cidade);
      sessionStorage.setItem("prefill_cidade", cidade);
    }
  }, [cidadeParam]);

  // Validate invite code via public_validate_invite RPC
  useEffect(() => {
    const validate = async () => {
      if (!refCode) {
        setInviteChecked(true);
        return;
      }
      
      // Store in sessionStorage for onboarding
      sessionStorage.setItem("invite_code", refCode);
      
      try {
        const { data, error } = await (supabase.rpc as any)("public_validate_invite", {
          p_code: refCode,
        });
        
        if (error) throw error;
        
        // RPC returns table, get first row
        const row = Array.isArray(data) ? data[0] : data;
        
        if (row) {
          setInviteValid(row.ok === true);
          setInviteReason(row.reason || null);
          setInviteChannel(row.channel || null);
          setInviteCampaignTag(row.campaign_tag || null);
        } else {
          setInviteValid(false);
          setInviteReason("NOT_FOUND");
        }
      } catch {
        // RPC failure => treat as invalid for signup, login still works
        setInviteValid(false);
        setInviteReason("ERROR");
      }
      setInviteChecked(true);
    };
    
    validate().then(() => {
      // intentionally empty — state updates inside validate drive the effect below
    });
    
    // Log form open event
    logGrowthEvent.mutate({
      eventType: "invite_form_open",
      inviteCode: refCode || undefined,
      meta: {
        cidade: cidadeParam || getPrefillCidade(),
        has_ref: !!refCode,
      },
    });
  }, [refCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch to signup when a valid invite is detected
  useEffect(() => {
    if (inviteChecked && refCode) {
      if (inviteValid === true) {
        setAuthView("signup");
      } else {
        setAuthView("login");
      }
    }
  }, [inviteChecked, inviteValid, refCode]);

  // Handle redirect after login based on volunteer status and roles
  // State to track if we already ran the ensure profile flow
  const [profileEnsured, setProfileEnsured] = useState(false);

  useEffect(() => {
    if (!user || isStatusLoading || rolesLoading) return;

    const finalizeAndRedirect = async () => {
      // Ensure volunteer profile exists (idempotent)
      if (!profileEnsured) {
        try {
          await (supabase.rpc as any)("ensure_volunteer_profile", {
            p_full_name: fullName || null,
            p_city_id: null,
            p_preferred_cell_id: null,
          });
          setProfileEnsured(true);
          // Invalidate status query so it re-fetches with the new profile
          queryClient.invalidateQueries({ queryKey: ["volunteer-status", user.id] });
          queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
        } catch {
          // Profile likely already exists, continue
          setProfileEnsured(true);
        }
      }

      // Try to register invite usage if we have a valid invite
      if (refCode && inviteValid) {
        try {
          await registerUsage({ code: refCode, userId: user.id });
        } catch {
          // Might already be registered, continue
        }
      }
      
      // Clear stored invite data
      clearStoredInvite();
      
      // Redirect based on status
      if (isPending || isRejected) {
        navigate("/aguardando-aprovacao", { replace: true });
      } else if (isApproved) {
        if (isCoordinator()) {
          navigate("/admin", { replace: true });
        } else {
          navigate(nextParam, { replace: true });
        }
      }
    };
    
    finalizeAndRedirect();
  }, [user, isPending, isRejected, isApproved, isStatusLoading, rolesLoading, isCoordinator, navigate, refCode, inviteValid, nextParam, registerUsage, profileEnsured, queryClient, fullName]);

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (checked) {
      localStorage.setItem("remember_me", "true");
    } else {
      localStorage.removeItem("remember_me");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authView === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          // Improve error messages
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Email ou senha incorretos");
          }
          throw error;
        }
        
        // If not "remember me", set up session cleanup on browser close
        if (!rememberMe) {
          sessionStorage.setItem("session_temporary", "true");
        } else {
          sessionStorage.removeItem("session_temporary");
        }
        
        toast.success("Bem-vindo(a) de volta!");
        // Redirect will be handled by useEffect based on status
      } else if (authView === "signup") {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          // Check for duplicate email
          if (error.message.includes("User already registered") || 
              error.message.includes("already been registered")) {
            throw new Error("Este email já está cadastrado. Faça login ou recupere sua senha.");
          }
          throw error;
        }
        
        // Log signup event with origin tracking
        const storedOrigin = getStoredOrigin();
        logGrowthEvent.mutate({
          eventType: "signup",
          templateId: storedOrigin?.templateId,
          inviteCode: storedOrigin?.inviteCode || refCode || undefined,
          meta: { utm_source: storedOrigin?.utmSource },
        });
        clearStoredOrigin();
        
        toast.success("Conta criada! Aguarde a aprovação da coordenação.");
        // Force redirect to approval page immediately after signup
        navigate("/aguardando-aprovacao", { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Digite seu email");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      
      if (error) throw error;
      
      setForgotEmailSent(true);
      toast.success("Email enviado! Verifique sua caixa de entrada.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email");
    } finally {
      setLoading(false);
    }
  };

  // Human-readable reason messages
  const reasonLabel = (reason: string | null): string => {
    switch (reason) {
      case "NOT_FOUND": return "Convite não encontrado";
      case "INACTIVE": return "Convite desativado";
      case "EXPIRED": return "Convite expirado";
      case "EMPTY":
      case "NO_TABLE":
      case "ERROR":
      default: return "Convite inválido";
    }
  };

  // Render invite badge based on state
  const renderInviteBadge = () => {
    if (!refCode) return null;
    
    // Still checking - show neutral state
    if (!inviteChecked) {
      return (
        <Badge variant="outline" className="bg-secondary px-3 py-1.5">
          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          Verificando convite...
        </Badge>
      );
    }
    
    // Valid invite
    if (inviteValid === true) {
      return (
        <div className="space-y-1 flex flex-col items-center">
          <p className="text-xs text-muted-foreground font-mono">Convite detectado: {refCode}</p>
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
            <Sparkles className="h-3 w-3 mr-1.5" />
            OK
          </Badge>
          {(inviteChannel || inviteCampaignTag) && (
            <p className="text-[10px] text-muted-foreground">
              {inviteChannel && <span>Canal: {inviteChannel}</span>}
              {inviteChannel && inviteCampaignTag && <span> · </span>}
              {inviteCampaignTag && <span>#{inviteCampaignTag}</span>}
            </p>
          )}
        </div>
      );
    }
    
    // Invalid invite
    if (inviteValid === false) {
      return (
        <div className="space-y-2 flex flex-col items-center">
          <p className="text-xs text-muted-foreground font-mono">Convite detectado: {refCode}</p>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1.5">
            INVÁLIDO
          </Badge>
          <p className="text-sm text-amber-600">{reasonLabel(inviteReason)}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(INVITE_CONFIG.getWhatsAppUrl(refCode), "_blank")}
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            Peça um convite no WhatsApp
          </Button>
        </div>
      );
    }
    
    return null;
  };

  // Pre-campaign mode: show invite required card if trying to signup without invite
  // Block signup if: no invite ref at all, OR invite was checked and is invalid/expired
  const hasVerifiedInvite = inviteChecked ? inviteValid === true : hasInviteRef;
  const showInviteRequired = authView === "signup" && !hasVerifiedInvite && !modeLoading;

  // If trying to create account without invite in pre-campaign, show friendly card
  if (showInviteRequired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <Logo size="lg" className="mb-8" />
        <InviteRequiredCard onLoginClick={() => setAuthView("login")} />
        <p className="signature-luta mt-12">#ÉLUTA</p>
      </div>
    );
  }

  // Forgot password view
  if (authView === "forgot") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <div className="w-full max-w-sm space-y-8 animate-slide-up">
          <Logo size="lg" />
          
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Recuperar senha</h2>
            <p className="text-sm text-muted-foreground">
              {forgotEmailSent 
                ? "Enviamos um link de recuperação para seu email."
                : "Digite seu email para receber um link de recuperação."}
            </p>
          </div>

          {!forgotEmailSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="bg-secondary border-border"
                />
              </div>

              <Button type="submit" className="btn-luta w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link"}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Não recebeu? Verifique sua pasta de spam ou tente novamente.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setForgotEmailSent(false)}
                className="w-full"
              >
                Tentar novamente
              </Button>
            </div>
          )}

          <button
            onClick={() => {
              setAuthView("login");
              setForgotEmailSent(false);
            }}
            className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </button>
        </div>

        <p className="signature-luta mt-12">#ÉLUTA — Escutar • Cuidar • Organizar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete" data-testid="page-auth">
      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        <Logo size="lg" />

        {/* Invite Badge */}
        {refCode && (
          <div className="flex justify-center">
            {renderInviteBadge()}
          </div>
        )}

        {/* Prefill Cidade Badge */}
        {prefillCidade && !refCode && (
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-secondary px-3 py-1.5">
              <MapPin className="h-3 w-3 mr-1.5" />
              {prefillCidade}
            </Badge>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authView === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Como quer ser chamado(a)?</Label>
              <Input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome ou apelido"
                className="bg-secondary border-border"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-secondary border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {authView === "login" && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={handleRememberMeChange}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal text-muted-foreground cursor-pointer"
                  >
                    Manter conectado
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthView("forgot")}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
            </>
          )}

          <Button type="submit" className="btn-luta w-full" disabled={loading}>
            {loading ? "Carregando..." : authView === "login" ? "Entrar" : "Criar Conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {authView === "login" ? "Não tem conta? " : "Já tem conta? "}
          {/* In pre-campaign without invite, disable signup toggle */}
          {!hasVerifiedInvite && authView === "login" ? (
            <button
              onClick={() => navigate("/aceitar-convite")}
              className="text-primary hover:underline font-medium"
            >
              Pedir convite
            </button>
          ) : (
            <button
              onClick={() => setAuthView(authView === "login" ? "signup" : "login")}
              className="text-primary hover:underline font-medium"
            >
              {authView === "login" ? "Criar conta" : "Fazer login"}
            </button>
          )}
        </p>
      </div>

      <p className="signature-luta mt-12">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}
