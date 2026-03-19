# Memory: features/agenda-rsvp-convite-v0
Updated: now

## Overview
Sistema de convite de contatos do CRM para atividades da agenda, com RSVP de 1 toque e follow-up automático.

## Database

### Table: crm_event_invites
- `id` uuid pk
- `user_id` uuid (owner)
- `contact_id` uuid → crm_contatos
- `event_id` uuid → atividades
- `status` text: invited|going|maybe|declined|no_answer|attended
- `created_at`, `updated_at` timestamptz
- `last_outreach_at` timestamptz (when WhatsApp/copy used)
- `next_followup_at` timestamptz (auto-calculated)
- `source` text (crm_drawer|daily_plan)
- UNIQUE (user_id, contact_id, event_id)
- RLS: user only sees own invites

### RPCs
- `upsert_event_invite(_contact_id, _event_id, _next_followup_at?, _source?)` → uuid
- `set_event_invite_status(_invite_id, _status, _next_followup_at?)` → void
- `mark_event_outreach(_invite_id)` → void
- `get_contact_event_invites(_contact_id)` → invites with event info
- `get_upcoming_events_for_invite(_limit)` → available events
- `get_scope_event_invite_metrics(_days)` → aggregated by event (no PII)
- `get_my_event_invite_summary(_event_id)` → user's own summary

### Auto Follow-up Logic
- `invited` / `no_answer` → +2 days
- `maybe` → +1 day
- `going` → +12 hours (reminder)
- `declined` / `attended` → null

## Frontend

### Hook: useEventInvites
- `src/hooks/useEventInvites.tsx`
- `useContactEventInvites(contactId)` - CRUD for contact's invites
- `useUpcomingEvents(limit)` - event picker data
- `useScopeEventInviteMetrics(days)` - coord/admin metrics
- `useMyEventInviteSummary(eventId)` - user's own per-event summary
- `getEventInviteScripts(mode, title, date, location)` - dynamic invite text

### Components
- `EventInviteSection` - in ContactDetailDrawer
  - Event picker sheet
  - RSVP chips (1-tap)
  - Copy/WhatsApp buttons with outreach tracking
- `EventInviteMetricsCard` - in CoordenadorHoje
  - Top events by conversion
  - Aggregated stats (no PII)
- `MyEventInvitesCard` - in VoluntarioAgendaDetalhe
  - User's own invite summary per event

## Tracking Events (no PII)
- `event_invite_created { source, mode }`
- `event_invite_whatsapp_opened { source, mode }`
- `event_invite_text_copied { source, mode, type }`
- `event_rsvp_set { status, mode }`
- `event_invite_followup_scheduled { days, mode }`

## Integration Points
- ContactDetailDrawer: EventInviteSection below ContactSupportSection
- VoluntarioAgendaDetalhe: MyEventInvitesCard
- CoordenadorHoje: EventInviteMetricsCard
- DailyPlanCard: `invite_event` action navigates to /voluntario/crm?filter=qualified
- VoluntarioCRM: `qualified_support` filter shows contacts with support_level = yes|mobilizer

## CRM Filters for Daily Plan
- `filter=overdue` → followup tab
- `filter=unknown` → unknown_support (unqualified contacts)
- `filter=qualified` → qualified_support (yes|mobilizer support level)

## Files
- `src/hooks/useEventInvites.tsx`
- `src/components/crm/EventInviteSection.tsx`
- `src/components/crm/MyEventInvitesCard.tsx`
- `src/components/admin/EventInviteMetricsCard.tsx`
- `src/pages/VoluntarioCRM.tsx` (filter updates)
- `src/components/actions/DailyPlanCard.tsx` (invite_event action)
