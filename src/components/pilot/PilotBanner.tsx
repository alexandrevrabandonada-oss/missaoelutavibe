/**
 * PilotBanner - Discreet contextual banner for pilot mode screens.
 * Shows a small branded bar at the top to contextualize the pilot experience.
 */

import { Rocket } from "lucide-react";

export function PilotBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
      <Rocket className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-medium text-primary">
        Modo Piloto — foco no essencial
      </span>
    </div>
  );
}
