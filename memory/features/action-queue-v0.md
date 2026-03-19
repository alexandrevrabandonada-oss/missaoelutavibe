# Memory: features/action-queue-v0
Updated: now

## Action Queue v0 (Fila Unificada de Ações)

### Purpose
Unified "Seu Próximo Passo" view that aggregates all volunteer pending actions into a single prioritized queue, reducing cognitive load and ensuring nothing gets missed.

### Data Sources
| Source | Hook | Priority | 
|--------|------|----------|
| Follow-ups (due) | `useFollowups` | P1 (atrasado/hoje) |
| Conversation Mission (active) | `useConversationMission` | P1 if in_progress |
| Conversation Mission (generate) | `useConversationMission` | P2 |
| Street Mission (active) | `useStreetMission` | P2 if in_progress |
| Street Mission (generate) | `useStreetMission` | P3 |
| Squad Tasks (talent bank) | `useMyTasks` → `ligado_chamado_id` | P3-4 |
| Roteiro do Dia | `useRoteiroDoDia` | P4 |

### Components
- `src/hooks/useActionQueue.tsx` - Aggregator hook, no DB changes
- `src/components/actions/NextActionCard.tsx` - Shows priority-1 action with CTA
- `src/components/actions/ActionQueueCard.tsx` - Top 3 preview + link to full list
- `src/components/actions/ActionQueueList.tsx` - Full queue with filters
- `src/pages/VoluntarioAcoes.tsx` - Route `/voluntario/acoes`

### Integration
- `/voluntario/hoje`: NextActionCard + ActionQueueCard at top; existing cards in collapsible
- Existing cards remain functional as fallback/detailed view

### Priority Rules
1. Follow-ups overdue = P1
2. Active conversation mission = P1
3. Generate conversation mission = P2
4. Active street mission = P2
5. Generate street mission = P3
6. Talent tasks (urgent <48h) = P3
7. Talent tasks (normal) = P4
8. Roteiro suggestion = P4

### Tracking Events (no PII)
- `action_queue_viewed` (meta: count)
- `action_opened` (meta: kind, priority)
- `action_generated` (meta: kind)
- `action_done` (meta: kind, action)

### Hardening
- Each data source in independent try/catch
- Fallback UI when no actions: "Sem pendências críticas"
- refetch() exposed for manual retry

### A11y
- All buttons have `aria-label`
- `focusRingClass()` on interactive elements
- Screen reader summary in list view
- Collapsible has `aria-expanded`
