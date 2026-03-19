/**
 * MicroCompletionBanner
 * 
 * Banner shown on /voluntario/hoje after completing a micro-action
 * (e.g., creating a contact and doing a quick follow-up).
 * Shows encouraging message and offers next actions.
 */

import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Sparkles, ArrowRight, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MicroCompletionBannerProps {
  onDismiss: () => void;
  hasSuggestion?: boolean;
  onStartExecution?: () => void;
}

// Track growth events
async function logGrowthEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[MicroCompletionBanner] Tracking error:", error);
  }
}

export function MicroCompletionBanner({
  onDismiss,
  hasSuggestion = false,
  onStartExecution,
}: MicroCompletionBannerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const shownTrackedRef = useRef(false);

  // Track banner shown once
  useEffect(() => {
    if (!shownTrackedRef.current) {
      shownTrackedRef.current = true;
      logGrowthEvent("micro_completion_banner_shown", {
        has_suggestion: hasSuggestion,
      });
    }
  }, [hasSuggestion]);

  const handleDismiss = () => {
    // Remove ?done=micro from URL
    searchParams.delete("done");
    setSearchParams(searchParams, { replace: true });
    onDismiss();
  };

  const handleStartNow = () => {
    logGrowthEvent("micro_completion_start_clicked", {
      action: "start_now",
    });
    handleDismiss();
    onStartExecution?.();
  };

  const handleChooseAction = () => {
    logGrowthEvent("micro_completion_start_clicked", {
      action: "choose_action",
    });
    handleDismiss();
  };

  return (
    <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 via-primary/5 to-transparent animate-in fade-in slide-in-from-top-2 duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-full bg-green-500/20 shrink-0">
            <Sparkles className="h-4 w-4 text-green-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              Boa! Você avançou hoje. ✊
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quer pegar mais uma ação?
            </p>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {hasSuggestion && onStartExecution ? (
                <Button
                  size="sm"
                  onClick={handleStartNow}
                  className="font-semibold"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  COMEÇAR AGORA
                </Button>
              ) : null}
              
              <Button
                size="sm"
                variant={hasSuggestion ? "outline" : "default"}
                asChild
                onClick={handleChooseAction}
              >
                <Link to="/voluntario/acoes">
                  <ListChecks className="h-4 w-4 mr-1" />
                  ESCOLHER AÇÃO
                </Link>
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 -mt-1 -mr-1"
            onClick={handleDismiss}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
