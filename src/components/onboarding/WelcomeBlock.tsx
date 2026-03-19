import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useFirstAction, type FirstActionKind } from "@/hooks/useFirstAction";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// CellAssignmentRequestModal removed - cells auto-assigned on approval
import {
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  MessageSquare,
  Share2,
  Users,
  HandHelping,
  Zap,
  Target,
  UserPlus,
} from "lucide-react";

interface WelcomeBlockProps {
  onDismiss?: () => void;
}

// Check if welcome should show (within 30 min of onboarding completion)
const WELCOME_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

const QUICK_ACTIONS = [
  {
    id: "share" as const,
    kind: "share" as const,
    label: "Compartilhar link",
    description: "Convide alguém em 30 segundos",
    icon: Share2,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    href: "/voluntario/convite",
    estimatedMinutes: 0.5,
    priority: "without_cell", // Priority when without cell
  },
  {
    id: "conversa" as const,
    kind: "conversa" as FirstActionKind,
    label: "Iniciar conversa",
    description: "Mande uma mensagem para um apoiador",
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    href: null, // Generated via RPC
    estimatedMinutes: 10,
    priority: "with_prefs",
  },
  {
    id: "rua" as const,
    kind: "rua" as FirstActionKind,
    label: "Missão de rua",
    description: "Panfletagem ou rodinha no bairro",
    icon: MapPin,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    href: null, // Generated via RPC
    estimatedMinutes: 10,
    priority: "with_prefs",
  },
  {
    id: "crm" as const,
    kind: "crm" as const,
    label: "Salvar contato",
    description: "Registre um apoiador novo",
    icon: UserPlus,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    href: "/voluntario/crm/novo",
    estimatedMinutes: 2,
    priority: "fallback",
  },
];

export function WelcomeBlock({ onDismiss }: WelcomeBlockProps) {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useProfile();
  const { startFirstAction, isStarting } = useFirstAction();
  const logGrowthEvent = useLogGrowthEvent();
  const [_showRequestModal, _setShowRequestModal] = useState(false); // deprecated
  const [dismissed, setDismissed] = useState(false);

  // Check if welcome block should be shown
  const shouldShowWelcome = (() => {
    if (profileLoading || !profile) return false;
    if (dismissed) return false;
    
    // Already has first action - don't show
    if (profile.first_action_at) return false;
    
    // Check if onboarding was recently completed (within 30 min)
    if (!profile.onboarding_completed_at) return false;
    
    const completedAt = new Date(profile.onboarding_completed_at).getTime();
    const now = Date.now();
    const withinWindow = (now - completedAt) < WELCOME_WINDOW_MS;
    
    // Also check localStorage to avoid showing again if dismissed
    const dismissKey = `welcome_dismissed:${profile.id}`;
    if (localStorage.getItem(dismissKey)) return false;
    
    return withinWindow;
  })();

  // Log welcome shown
  useEffect(() => {
    if (shouldShowWelcome && profile) {
      logGrowthEvent.mutate({
        eventType: "welcome_shown",
        meta: {
          has_cell: !!profile.cell_id,
        },
      });
    }
  }, [shouldShowWelcome]);

  const handleDismiss = () => {
    if (profile?.id) {
      localStorage.setItem(`welcome_dismissed:${profile.id}`, "true");
    }
    setDismissed(true);
    onDismiss?.();
  };

  const handleActionClick = async (action: typeof QUICK_ACTIONS[0]) => {
    logGrowthEvent.mutate({
      eventType: "welcome_action_clicked",
      meta: { action_id: action.id, kind: action.kind },
    });

    if (action.href) {
      navigate(action.href);
    } else if (action.kind === "rua" || action.kind === "conversa") {
      startFirstAction(action.kind);
    }
  };

  // handleRequestSuccess removed - cells auto-assigned

  if (!shouldShowWelcome || profileLoading) {
    return null;
  }

  const hasCell = !!profile?.cell_id;
  const cityName = profile?.city || "sua cidade";

  // Determine primary action based on cell status
  const getPrimaryAction = () => {
    if (!hasCell) {
      // Without cell: prioritize sharing/inviting
      return QUICK_ACTIONS.find(a => a.id === "share")!;
    }
    // With cell: use first action suggestion or default to conversa
    return QUICK_ACTIONS.find(a => a.id === "conversa") || QUICK_ACTIONS[1];
  };

  const primaryAction = getPrimaryAction();
  const PrimaryIcon = primaryAction.icon;

  return (
    <>
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
              <Sparkles className="h-3 w-3 mr-1" />
              Bem-vindo(a)!
            </Badge>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular
            </button>
          </div>
          <CardTitle className="text-xl flex items-center gap-2 mt-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Sua primeira ação
          </CardTitle>
          <CardDescription>
            {hasCell 
              ? "Comece com uma ação rápida para entrar na engrenagem"
              : "Comece compartilhando o movimento enquanto se prepara"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Primary action card */}
          <div className={`p-4 rounded-lg ${primaryAction.bgColor} border border-primary/20`}>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-background shadow-sm">
                <PrimaryIcon className={`h-5 w-5 ${primaryAction.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{primaryAction.label}</h4>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {primaryAction.estimatedMinutes < 1 
                      ? "30s" 
                      : `${primaryAction.estimatedMinutes}min`
                    }
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {primaryAction.description}
                </p>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => handleActionClick(primaryAction)}
            disabled={isStarting}
          >
            {isStarting ? (
              "Gerando..."
            ) : (
              <>
                Começar agora
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          {/* Alternative quick actions */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {QUICK_ACTIONS.filter(a => a.id !== primaryAction.id).slice(0, 2).map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className={`p-2 rounded-full ${action.bgColor}`}>
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                </div>
                <span className="text-xs">{action.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
