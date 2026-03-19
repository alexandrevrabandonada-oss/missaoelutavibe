/**
 * CoordFocusCard - Single recommended focus for coordinator
 * F17: Deterministic priority → one card → one CTA
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoordValidationPulse } from "@/hooks/useCoordValidationPulse";
import { getCoordFocus, type FocusLevel } from "@/lib/getCoordFocus";
import {
  AlertTriangle,
  Bell,
  Snowflake,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

interface Props {
  cellId: string;
  onNavigate?: (action: string) => void;
}

const LEVEL_CONFIG: Record<FocusLevel, {
  icon: React.ElementType;
  border: string;
  bg: string;
  iconColor: string;
}> = {
  urgent: {
    icon: AlertTriangle,
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    iconColor: "text-destructive",
  },
  attention: {
    icon: Bell,
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    iconColor: "text-amber-500",
  },
  normal: {
    icon: Bell,
    border: "border-border",
    bg: "bg-muted/30",
    iconColor: "text-muted-foreground",
  },
  cold: {
    icon: Snowflake,
    border: "border-sky-400/30",
    bg: "bg-sky-400/5",
    iconColor: "text-sky-400",
  },
  healthy: {
    icon: CheckCircle2,
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    iconColor: "text-emerald-500",
  },
};

export function CoordFocusCard({ cellId, onNavigate }: Props) {
  const { data: pulse, isLoading } = useCoordValidationPulse(cellId);
  const focus = getCoordFocus(pulse);

  if (isLoading) {
    return <Skeleton className="h-[72px] w-full rounded-lg" />;
  }

  const config = LEVEL_CONFIG[focus.level];
  const Icon = config.icon;

  return (
    <Card className={`${config.border} ${config.bg}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-background/60 ${config.iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{focus.title}</p>
          <p className="text-xs text-muted-foreground">{focus.reason}</p>
        </div>
        {focus.action && focus.ctaLabel && onNavigate && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1 text-xs"
            onClick={() => onNavigate(focus.action!)}
          >
            {focus.ctaLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
