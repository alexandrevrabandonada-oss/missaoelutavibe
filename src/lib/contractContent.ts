/**
 * App Contract Content
 * 
 * This module provides the contract content imported at build time.
 * The contract is the single source of truth for development rules.
 */

// Import contract as raw string at build time
// @ts-ignore - Vite raw import
import contractMarkdown from "../../memory/LOVABLE_CONTRATO.md?raw";

export const CONTRACT_CONTENT = contractMarkdown;

// Required rule fragments to verify contract integrity
export const REQUIRED_RULE_FRAGMENTS = [
  "Rotas canônicas e redirects legados",
  'Convite é "só acesso"',
  "Onboarding obrigatório",
  "Cidade/Célula",
  "Supabase/RLS",
  "Preferência por reuso",
  "Toda mudança deve atualizar",
];

// Required canonical routes that must exist in manifest
export const REQUIRED_CANONICAL_ROUTES = [
  "/auth",
  "/aceitar-convite",
  "/voluntario",
  "/voluntario/primeiros-passos",
];

// Required legacy redirects (from → to)
export const REQUIRED_LEGACY_REDIRECTS = [
  { from: "/voluntario-hoje", to: "/voluntario/hoje" },
  { from: "/admin-diagnostico", to: "/admin/diagnostico" },
  { from: "/coordenador-hoje", to: "/coordenador/hoje" },
];

// Prohibited prefixes for canonical routes (these should only exist as legacy redirects)
export const PROHIBITED_ROUTE_PREFIXES = [
  "/voluntario-",
  "/admin-",
  "/coordenador-",
  "/fabrica-",
  "/formacao-",
];
