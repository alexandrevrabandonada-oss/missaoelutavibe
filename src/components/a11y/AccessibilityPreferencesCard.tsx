import { Accessibility } from "lucide-react";
import { TTSPanel } from "./TTSPanel";

export function AccessibilityPreferencesCard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Accessibility className="h-5 w-5" />
        <h2 className="text-sm uppercase tracking-wider font-bold">
          Acessibilidade
        </h2>
      </div>
      
      <TTSPanel collapsed={false} />
      
      <p className="text-xs text-muted-foreground">
        Configurações salvas localmente neste dispositivo.
      </p>
    </div>
  );
}
