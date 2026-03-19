# Memory: features/coord-observability-f13b

## Overview
F13-B adds lightweight operational observability for coordinators without heavy dashboards.

## Components

### `useCoordValidationPulse(cellId)` hook
Computes per-cell:
- Oldest pending evidence age (hours + label)
- Pending count
- Average validation time (7d, from created_at → validated_at)
- Stalled adjustments (precisa_ajuste > 5 days)
- Recent submissions (3d)
- Cold cycle detection (active cycle + 0 submissions in 3d)

### `CoordPulseCard` component
Compact card in cell hub (CoordCelulaVisao) showing 4 signals:
1. ⏱ Oldest pending age + count
2. ⚡ Avg validation time (7d)
3. 🔴 Stalled adjustments count + age
4. ❄️ Cold cycle indicator
Shows "fluxo saudável" when no issues detected.

### Enhanced `useCelulaAlerts`
Added `ciclo_frio` alert type: fires when cell has active cycle but 0 evidences in last 3 days.

### Enhanced `useCoordCells` / `CoordCellsSection`
Each cell card now shows oldest pending age (e.g., "3d") next to pending count for quick triage.

## Signals NOT implemented (intentionally)
- Response time trend graphs
- Coordinator comparison/ranking
- Separate analytics dashboard
- Cross-cell comparative metrics
