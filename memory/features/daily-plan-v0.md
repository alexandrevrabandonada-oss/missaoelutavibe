# Memory: features/daily-plan-v0
Updated: now

## Overview
Plano do Dia v0 é um sistema de 3 passos diários com persistência e tracking, integrado ao /voluntario/hoje.

## Database

### Table: daily_plan_steps
- `id` uuid pk
- `user_id` uuid
- `day` date (timezone America/Sao_Paulo)
- `step_key` text (step_30s|step_5m|step_15m)
- `action_kind` text (invite|crm_add|followup|mission_conversa|mission_rua|script_copy)
- `action_ref` text (present|none|generated)
- `completed_at` timestamptz null
- UNIQUE (user_id, day, step_key)
- RLS: user sees only their own

### RPCs

**get_my_daily_plan(_day)**
- Returns existing plan or generates new one
- Heuristics:
  - step_30s = invite (default)
  - step_5m = followup if overdue, crm_add if <1 contact this week, else script_copy
  - step_15m = mission_conversa if foco=crm, else mission_rua
- Returns: { day, steps[], generated }

**complete_daily_plan_step(_day, _step_key)**
- Marks step as completed
- Logs growth_event: daily_plan_step_completed

**reset_my_daily_plan(_day)**
- Deletes plan for regeneration
- Logs growth_event: daily_plan_regenerated

## Frontend

### Hook: useDailyPlan
- `src/hooks/useDailyPlan.tsx`
- Fetches plan with 2-5 min cache
- Optimistic updates on completion
- Methods: getStep, completeStep, trackStepStarted

### Component: DailyPlanCard
- `src/components/actions/DailyPlanCard.tsx`
- Renders 3 steps with time badges (30s, 5m, 15m)
- Each step links to existing flows:
  - invite → /voluntario/convite
  - crm_add → /voluntario/crm/novo
  - followup → /voluntario/crm?filter=overdue
  - mission_conversa → generates + navigates
  - mission_rua → generates + navigates
  - script_copy → /voluntario/aprender?tab=roteiros

## Tracking Events
- `daily_plan_shown` { has_30s, has_5m, has_15m }
- `daily_plan_step_started` { step_key, action_kind }
- `daily_plan_step_completed` { step_key, action_kind }
- `daily_plan_regenerated` { reason }

## Integration Points
- Check-in focus (foco_tipo) influences step_15m
- CRM contacts count influences step_5m
- Overdue follow-ups influence step_5m

## Files
- `src/hooks/useDailyPlan.tsx`
- `src/components/actions/DailyPlanCard.tsx`
- `src/pages/VoluntarioHoje.tsx` (integration)
