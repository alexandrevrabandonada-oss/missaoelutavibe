# Memory: features/impact-metrics-v0
Updated: now

## Meu Impacto (Volunteer Impact Metrics)

### Purpose
Motivational page showing volunteer's impact over the last 7 days. Focuses on 3 key metrics + 1 weekly goal + 2 CTAs. NOT an analytics dashboard.

### Database

**RPC: `get_my_impact_metrics(_window_days int DEFAULT 7)`**
- Returns aggregated metrics for authenticated user
- Timezone: America/Sao_Paulo
- Fields:
  - `actions_completed`: Count of (next_action_completed, street_mission_completed, conversation_mission_completed, followup_done, contact_created, micro_action_completed)
  - `contacts_added`: Count of contact_created events
  - `invites_shared`: Count of invite_shared events
  - `current_streak`: From get_my_streak_metrics RPC
  - `goal_label`: "Meta da semana: 3 ações"
  - `goal_progress`: min(actions_completed, 3)
  - `goal_target`: 3

### UI Components

**Page: `/voluntario/impacto`**
- Header with back navigation
- 3 metric cards (actions, contacts, invites)
- Weekly goal with progress dots (●●○)
- "Como isso vira voto?" info sheet
- 2 CTAs: AGIR AGORA → /voluntario/hoje, CONVIDAR +1 → /voluntario/convite
- Share button → ImpactShareModal

**ImpactShareModal**
- Format selector (1:1, 4:5)
- Live preview with scaled render
- Export image (PNG) or copy text
- Uses html-to-image for rendering

**ImpactInfoSheet**
- Bottom sheet explaining impact → votes connection
- 4 items: action=presence, contact=base, followup=trust, invite=growth

### Entry Points
1. Hub "Eu": "Meu Impacto" as first link
2. /voluntario/hoje: "Ver meu impacto →" link below StreakCard

### Tracking (growth_events)
- `impact_viewed`: { window_days }
- `impact_share_opened`: { format }
- `impact_shared`: { format }
- `impact_cta_clicked`: { cta: "agir_agora" | "convidar" }
- `impact_info_opened`: {}

### Design Constraints
- Only 3 metrics (no analytics creep)
- Simple goal (3 actions/week)
- No PII in share card
- Fallback for RPC errors
