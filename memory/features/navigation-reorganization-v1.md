# Navigation Reorganization v1

## Overview

Reorganized the app navigation to reduce cognitive load by consolidating routes into role-based navigation structures.

## Changes

### Volunteer Navigation (5 items max)

Bottom nav bar (`VoluntarioNavBar`) with:
- **Hoje** → `/voluntario/hoje` (Check-in, actions, daily focus)
- **Aprender** → `/voluntario/aprender` (Hub: Formação, Debates, Materiais, Fábrica, Arquivos)
- **Agir** → `/voluntario/agir` (Hub: Missões, Demandas, CRM, Território, Squads, Ações)
- **Eu** → `/voluntario/eu` (Hub: Inbox, Anúncios, Agenda, Convite, Meus Envios, Convites Papéis)
- **Ajuda** → `/voluntario/ajuda` (Orientations)

### Home Simplification

- `/voluntario` now redirects to `/voluntario/hoje`
- Removed ~16 links from old home; content accessible via HUBs
- No duplications (Missões/Debates/Demandas appear once per context)

### Admin Navigation (5 sections)

Replaced 12 tabs with 5 grouped sections:
- **Dashboard** → Overview, metrics, alerts
- **Validar** → Evidências + Cadastros pendentes
- **Base** → Voluntários, Células, Missões, Demandas, Inbox
- **Comunicação** → Anúncios, Materiais, Formação, Roteiros
- **Sistema** (admin-only) → Ops, Papéis/RBAC, LGPD, Setup, Beta

### Coordinator Navigation

Access via `/coordenador/hoje` with dedicated inbox for:
- Overdue follow-ups
- At-risk volunteers
- Stalled missions

## Technical Details

### New Files

- `src/hooks/useNavTracking.tsx` - Analytics for nav clicks
- `src/components/navigation/VoluntarioNavBar.tsx` - Bottom nav component
- `src/pages/VoluntarioAprender.tsx` - Learning hub (5 links)
- `src/pages/VoluntarioAgir.tsx` - Action hub (6 links)
- `src/pages/VoluntarioEu.tsx` - Personal hub (6 links)

### Modified Files

- `src/pages/Voluntario.tsx` - Simplified to redirect
- `src/pages/VoluntarioHoje.tsx` - Added NavBar
- `src/pages/VoluntarioAjuda.tsx` - Added NavBar (conditional)
- `src/pages/Admin.tsx` - Reorganized from 12 tabs to 5 sections
- `src/App.tsx` - Added new hub routes

### Routes Added

```
/voluntario/aprender
/voluntario/agir
/voluntario/eu
```

### No Routes Removed

All existing routes preserved; only navigation entry points reorganized.

### Nav Tracking

Tracking via `audit_logs` (all opt-out / privacy friendly):
- `nav_clicked` - Navigation button clicks
- `hub_opened` - When volunteer opens aprender/agir/eu hubs
- `checkin_submitted` - After check-in (disponibilidade, foco_tipo, has_blocker - no PII)

```typescript
trackNavClick({ role: "voluntario", item: "aprender", section: "hub" })
trackHubOpened({ hub: "aprender" })
trackCheckinSubmitted({ disponibilidade: 30, foco_tipo: "mission", has_blocker: false })
```

### Admin Shortcut Button

Coordinators/admins see a shield icon (🛡️) in volunteer pages header to quick-return to /admin panel.
Component: `AdminShortcutButton.tsx`

### Post Check-in CTAs

After check-in, volunteers see fixed CTAs:
1. "Pegar uma missão" → /voluntario/missoes
2. "Convidar +1" → /voluntario/convite

Component: `PostCheckinCTAs.tsx`

### 404 Page

Friendly 404 with:
- Clear message in Portuguese
- CTA "Voltar para Hoje" → /voluntario/hoje
- Back button to previous page

### RBAC Protection

- /admin redirects non-coordinators to /voluntario/hoje
- Volunteers never see admin links (AdminShortcutButton only renders for coordinators)

### Admin Sub-Navigation

Consistent sub-nav component: `AdminSubNav.tsx`
- Breadcrumbs
- Back button
- Title + subtitle

## Acceptance Criteria Met

✅ Volunteer sees max 5 nav items (not 16 links)
✅ Admin has 5 sections (not 12 tabs)
✅ No existing routes broken
✅ nav_clicked + hub_opened + checkin_submitted tracking
✅ 404 amigável com CTA "Voltar para Hoje"
✅ RBAC: voluntário não vê links de admin
✅ Atalho admin (🛡️) para coordenadores
✅ CTAs pós check-in (missão + convidar)
✅ AdminSubNav para sub-navegação consistente
