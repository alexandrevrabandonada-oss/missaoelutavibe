# Memory: features/nav-scope-playbook-v1
Updated: 2026-02-05

## NavScope + Cell Playbook (P4/P5)

### NavScope System
Profile-based navigation configuration with compact mode:
- **VOLUNTARIO**: Hoje, Território, Missões, Eu, Ajuda
- **COORD**: Hoje, Operação, Diagnóstico
- **ADMIN**: Admin, Diagnóstico, Papéis, Fábrica, LGPD

### Frozen Routes
Legacy routes hidden from main menu when `NAV_COMPACT_MODE = true`:
- `/voluntario/skills`, `/voluntario/talentos`, `/voluntario/squads`, `/voluntario/top`, `/voluntario/plenaria`
- Admin equivalents

Routes remain accessible via direct links but don't appear in navigation.

### NavScope Drift Detection
`NavScopeDriftCard` in `/admin/diagnostico` monitors:
- Compact mode status
- List of frozen routes
- Warning if frozen routes would appear in menus

### Cell Playbook
Each cell can have a `meta_json.playbook` with:
- `headline`: Short tagline
- `whatWeDo`: Description paragraph
- `nextActions[]`: Array of 3 actions with `{title, description, ctaRoute, ctaLabel}`
- `pinnedMaterials[]`: Optional linked materials

### Kit v0 Default Playbooks
City Bootstrap now creates playbooks for each Kit v0 cell:
- **Geral**: Entry point, first missions, discover how to contribute
- **Rua & Escuta**: Street actions, flyering, active listening
- **Comunicação**: Social media, content creation
- **Formação**: Training, courses, multipliers
- **CRM & Base**: Contacts, follow-ups, supporters

### Welcome Post
City Bootstrap also creates initial mural post for each new cell with:
- Welcome message
- 3 next steps CTAs
- Pinned status

### Playbook UI
`CellPlaybookCompact` renders in `/voluntario/territorio` when allocated:
- Shows cell headline
- Brief description
- 3 action buttons with icons

### Files
- `src/lib/navScope.ts` - NavScope config and frozen routes
- `src/lib/cellPlaybook.ts` - Playbook types and Kit v0 defaults
- `src/components/territory/CellPlaybookCompact.tsx` - Compact playbook UI
- `src/components/admin/NavScopeDriftCard.tsx` - Drift detection card
