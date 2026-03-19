# Memory: features/coord-prioritization-f17

## Overview
F17 adds a single "recommended focus" card to the coordination hub, driven by deterministic priority rules.

## Components

### `getCoordFocus(pulse)` helper — `src/lib/getCoordFocus.ts`
Pure function that takes `ValidationPulse` and returns a single `CoordFocus`:
- Priority 1 (urgent): Pending evidences >48h → "Validar pendentes antigos"
- Priority 2 (urgent): Stalled adjustments >5d → "Revisar ajustes parados"
- Priority 3 (attention): Recent pendings ≤48h → "Validar pendentes"
- Priority 4 (cold): Cold cycle → "Mobilizar a célula"
- Priority 5 (healthy): "Tudo sob controle"

Each focus includes: level, title, reason, action string, CTA label.

### `CoordFocusCard` component — `src/components/coordinator/CoordFocusCard.tsx`
Single card at top of Visão tab. Consumes `useCoordValidationPulse` + `getCoordFocus`.
Visual accent varies by level (destructive, amber, sky, emerald).
CTA button triggers navigation via existing `handlePulseNavigate` handler.

## Architecture
- No new queries — reuses `useCoordValidationPulse` (same cache key, no extra API calls)
- No new routes or tables
- Deterministic rules, no ML/scoring
- Placed above alerts + pulse card in CoordCelulaVisao

## Coordination flow completion
F13-B (observe) → F14 (shortcut) → F15 (queue) → F16 (closure) → F17 (prioritize)
This closes the coordination cycle: see → prioritize → navigate → process → close.
