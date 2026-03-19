/**
 * StreakCard - "Hábito de Luta (3 dias)" progress card
 * 
 * Compact card showing 3-day streak goal with progress dots.
 * Non-invasive, shows encouraging copy based on progress.
 */

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Flame, HelpCircle, Zap, Users, TrendingUp } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  className?: string;
}

export function StreakCard({ className }: StreakCardProps) {
  const {
    metrics,
    isLoading,
    hasError,
    goalProgress,
    currentStreak,
    isActiveToday,
    getMessage,
    trackViewed,
    trackInfoOpened,
  } = useStreak();

  const viewedRef = useRef(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Track card viewed once on mount (if we have data)
  useEffect(() => {
    if (metrics && !viewedRef.current) {
      viewedRef.current = true;
      trackViewed();
    }
  }, [metrics, trackViewed]);

  // Handle info sheet open
  const handleInfoOpen = (open: boolean) => {
    setInfoOpen(open);
    if (open) {
      trackInfoOpened();
    }
  };

  // Don't render if loading, error, or no data
  if (isLoading || hasError || !metrics) {
    return null;
  }

  // Progress dots (3 total)
  const dots = [0, 1, 2].map((i) => ({
    filled: i < goalProgress,
    current: i === goalProgress - 1 && isActiveToday,
  }));

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-r from-primary/5 to-transparent", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn(
            "p-2 rounded-full shrink-0",
            goalProgress >= 3 
              ? "bg-orange-500/20" 
              : "bg-primary/10"
          )}>
            <Flame className={cn(
              "h-5 w-5",
              goalProgress >= 3 
                ? "text-orange-500" 
                : "text-primary"
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">
                Hábito de Luta
                {currentStreak > 3 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({currentStreak} dias)
                  </span>
                )}
              </h3>
              
              {/* Progress dots */}
              <div className="flex items-center gap-1">
                {dots.map((dot, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all",
                      dot.filled
                        ? dot.current
                          ? "bg-primary ring-2 ring-primary/30 scale-110"
                          : "bg-primary"
                        : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {getMessage()}
            </p>
          </div>

          {/* Info button */}
          <Sheet open={infoOpen} onOpenChange={handleInfoOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Como isso ajuda?"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[60vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  Por que 3 dias?
                </SheetTitle>
                <SheetDescription>
                  Como a consistência ajuda a luta
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-4 mt-4">
                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 h-fit">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Pequenos passos, grande impacto</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      30 segundos por dia criam o hábito. O hábito vira ação. Ação vira mudança.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 h-fit">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Você não está sozinho</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cada ação se soma às de milhares de voluntários. Juntos, a gente vira o jogo.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 h-fit">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Organização vence eleição</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Militância constante é mais forte que campanha de última hora.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 bg-muted rounded-lg">
                <p className="text-xs text-center text-muted-foreground">
                  <strong className="text-foreground">Meta:</strong> 3 dias seguidos de ação = 
                  <span className="text-primary font-medium"> você no ritmo</span>
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
}
