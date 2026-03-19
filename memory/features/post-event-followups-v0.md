# Memory: features/post-event-followups-v0
Updated: now

## Post-Event Follow-ups v0

### Purpose
Automatic scheduling of follow-ups after marking contacts as "attended" at events, ensuring timely post-event engagement.

### Database Schema
Extended `crm_event_invites`:
- `post_followup_due_at` timestamptz - 12h after generation
- `post_followup_done_at` timestamptz - when completed
- `post_followup_kind` text - 'thank_you' | 'qualify' | 'ask_referral'

### RPCs
| RPC | Purpose |
|-----|---------|
| `generate_post_event_followups(_event_id)` | Schedules follow-ups for attended contacts based on support_level |
| `complete_post_event_followup(_event_id, _contact_id)` | Marks follow-up as done, clears next_action |
| `get_my_post_event_followups(_limit)` | Returns pending follow-ups for volunteer |
| `get_scope_post_event_followup_metrics(_days)` | Coordinator aggregates (no PII) |

### Follow-up Kind Logic
- `unknown/no/undecided` support_level → `qualify`
- `yes/mobilizer` support_level → `ask_referral`  
- Others → `thank_you`

### Components
- `src/hooks/usePostEventFollowups.tsx` - Main hook
- `src/components/admin/PostEventFollowupMetricsCard.tsx` - Coord metrics
- Updated `EventModePanel.tsx` - Scheduling UI after marking attendance
- Updated `ContactDetailDrawer.tsx` - Event follow-up banner with WhatsApp + Done

### Integration Points
- `useActionQueue` includes `event_followup` as Priority 1
- Appears in `/voluntario/hoje` and `/voluntario/acoes`
- CRM drawer shows contextual banner for event_followup contacts

### Tracking Events (no PII)
- `post_event_followups_generated` (meta: event_ref, total_bucket)
- `post_event_followup_opened` (meta: kind)
- `post_event_followup_done` (meta: kind)
- `post_event_followup_whatsapp_opened` (meta: kind)
