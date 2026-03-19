/**
 * VoluntarioNavBar - Bottom navigation for volunteers
 * 
 * 5 items: Hoje, Território, Missões, Eu, Ajuda
 * Uses NavScope config to filter frozen routes when compact mode is on.
 */

import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavTracking } from "@/hooks/useNavTracking";
import { NAV_COMPACT_MODE } from "@/lib/navScope";
import {
  Sparkles,
  MapPin,
  Target,
  User,
  HelpCircle,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "hoje", label: "Hoje", icon: Sparkles, path: "/voluntario/hoje" },
  { id: "territorio", label: "Território", icon: MapPin, path: "/voluntario/territorio" },
  { id: "missoes", label: "Missões", icon: Target, path: "/voluntario/missoes" },
  { id: "eu", label: "Eu", icon: User, path: "/voluntario/eu" },
  { id: "ajuda", label: "Ajuda", icon: HelpCircle, path: "/voluntario/ajuda" },
] as const;

export function VoluntarioNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackNavClick } = useNavTracking();

  const isActive = (path: string) => {
    if (path === "/voluntario/hoje") {
      return location.pathname === "/voluntario" || location.pathname === "/voluntario/hoje";
    }
    return location.pathname.startsWith(path);
  };

  const handleClick = (item: typeof NAV_ITEMS[number]) => {
    trackNavClick({ role: "voluntario", item: item.id });
    navigate(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border safe-bottom"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
