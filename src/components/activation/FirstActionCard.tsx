import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFirstAction, type FirstActionKind } from "@/hooks/useFirstAction";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  MapPin,
  MessageSquare,
  Phone,
  Users,
  ArrowRight,
  Clock,
  Sparkles,
  X,
  Target,
  UserPlus,
  Share2,
} from "lucide-react";

interface FirstActionCardProps {
  compact?: boolean;
  onDismiss?: () => void;
}

const ACTION_CONFIG: Record<FirstActionKind, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  rua: {
    icon: MapPin,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  },
  conversa: {
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  followup: {
    icon: Phone,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
  },
  crm: {
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
  },
};

// Fallback actions when no mission is available
const FALLBACK_ACTIONS = [
  {
    id: "missao" as const,
    label: "Pegar uma missão",
    description: "Escolha uma ação para fazer agora",
    icon: Target,
    href: "/voluntario/missoes",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "convite" as const,
    label: "Convidar +1",
    description: "Traga alguém para o movimento",
    icon: Share2,
    href: "/voluntario/convite",
    color: "text-green-600",
    bgColor: "bg-green-500/10",
  },
  {
    id: "crm" as const,
    label: "Salvar 1 contato",
    description: "Registre um apoiador novo",
    icon: UserPlus,
    href: "/voluntario/crm/novo",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
];

export function FirstActionCard({ compact = false, onDismiss }: FirstActionCardProps) {
  const navigate = useNavigate();
  const logGrowthEvent = useLogGrowthEvent();
  const {
    needsFirstAction,
    isLoading,
    getSuggestedFirstAction,
    startFirstAction,
    isStarting,
    hasSuggestion,
  } = useFirstAction();

  const suggestedAction = getSuggestedFirstAction();
  const config = suggestedAction ? ACTION_CONFIG[suggestedAction.kind] : null;
  const Icon = config?.icon || Target;

  // Log offer shown on mount
  useEffect(() => {
    if (needsFirstAction && !isLoading) {
      logGrowthEvent.mutate({
        eventType: "first_action_offered",
        meta: { 
          has_suggestion: hasSuggestion,
          suggestion_kind: suggestedAction?.kind || "fallback",
        },
      });
    }
  }, [needsFirstAction, isLoading, hasSuggestion]);

  // Don't render if not needed or loading
  if (!needsFirstAction || isLoading) {
    return null;
  }

  // Handle fallback action click
  const handleFallbackClick = (actionId: string, href: string) => {
    logGrowthEvent.mutate({
      eventType: "first_action",
      meta: { stage: "started", kind: actionId, source: "fallback" },
    });
    navigate(href);
  };

  // Fallback UI when no suggestion available
  if (!hasSuggestion || !suggestedAction || !config) {
    if (compact) {
      return (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Faça sua primeira ação!</p>
                <p className="text-xs text-muted-foreground">
                  Escolha como começar
                </p>
              </div>
              <div className="flex gap-1">
                {FALLBACK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant="outline"
                    onClick={() => handleFallbackClick(action.id, action.href)}
                    className="px-2"
                  >
                    <action.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={onDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Full fallback version
    return (
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
              <Sparkles className="h-3 w-3 mr-1" />
              Comece agora
            </Badge>
          </div>
          <CardTitle className="text-xl flex items-center gap-2 mt-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Sua primeira ação
          </CardTitle>
          <CardDescription>
            Escolha uma das opções abaixo para entrar na engrenagem
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {FALLBACK_ACTIONS.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className={`w-full h-auto py-4 px-4 justify-start gap-4 ${action.bgColor} border-primary/20 hover:border-primary/40`}
              onClick={() => handleFallbackClick(action.id, action.href)}
            >
              <div className={`p-2.5 rounded-full bg-background shadow-sm`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">{action.label}</p>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Compact version for /voluntario/hoje banner (with suggestion)
  if (compact) {
    return (
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                Primeira ação em 10 min
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {suggestedAction.description}
              </p>
            </div>
            
            <Button
              size="sm"
              onClick={() => startFirstAction(suggestedAction.kind)}
              disabled={isStarting}
            >
              {isStarting ? "..." : "Fazer agora"}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>

            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full version for /voluntario/primeiros-passos (with suggestion)
  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Recomendado
          </Badge>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Clock className="h-3.5 w-3.5" />
            ~{suggestedAction.estimatedMinutes} min
          </div>
        </div>
        <CardTitle className="text-xl flex items-center gap-2 mt-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Sua primeira ação
        </CardTitle>
        <CardDescription>
          Complete uma ação rápida para entrar na engrenagem do movimento
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress indicator */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso inicial</span>
            <span>0 de 1</span>
          </div>
          <Progress value={0} className="h-1.5" />
        </div>

        {/* Action card */}
        <div className={`p-4 rounded-lg ${config.bgColor} border border-primary/20`}>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-full bg-background shadow-sm`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{suggestedAction.label}</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {suggestedAction.description}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Button
          className="w-full"
          size="lg"
          onClick={() => startFirstAction(suggestedAction.kind)}
          disabled={isStarting}
        >
          {isStarting ? (
            "Gerando..."
          ) : (
            <>
              Fazer agora
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

        {/* Alternative actions - fallback buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {FALLBACK_ACTIONS.filter(a => 
            !(suggestedAction.kind === "rua" && a.id === "missao") &&
            !(suggestedAction.kind === "conversa" && a.id === "convite")
          ).slice(0, 3).map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              className="flex-col h-auto py-2 gap-1"
              onClick={() => handleFallbackClick(action.id, action.href)}
            >
              <action.icon className={`h-4 w-4 ${action.color}`} />
              <span className="text-xs">{action.label.split(' ')[0]}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
