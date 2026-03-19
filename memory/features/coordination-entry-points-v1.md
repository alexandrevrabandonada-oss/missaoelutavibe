# Coordination Entry Points v1
Updated: 2026-02-04

## Overview

Consolidated coordination navigation to reduce duplication between `/admin/ops` and `/coordenador/hoje`.

## Canonical Entry Points

| Rota | Propósito | Acesso |
|------|-----------|--------|
| `/coordenador/hoje` | Hub canônico — inbox, alertas, métricas | coordinator, admin |
| `/coordenador/territorio` | Operação de Células — triagem, CRUD | coordinator, admin |
| `/admin/diagnostico` | Diagnóstico técnico — healthcheck, rotas | admin |

### What's Available at /coordenador/hoje:
- Coordinator inbox (overdue follow-ups, at-risk volunteers, stalled missions)
- North Star pulse metrics
- Event/Support metrics cards
- Coordinator alerts & playbooks section
- Quick access to **Operação de Células** (`/coordenador/territorio`)
- **Graceful degradation**: Errors show "temporarily unavailable" with CTA to Cell Ops

## Redirects

| Legacy | Target | Replace |
|--------|--------|---------|
| `/admin/ops` | `/coordenador/hoje` | true |
| `/coordenador-hoje` | `/coordenador/hoje` | true (if exists) |

## Navigation Shortcuts

1. **CoordinationShortcutButton**: Component for coordinators/admins
   - Located at `src/components/navigation/CoordinationShortcutButton.tsx`
   - Variants: `icon` (Target icon) or `full` (button with label)
   - Only renders for users with coordinator+ roles

2. **AdminDiagnostico**: "Ir para Coordenação" button in header

3. **AdminOrigens**: "Ir para Coordenação" button in header

4. **CoordenadorHoje Header**:
   - Back button → `/admin`
   - Prominent "Operação de Células" button (variant=default)
   - "Diagnóstico" shortcut

## Route Manifest Updates

```typescript
// Coordinator hub (canonical entry point)
{ path: '/coordenador/hoje', component: 'CoordenadorHoje', kind: 'page', area: 'coord' }
{ path: '/coordenador/territorio', component: 'CoordenadorTerritorio', kind: 'page', area: 'coord' }

// Admin ops → redirect
{ path: '/admin/ops', component: 'AdminOps', kind: 'redirect', target: '/coordenador/hoje' }
```

## Navigation Hierarchy

```
/admin (Admin Dashboard)
  ├── /coordenador/hoje (Coordination Entry Point) ← Canonical
  │     ├── Inbox tabs (Follow-ups, At-risk, Stalled)
  │     ├── Alerts section (graceful degradation if metrics fail)
  │     └── /coordenador/territorio (Cell Ops)
  ├── /admin/diagnostico (Route Manifest, Codebase Map, Healthcheck)
  ├── /admin/origens (Invites & Origin Tracking)
  └── /admin/validar, /admin/voluntarios, etc.
```

## Graceful Degradation (v1.1)

When inbox metrics fail:
- Banner shows "Métricas temporariamente indisponíveis"
- CTA primário: "Operação de Células" (always works)
- Admin: "Ver Diagnóstico" link
- Non-admin: "Copiar erro" button
- Technical details hidden in `<details>` toggle

## Acceptance Criteria

✅ /admin/ops redirects to /coordenador/hoje
✅ /coordenador/hoje has prominent "Operação de Células" button
✅ AdminDiagnostico and AdminOrigens have "Ir para Coordenação" links
✅ Route manifest reflects /coordenador/hoje as canonical
✅ No duplicate operational dashboard exists
✅ Errors show graceful "temporarily unavailable" messaging

## Files

- `src/pages/AdminOps.tsx` → Redirect to /coordenador/hoje
- `src/pages/CoordenadorHoje.tsx` → Hub with graceful degradation
- `src/pages/AdminDiagnostico.tsx` → Coordination link
- `src/pages/AdminOrigens.tsx` → Coordination link
- `src/lib/routeManifest.ts` → Route descriptions
- `src/components/navigation/CoordinationShortcutButton.tsx` → Nav component
- `src/components/coordinator/CoordinationErrorBanner.tsx` → Graceful error banner
- `src/components/admin/CoordinationHealthCard.tsx` → Blocking vs warning healthcheck
