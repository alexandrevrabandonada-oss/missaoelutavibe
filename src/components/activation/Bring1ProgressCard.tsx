import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Clock,
  CheckCircle,
  Share2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useBring1Progress } from "@/hooks/useBring1Progress";
import { useInviteLoop } from "@/hooks/useInviteLoop";

interface Bring1ProgressCardProps {
  compact?: boolean;
  className?: string;
}

/**
 * Progress card for "Bring +1 in 48h" goal
 * Shows on /voluntario/hoje after first action is completed
 */
export function Bring1ProgressCard({ compact = false, className = "" }: Bring1ProgressCardProps) {
  const navigate = useNavigate();
  const { progress, isLoading, hasCompletedFirstAction } = useBring1Progress();
  const { shareNative, copyLink } = useInviteLoop();

  // Don't show if no first action or loading
  if (!hasCompletedFirstAction || isLoading || !progress) {
    return null;
  }

  // Don't show if goal achieved and window expired (old success)
  if (progress.goalAchieved && progress.windowExpired) {
    return null;
  }

  const progressPercent = progress.goalAchieved ? 100 : 0;
  const displayCount = progress.activatedCount;
  const clickCount = progress.clickCount;

  const handleShare = async () => {
    await shareNative();
  };

  // Compact version
  if (compact) {
    return (
      <Card className={`border-primary/30 bg-gradient-to-r from-primary/5 to-transparent ${className}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Meta 48h</p>
                {!progress.windowExpired && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    <Clock className="h-3 w-3 mr-0.5" />
                    ativo
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-0.5">
                {progress.goalAchieved ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    1/1 ativado
                  </span>
                ) : progress.isFallback ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    {clickCount} clique{clickCount !== 1 ? "s" : ""} no link
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    0/1 ativado
                  </span>
                )}
              </div>
            </div>

            {!progress.goalAchieved && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
                className="shrink-0"
              >
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Convidar
              </Button>
            )}
            
            {progress.goalAchieved && (
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full version
  return (
    <Card className={`border-primary/40 bg-gradient-to-br from-primary/10 to-transparent ${className}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base">Traga +1 em 48h</h3>
              <p className="text-sm text-muted-foreground">
                Multiplique o impacto do movimento
              </p>
            </div>
          </div>
          
          {!progress.windowExpired && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Clock className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
          
          {progress.windowExpired && !progress.goalAchieved && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Expirado
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{displayCount}/1 ativado</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Fallback warning */}
        {progress.isFallback && !progress.goalAchieved && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-700">
              {clickCount} clique{clickCount !== 1 ? "s" : ""} no seu link. 
              Quando alguém fizer a primeira ação, contará aqui!
            </p>
          </div>
        )}

        {/* CTA */}
        {!progress.goalAchieved && (
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/voluntario/convite")}
            >
              QR Code
            </Button>
          </div>
        )}

        {/* Success state */}
        {progress.goalAchieved && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <CheckCircle className="h-6 w-6 text-green-500 shrink-0" />
            <div>
              <p className="font-medium text-green-700">Meta alcançada! 🎉</p>
              <p className="text-xs text-muted-foreground">
                Você trouxe alguém para o movimento
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
