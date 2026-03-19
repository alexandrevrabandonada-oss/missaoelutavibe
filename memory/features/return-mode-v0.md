# Memory: features/return-mode-v0
Updated: now

Return Mode v0: Reactivation flow for volunteers inactive 48h+. 

## Database
- Added `profiles.last_action_at` and `profiles.last_action_kind` columns to track most recent action
- RPC `get_my_reactivation_status()` returns is_at_risk, hours_since_last_action, suggested_micro_action_kind/cta
- RPC `update_last_action(_kind)` updates the timestamp (called after completing any action)
- Updated `get_coordinator_at_risk_volunteers()` to use last_action_at instead of first_action (48h+ inactive)
- Added "return" context to coordinator reminder messages

## UI Components
- `ReturnModeBanner`: Shown at top of /voluntario/hoje for 48h+ inactive users. "Bora voltar no leve (30s)?" with amber styling
- `ReturnCompleteBanner`: Shown after completing return mode action (?done=return). "Voltou. Quer pegar missão?"
- Quick options sheet: 3 choices (Salvar contato, Follow-up, Pegar missão)

## Tracking Events (no PII)
- return_mode_shown (dedupe 1x/day)
- return_mode_started { kind }
- return_mode_completed { kind, duration_seconds }
- return_mode_dismissed
- return_complete_banner_shown

## Integration Points
- useDailyAction: calls updateLastAction() after completing any action
- useQuickAddContact: calls updateLastAction("crm_contact") on save
- Coordinator Hoje: uses same profiles.last_action_at for "at risk" list with "return" message context

## Active Day Definition
Actions that update last_action_at: mission_rua, mission_conversa, crm_followup, crm_contact, formacao, other. Does NOT count invite_shared alone.
