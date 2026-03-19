# Memory: features/ops-funil-v0
Updated: now

Ops Funil v0: Aggregated operational funnel metrics using only existing data (growth_events, daily_checkins, missions). Displays in `/admin/ops` via `OpsFunnelCard` with 7d/30d toggle.

## Metrics Tracked
- **Ativações**: onboarding_complete count, active_7d (from event or inferred from daily_checkins)
- **Rua**: street_mission_generated → street_mission_completed (with conversion rate)
- **Conversa**: conversation_mission_generated → conversation_mission_completed
- **CRM**: crm_quick_add_saved count
- **Follow-up**: followup_done count
- **Secundárias**: script_copied, whatsapp_opened (optional display)

## RPC
`get_ops_funnel_metrics(_period_days, _scope_cidade, _scope_cell_id)`:
- SECURITY DEFINER with coordinator authorization check
- Returns JSON with totals, conversion rates, top_cidades (by completed+followups)
- Scope filtering by cidade (cell-level TBD as growth_events doesn't track cell_id)

## UI
- `OpsFunnelCard`: Card with period toggle (7d/30d), funnel visualization, top cities list
- Integrated into AdminOps page alongside other metrics cards

## Data Sources
- `growth_events` table (primary source for all event counts)
- `daily_checkins` table (fallback for active_7d inference)
- No new tables created
