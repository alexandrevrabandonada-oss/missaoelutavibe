# Memory: features/pedagogical-feedback-f19
Updated: now

## F19 — Feedback Pedagógico de Validação

### Purpose
Tornar o retorno da coordenação mais pedagógico, claro e útil, reduzindo retrabalho na origem.

### Database Changes
**evidences table**:
- Added `coord_feedback` (text, nullable): Optional positive feedback from coordinator on validation

### RPC Changes
**coord_validate_evidence**: Added `_feedback text DEFAULT NULL` parameter.
When action is `validar`, saves trimmed feedback to `coord_feedback` column.

### Hook Changes
- `useCoordInlineValidation.validate()`: Now accepts optional `feedback` string parameter
- `useCoordCelulaRegistros`: Fetches `coord_feedback` in select query
- `useCelulaMembroMemoria`: Fetches `coord_feedback` for receipt display

### UI Changes

**Coordinator Sheet (RegistroDetailSheet)**:
- "Validar" button does quick validation (no feedback)
- "Validar com retorno para o voluntário →" link opens feedback input
- Feedback input: optional, placeholder "Ex: Boa objetividade no resumo"
- Adjust label changed: "Como corrigir" → "O que precisa melhorar"
- Reject label changed: "Motivo da rejeição" → "Por que não foi validado"
- Placeholders updated for pedagogical tone
- Shows existing coord_feedback on already-validated records

**RegistroValidadoCard (Memória tab)**:
- Shows "Retorno da coordenação" block below timeline when coord_feedback exists
- Emerald-themed card with italic quoted text

**VoluntarioMeusEnvios (Meus Registros)**:
- Adjustment feedback: styled cards with headers "Por que não foi validado" / "O que fazer agora"
- Fallback message when no specific reason is given
- Shows coord_feedback for validated records inline
- Removed bureaucratic uppercase headers

### Surfaces
1. Coordinator → RegistroDetailSheet (validation actions + display)
2. Volunteer → Memória tab / RegistroValidadoCard
3. Volunteer → Meus Registros page

### No new routes, no new tables.
