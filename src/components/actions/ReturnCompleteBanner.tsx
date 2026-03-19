/**
 * ReturnCompleteBanner
 * 
 * Shown after completing a return mode micro-action.
 * Offers to continue with a mission or stop for the day.
 */

import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, CheckCircle, MapPin, Coffee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReturnCompleteBannerProps {
  onDismiss: () => void;
}

// Track growth events
async function logGrowthEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[ReturnCompleteBanner] Tracking error:", error);
  }
}

export function ReturnCompleteBanner({ onDismiss }: ReturnCompleteBannerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const shownTrackedRef = useRef(false);

  // Track banner shown once
  useEffect(() => {
    if (!shownTrackedRef.current) {
      shownTrackedRef.current = true;
      logGrowthEvent("return_complete_banner_shown", {});
    }
  }, []);

  const handleDismiss = () => {
    // Remove ?done=return from URL
    searchParams.delete("done");
    setSearchParams(searchParams, { replace: true });
    onDismiss();
  };

  const handleMission = () => {
    logGrowthEvent("return_complete_mission_clicked", {});
    handleDismiss();
  };

  const handleStop = () => {
    logGrowthEvent("return_complete_stop_clicked", {});
    handleDismiss();
  };

  return (
    <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-full bg-green-500/20 shrink-0">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">
              ✅ Voltou. Bom te ver de novo!
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Quer pegar uma missão ou parar por hoje?
            </p>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                asChild
                onClick={handleMission}
              >
                <Link to="/voluntario/missoes">
                  <MapPin className="h-4 w-4 mr-1" />
                  PEGAR MISSÃO
                </Link>
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
              >
                <Coffee className="h-4 w-4 mr-1" />
                PARAR POR HOJE
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
