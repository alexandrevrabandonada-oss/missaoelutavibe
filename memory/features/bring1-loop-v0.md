# Memory: features/bring1-loop-v0
Updated: now

"Traga +1 em 48h" Growth Loop v0: After completing first_action, users see a modal prompting them to bring 1 new volunteer within 48 hours.

## UI Components
- **Bring1Modal**: Appears after mission completion when `needsFirstAction` was true. CTAs: WhatsApp share (default), Add 3 contacts (opens QuickAdd in sequence).
- **Bring1ProgressCard**: Shows on `/voluntario/hoje` after first_action. Displays "Meta 48h: 0/1 ativado" with share button.

## Hook: useBring1Progress
- Counts referrals (profiles with referrer_user_id=current_user) who completed first_action within 48h window
- Falls back to invite link clicks (territory_link_open events) if no activations yet, with warning badge
- Returns: activatedCount, clickCount, isFallback, firstActionAt, windowExpired, goalAchieved

## Tracking (reuses existing events)
- `invite_shared` with `meta.stage`: `bring1_modal_shown`, `bring1_whatsapp_native`, `bring1_whatsapp_direct`, `bring1_quick_add_opened`
- Attribution via `growth_events.referrer_user_id` mapped from `convites.criado_por`

## Integration Points
- VoluntarioMissaoRua: Shows Bring1Modal after completing first street mission
- VoluntarioMissaoConversa: Shows Bring1Modal after completing first conversation mission
- VoluntarioHoje: Shows Bring1ProgressCard (compact) after FirstActionCard

## Hardening
- If precise activation count unavailable, falls back to click count with "imprecise" warning
- Goal achieved when activatedCount >= 1
- Card hides after window expires AND goal achieved (old success)
