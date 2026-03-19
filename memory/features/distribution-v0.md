# Memory: features/distribution-v0 + invite-loop-v0.1
Updated: now

## Distribution v0
Territory-based entry links and QR codes for offline-to-online conversion.

### Entry Route
- `/r/:code` - Universal redirect that captures tracking params and redirects to `/auth` or `/`
- Supports: `?ref=`, `?cidade=`, `?utm_source/medium/campaign`
- Logs `territory_link_open` growth event (anonymous, no PII)
- Persists `prefill_cidade` in sessionStorage for signup form pre-fill

### Admin Features
- `/admin/territorio`: QR button per city opens modal to generate link
- Link includes city name pre-fill and optional user invite code for attribution
- QR Code generated client-side using qrcode.react (lightweight)

### Growth Integration
- Events: `territory_link_open`, `invite_form_open`
- `/admin/ops`: DistributionMetricsCard shows 7d/30d link opens, top cities, top UTM sources

---

## Loop Convide 1 (v0.1)
Engagement loop encouraging volunteers to invite 1 person per day.

### Features
- **InviteLoopCard**: Shown on Hub (/voluntario) and /voluntario/primeiros-passos
- Card disappears once user has at least one `invite_shared` event
- **Actions**: Copy link, Generate QR modal, Native Share (Web Share API with clipboard fallback)
- **Invite link format**: `/r/{code}?cidade={user_city}&utm_source=convide1&utm_medium=share`

### Tracking (growth_events)
- `invite_shared`: Logged when copy/share/download QR (with action type in meta)
- `invite_qr_opened`: Logged when QR modal opens

### Admin Metrics
- **InviteLoopMetricsCard** in `/admin/ops`:
  - `convites_compartilhados_7d`: Count of invite_shared events in 7 days
  - `conversao_approved_por_ref_7d`: Count of approved users with referrer in 7 days
  - Conversion rate calculation

### Hooks
- `useInviteLoop`: State management, share actions, QR logging
- `useInviteLoopMetrics`: Admin metrics query

### Components
- `src/components/invite/InviteLoopCard.tsx`: UI card with buttons
- `src/components/admin/InviteLoopMetricsCard.tsx`: Ops dashboard card

No new database tables - uses existing `growth_events` and `convites` tables.
