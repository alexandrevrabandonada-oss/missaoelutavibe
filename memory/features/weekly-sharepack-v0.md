# Memory: features/weekly-sharepack-v0
Updated: now

## Weekly Share Pack v0

### Purpose
Discretely prompts eligible volunteers to share their achievements and invite new members. Appears on /voluntario/hoje only when user meets criteria and hasn't shared this week.

### Eligibility Criteria (checked in order)
1. **goal3**: Completed 3+ actions in the current week
2. **streak_milestone**: Triggered streak_goal3_completed event this week
3. **return_complete**: Triggered return_mode_complete event this week

### Database
**RPC: `get_my_weekly_share_pack()`**
- Returns: week_key, eligible, reason, invite_code, share_text, share_card_kind, already_shared, actions_count
- Timezone: America/Sao_Paulo
- Week key format: IYYY-"W"IW (e.g., 2026-W05)
- No new tables - calculates from growth_events + convites

### Share Text Template (per reason)
- **goal3**: "Fechei 3 ações essa semana no #ÉLUTA! 💪"
- **streak_milestone**: "Completei 3 dias seguidos de luta no #ÉLUTA! 🔥"
- **return_complete**: "Voltei pra luta no #ÉLUTA! ✊"

All include invite link and mode-specific footer (pre/campanha).

### UI Components
**WeeklySharePackBanner** (`src/components/growth/WeeklySharePackBanner.tsx`)
- Shows below DailyActionCTA on /voluntario/hoje
- Dismissible (per session)
- 3 actions: Share (native → copy fallback), Copy, WhatsApp
- Preview of share text (truncated)

**useWeeklySharePack** (`src/hooks/useWeeklySharePack.tsx`)
- Fetches RPC data
- View dedup by SP day
- Helpers: shareNative(), copyText(), openWhatsApp()
- shouldShowBanner computed property

### Tracking (growth_events)
- `weekly_sharepack_shown`: { week_key, reason }
- `weekly_sharepack_clicked`: { week_key, channel }
- `weekly_sharepack_shared`: { week_key, channel }

Channel values: "native", "copy", "whatsapp"

### Display Rules
- Shows only when: eligible && !already_shared
- Max 1x per day (view tracking dedup)
- Disappears after successful share (already_shared = true)
- Can be dismissed per session

### Integration Point
`/voluntario/hoje` - Inserted after StreakCard, before "Ver meu impacto" link
