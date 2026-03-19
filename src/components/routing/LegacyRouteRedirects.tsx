/**
 * LegacyRouteRedirects - Centralized legacy route redirects
 * 
 * Maps old hyphenated routes to canonical slash-based routes.
 * Uses replace to avoid polluting browser history.
 */

import { Navigate, useLocation } from "react-router-dom";

// Map of legacy routes to canonical routes
export const LEGACY_ROUTE_MAP: Record<string, string> = {
  // Voluntário routes
  "/voluntario-hoje": "/voluntario/hoje",
  "/voluntario-missoes": "/voluntario/missoes",
  "/missao": "/voluntario/hoje",
  "/voluntario-acoes": "/voluntario/acoes",
  "/voluntario-aprender": "/voluntario/aprender",
  "/voluntario-agir": "/voluntario/agir",
  "/voluntario-eu": "/voluntario/eu",
  "/voluntario-impacto": "/voluntario/impacto",
  "/voluntario-demandas": "/voluntario/demandas",
  "/voluntario-ajuda": "/voluntario/ajuda",
  "/voluntario-inbox": "/voluntario/inbox",
  "/voluntario-anuncios": "/voluntario/anuncios",
  "/voluntario-convite": "/voluntario/convite",
  "/voluntario-agenda": "/voluntario/agenda",
  "/voluntario-semana": "/voluntario/semana",
  "/voluntario-skills": "/voluntario/skills",
  "/voluntario-talentos": "/voluntario/talentos",
  "/voluntario-crm": "/voluntario/crm",
  "/voluntario-squads": "/voluntario/squads",
  "/voluntario-top": "/voluntario/top",
  "/voluntario-plenaria": "/voluntario/plenaria",
  "/voluntario-base": "/voluntario/base",
  "/voluntario-territorio": "/voluntario/territorio",
  "/voluntario-primeiros-passos": "/voluntario/primeiros-passos",
  "/voluntario-convites-papeis": "/voluntario/convites-papeis",
  "/voluntario-meus-envios": "/voluntario/meus-registros",
  
  // Admin routes
  "/admin-validar": "/admin/validar",
  "/admin-voluntarios": "/admin/voluntarios",
  "/admin-setup": "/admin/setup",
  "/admin-papeis": "/admin/papeis",
  "/admin-roles": "/admin/roles",
  "/admin-inbox": "/admin/inbox",
  "/admin-anuncios": "/admin/anuncios",
  "/admin-origens": "/admin/origens",
  "/admin-agenda": "/admin/agenda",
  "/admin-semana": "/admin/semana",
  "/admin-ops": "/admin/ops",
  "/admin-talentos": "/admin/talentos",
  "/admin-crm": "/admin/crm",
  "/admin-lgpd": "/admin/lgpd",
  "/admin-squads": "/admin/squads",
  "/admin-hoje": "/admin/hoje",
  "/admin-top": "/admin/top",
  "/admin-moderacao": "/admin/moderacao",
  "/admin-plenaria": "/admin/plenaria",
  "/admin-fabrica": "/admin/fabrica",
  "/admin-playbook": "/admin/playbook",
  "/admin-territorio": "/admin/territorio",
  "/admin-roteiros": "/admin/roteiros",
  "/admin-diagnostico": "/admin/diagnostico",
  
  // Coordenador routes
  "/coordenador-hoje": "/coordenador/hoje",
  "/coordenador-territorio": "/coordenador/territorio",
  
  // Formação routes
  // FIXED: /formacao/curso/:id requires param, redirect to hub instead
  "/formacao-curso": "/formacao",
  "/formacao-aula": "/formacao",
  
  // Fábrica routes
  "/fabrica-arquivos": "/fabrica/arquivos",
  
  // Other legacy routes
  "/aguardando-aprovacao": "/aguardando-aprovacao", // Already correct, but keeping for reference
  "/aceitar-convite": "/aceitar-convite", // Already correct
};

// Get list of legacy routes that actually redirect (not same path)
export function getLegacyRedirects() {
  return Object.entries(LEGACY_ROUTE_MAP)
    .filter(([from, to]) => from !== to)
    .map(([from, to]) => ({ from, to }));
}

// Check if a path is a legacy route
export function isLegacyRoute(path: string): boolean {
  return path in LEGACY_ROUTE_MAP && LEGACY_ROUTE_MAP[path] !== path;
}

// Get canonical route for a path
export function getCanonicalRoute(path: string): string | null {
  if (isLegacyRoute(path)) {
    return LEGACY_ROUTE_MAP[path];
  }
  return null;
}

// Component for a single legacy redirect
interface LegacyRedirectProps {
  to: string;
}

export function LegacyRedirect({ to }: LegacyRedirectProps) {
  const location = useLocation();
  
  // Preserve query params and hash
  const targetPath = `${to}${location.search}${location.hash}`;
  
  return <Navigate to={targetPath} replace />;
}

// Generate route elements for legacy redirects
export function generateLegacyRouteElements() {
  return getLegacyRedirects().map(({ from, to }) => ({
    path: from,
    element: <LegacyRedirect to={to} />,
  }));
}
