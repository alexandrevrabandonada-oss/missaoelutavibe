# Memory: auth/invite-consolidated-flow-v2
Updated: 2026-02-03

## Consolidated Invite → Auth → Hub Flow

### Flow Overview
1. **Entry point**: `/r/:code` or `/aceitar-convite?ref=CODE`
2. `/r/:code` redirects to `/aceitar-convite?ref=CODE` (canonical)
3. `/aceitar-convite` validates the invite:
   - Valid + logged out → `/auth?ref=CODE`
   - Valid + logged in → applies invite, smart redirect based on profile
   - Invalid → friendly UI with WhatsApp CTA and manual code entry
4. `/auth` post-login routes based on profile state (city_id, needs_cell_assignment)

### Pre-Campaign Signup Restriction
In mode `pre`, signup without valid invite is blocked:
- Auth page shows `InviteRequiredCard` if trying to signup without invite
- Card offers: "Tenho um convite" → `/aceitar-convite`, "Pedir convite" → WhatsApp
- Login remains always available

### Invite Persistence
- `localStorage.invite_ref` + `invite_ref_ts` (30 min TTL)
- `localStorage.invite_next` for redirect after auth
- `sessionStorage.invite_code` for immediate use
- Centralized in `src/lib/inviteConfig.ts`

### Smart Post-Login Redirect
After login, user is routed based on profile state:
1. Not approved → `/aguardando-aprovacao`
2. No `city_id` → `/voluntario/primeiros-passos`
3. Has `needs_cell_assignment=true` → `/voluntario/hoje` (with banner)
4. Fully onboarded → `/voluntario/hoje`

### Admin Cell Pending Queue
- New tab "Pendências" in `/admin/territorio`
- Lists profiles with `onboarding_complete=true` AND (`needs_cell_assignment=true` OR `cell_id IS NULL`) AND has city
- Actions: "Atribuir célula" (dropdown), "Marcar como avulso"
- RPCs: `admin_list_cell_pending`, `admin_assign_cell`, `admin_mark_no_cell`

### Files
- `src/lib/inviteConfig.ts` - centralized invite config + WhatsApp templates
- `src/components/auth/InviteRequiredCard.tsx` - pre-campaign signup blocker
- `src/hooks/useCellPending.tsx` - admin queue hook
- `src/components/admin/CellPendingTab.tsx` - admin queue UI
