# Memory: features/cadencia-v0-followup
Updated: 2026-01-25

## Overview
Cadência v0 is an automatic follow-up scheduling system triggered when a Conversation Mission is completed. Each contact outcome generates a specific next action with scheduled dates (in America/Sao_Paulo timezone). The `/voluntario/hoje` page displays due follow-ups prominently.

## Outcome → Next Action Rules
| Outcome | Next Action Kind | Delay |
|---------|-----------------|-------|
| topou | agendar | +24h |
| talvez_depois | followup | +48h |
| sem_resposta | followup | +72h |
| convite_enviado | followup | +48h |
| nao_agora | nutrir | +30 days |
| numero_errado | encerrar | null |

## Database Schema

### crm_contatos (new columns)
- `next_action_kind`: text ('followup', 'agendar', 'nutrir', 'encerrar')
- `next_action_context`: jsonb with {objective, channel, outcome, roteiro_id, mission_id, updated_at}
- Reuses existing `proxima_acao_em` as `next_action_at`

### crm_followup_logs
Audit table logging all follow-up lifecycle events:
- `kind`: 'created', 'done', 'snoozed'
- `scheduled_for`: timestamptz
- `meta`: jsonb for additional context
- RLS: user sees own, coordinators see scoped, admins see all

## RPCs
1. **get_my_due_followups(_limit)**: Returns contacts where `proxima_acao_em <= now()` with first name only (privacy)
2. **mark_followup_done(_contact_id, _meta)**: Clears next action, logs completion
3. **snooze_followup(_contact_id, _hours)**: Postpones by N hours (max 168h/1 week)

## Growth Events
- `followup_list_viewed`: When user views /voluntario/hoje with followups
- `followup_whatsapp_opened`: WhatsApp deep link clicked
- `followup_done`: Follow-up marked complete
- `followup_snoozed`: Follow-up postponed

## UI Components
- **FollowupSection**: Card in /voluntario/hoje showing due follow-ups (max 5 by default)
- Features: copy roteiro (uses context objective to match), WhatsApp deep link with invite code UTMs
- Actions: Concluído (clear), Adiar 24h (snooze)

## Privacy
- Only first name (nome_curto) displayed, max 20 chars
- No phone/email exposed in UI
- Growth events log aggregated data only (kind, objective, cidade)

## Files
- `src/hooks/useFollowups.tsx`: Hook with queries and mutations
- `src/components/followup/FollowupSection.tsx`: UI card component
- `src/pages/VoluntarioHoje.tsx`: Integration of FollowupSection
- Migration: Adds columns to crm_contatos, creates crm_followup_logs table, RPCs

## Acceptance Checklist
✅ Concluir missão cria next_action por contato
✅ Timezone SP respeitado
✅ /voluntario/hoje mostra follow-ups vencidos
✅ Copiar/WhatsApp trackeia sem PII
✅ Concluir limpa pendência
✅ Adiar funciona
✅ RLS impede acesso fora do escopo
✅ Build OK
✅ Doc atualizada
