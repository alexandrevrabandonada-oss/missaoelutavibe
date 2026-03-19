# Coordinator Playbooks v0

## Overview
When North Star Alerts flag performance drops, coordinators can react in 30 seconds with ready-to-use messages, announcement prefills, and deep links to the right action surfaces.

## Database

### Table: `coordinator_alert_dismissals`
- `id` (uuid, PK)
- `scope_kind` (text: 'city'|'cell'|'region'|'global')
- `scope_value` (text)
- `alert_key` (text)
- `dismissed_until` (timestamptz)
- `created_by` (uuid, FK → auth.users)
- `created_at` (timestamptz)

### RLS
- Coordinators can view/manage dismissals in their scope
- Uses `is_coord_in_scope()` helper

### RPCs
1. **`get_my_coordinator_alerts(_window_days)`**
   - Calls `get_north_star_alerts` with user's scope
   - Filters out dismissed alerts (dismissed_until > now())
   - Returns: `{ ok, alerts, scope_kind, scope_value }`

2. **`dismiss_coordinator_alert(_alert_key, _hours)`**
   - Validates alert_key (alphanumeric + underscore, max 64 chars)
   - Upserts dismissal with expiry
   - Default: 24 hours

## Frontend

### Hook: `useCoordinatorAlerts(windowDays)`
- Fetches filtered alerts via RPC
- Provides dismiss mutation
- Tracking helpers for growth events

### Component: `CoordinatorAlertsSection`
- Shows up to 3 alerts as clickable cards
- Opens playbook sheet on tap

### Playbook Sheet
- 3 mode-aware messages (short/mid/leader)
- Deep links to action surfaces
- "Create Announcement" with prefill
- "Mark as done" (24h dismiss)

### Announcement Prefill
URL: `/admin/anuncios/novo?prefill=1&kind=ALERT&key=<alert_key>&scope_kind=<...>&scope_value=<...>`

AdminAnuncioEditor reads params and pre-populates:
- Title from playbook.announcementTitle
- Body from playbook.announcementBody
- Scope from coordinator's scope
- Tag with alert_key

## Playbook Keys

| Key | Title | Primary Action |
|-----|-------|----------------|
| activation | Ativação baixa | /voluntario/hoje |
| share | Share baixo | /voluntario/convite |
| crm | CRM baixo | /voluntario/crm/novo |
| qualify | Qualificação baixa | /voluntario/crm?filter=nao_qualificados |
| hot_support | Apoio forte caiu | /voluntario/crm |
| event_conversion | Conversão em evento baixa | /admin/agenda |
| return | Retorno baixo | /coordenador/hoje |

## Mode-Aware Messages
- **pre** (pré-campanha): Focus on building base, networking, organizing
- **campanha**: Focus on votes, commitment, urgency

## Tracking Events
- `coordinator_alerts_shown` { windowDays, count, scope_kind }
- `coordinator_alert_opened` { alert_key, scope_kind }
- `coordinator_alert_copy_clicked` { alert_key, variant }
- `coordinator_alert_create_announcement_clicked` { alert_key }
- `coordinator_alert_open_action_clicked` { alert_key, target }
- `coordinator_alert_dismissed` { alert_key, hours }

## Observability
- `COORD_ALERTS_ERROR` logged on RPC failures (severity: warn)
- Meta: { stage: 'fetch' | 'dismiss' }

## Security
- No PII in payloads or logs
- Scope-based RLS on dismissals
- Input validation on alert_key (alphanumeric + underscore)
