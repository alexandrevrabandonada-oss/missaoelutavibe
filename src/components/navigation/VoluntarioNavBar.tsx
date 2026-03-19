import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavTracking } from "@/hooks/useNavTracking";
import { getVisibleNavItems } from "@/lib/navScope";
import {
  Sparkles,
  MapPin,
  Target,
  User,
  HelpCircle,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  MapPin,
  Target,
  User,
  HelpCircle,
};

export function VoluntarioNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackNavClick } = useNavTracking();

  const navItems = getVisibleNavItems("VOLUNTARIO");

  const isActive = (path: string) => {
    if (path === "/voluntario/hoje") {
      return location.pathname === "/voluntario" || location.pathname === "/voluntario/hoje";
    }
    return location.pathname.startsWith(path);
  };

  const handleClick = (id: string, path: string) => {
    trackNavClick({ role: "voluntario", item: id });
    navigate(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border safe-bottom"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = ICON_MAP[item.icon || ""] || HelpCircle;
          
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id, item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                active
                   ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

