/**
 * NavScope - Profile-based navigation configuration
 * 
 * Controls which menu items appear for each profile type.
 * Supports compact mode to hide frozen/legacy routes.
 */

export type NavProfile = "VOLUNTARIO" | "COORD" | "ADMIN";

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  frozen?: boolean; // Hidden when compact mode is on
}

// Feature flag for compact navigation
export const NAV_COMPACT_MODE = true;

// Frozen routes - accessible by direct link but hidden from menus
export const FROZEN_ROUTES = [
  "/voluntario/skills",
  "/voluntario/talentos", 
  "/voluntario/squads",
  "/voluntario/top",
  "/voluntario/plenaria",
  "/admin/squads",
  "/admin/talentos",
  "/admin/top",
  "/admin/plenaria",
] as const;

// Check if a route is frozen
export function isRouteFrozen(path: string): boolean {
  return FROZEN_ROUTES.some(frozen => 
    path === frozen || path.startsWith(frozen + "/")
  );
}

// Volunteer navigation items
export const VOLUNTARIO_NAV: NavItem[] = [
  { id: "hoje", label: "Hoje", path: "/voluntario/hoje", icon: "Sparkles" },
  { id: "territorio", label: "Território", path: "/voluntario/territorio", icon: "MapPin" },
  { id: "missoes", label: "Missões", path: "/voluntario/missoes", icon: "Target" },
  { id: "eu", label: "Eu", path: "/voluntario/eu", icon: "User" },
  { id: "ajuda", label: "Ajuda", path: "/voluntario/ajuda", icon: "HelpCircle" },
  // Frozen - hidden from menu but still accessible
  { id: "skills", label: "Skills", path: "/voluntario/skills", icon: "Award", frozen: true },
  { id: "talentos", label: "Talentos", path: "/voluntario/talentos", icon: "Star", frozen: true },
  { id: "squads", label: "Squads", path: "/voluntario/squads", icon: "Users", frozen: true },
  { id: "top", label: "Top", path: "/voluntario/top", icon: "Trophy", frozen: true },
  { id: "plenaria", label: "Plenária", path: "/voluntario/plenaria", icon: "MessageCircle", frozen: true },
];

// Coordinator navigation items
export const COORD_NAV: NavItem[] = [
  { id: "hoje", label: "Hoje", path: "/coordenador/hoje", icon: "LayoutDashboard" },
  { id: "territorio", label: "Operação", path: "/coordenador/territorio", icon: "MapPin" },
  { id: "diagnostico", label: "Diagnóstico", path: "/admin/diagnostico", icon: "Activity" },
];

// Admin navigation items  
export const ADMIN_NAV: NavItem[] = [
  { id: "home", label: "Admin", path: "/admin", icon: "Shield" },
  { id: "diagnostico", label: "Diagnóstico", path: "/admin/diagnostico", icon: "Activity" },
  { id: "papeis", label: "Papéis", path: "/admin/papeis", icon: "Users" },
  { id: "fabrica", label: "Fábrica", path: "/admin/fabrica", icon: "Factory" },
  { id: "lgpd", label: "LGPD", path: "/admin/lgpd", icon: "Lock" },
  // Frozen
  { id: "squads", label: "Squads", path: "/admin/squads", icon: "Users", frozen: true },
  { id: "talentos", label: "Talentos", path: "/admin/talentos", icon: "Star", frozen: true },
  { id: "top", label: "Top", path: "/admin/top", icon: "Trophy", frozen: true },
  { id: "plenaria", label: "Plenária", path: "/admin/plenaria", icon: "MessageCircle", frozen: true },
];

// Get visible nav items for a profile
export function getVisibleNavItems(profile: NavProfile, compactMode = NAV_COMPACT_MODE): NavItem[] {
  let items: NavItem[];
  
  switch (profile) {
    case "VOLUNTARIO":
      items = VOLUNTARIO_NAV;
      break;
    case "COORD":
      items = COORD_NAV;
      break;
    case "ADMIN":
      items = ADMIN_NAV;
      break;
    default:
      items = VOLUNTARIO_NAV;
  }

  if (compactMode) {
    return items.filter(item => !item.frozen);
  }
  
  return items;
}

// Detect nav scope drift - frozen routes appearing in active navigation
export function detectNavScopeDrift(activeMenuItems: string[]): string[] {
  const drift: string[] = [];
  
  for (const path of activeMenuItems) {
    if (isRouteFrozen(path)) {
      drift.push(path);
    }
  }
  
  return drift;
}
